// =============================================================================
// orders.ts — SERVER-ONLY module. Never import from Client Components.
// All order Prisma queries live here.
//
// UI-only constants (STATUS_LABEL, STATUS_BADGE, STATUS_TRANSITIONS) live in
// @/lib/ordersMeta — that file has zero server/Prisma dependencies and is
// safe to import from Client Components.
// =============================================================================

import { prisma } from "@/lib/prisma"
import type {
  Order, OrderItem, OrderStatusHistory,
  Branch, Customer, ProductVariant, Product,
} from "@/generated/prisma/client"
import type { OrderStatus } from "@/generated/prisma/client"
import type { OrderStats } from "@/lib/ordersMeta"

// Re-export the server-side type and the transition map (used in actions.ts)
export type { OrderStatus }
export { STATUS_TRANSITIONS } from "@/lib/ordersMeta"

// Re-export OrderStats from ordersMeta so callers can import from one place
export type { OrderStats } from "@/lib/ordersMeta"

// ─── Rich types ───────────────────────────────────────────────────────────────

export type OrderItemFull = OrderItem & {
  variant: ProductVariant & {
    product: Pick<Product, "id" | "name" | "slug">
  }
}

export type OrderFull = Order & {
  branch:        Pick<Branch, "id" | "name" | "city">
  customer:      Pick<Customer, "id" | "name" | "email" | "phone"> | null
  items:         OrderItemFull[]
  statusHistory: OrderStatusHistory[]
}

export type OrderSummary = Order & {
  branch:   Pick<Branch, "id" | "name" | "city">
  customer: Pick<Customer, "id" | "name" | "email" | "phone"> | null
  _count:   { items: number }
}

// ─── Filters ──────────────────────────────────────────────────────────────────

export interface OrderFilters {
  search?:   string
  status?:   OrderStatus | "ALL"
  branchId?: string
  dateFrom?: string
  dateTo?:   string
  page?:     number
  pageSize?: number
}

// ─── KPI stats ────────────────────────────────────────────────────────────────
// OrderStats interface lives in ordersMeta.ts and is re-exported above.

const PAGE_SIZE = 20

// ─── Paginated list ───────────────────────────────────────────────────────────

export async function getOrderList(filters: OrderFilters = {}): Promise<{
  orders:     OrderSummary[]
  total:      number
  page:       number
  pageSize:   number
  totalPages: number
}> {
  const page     = Math.max(1, filters.page ?? 1)
  const pageSize = filters.pageSize ?? PAGE_SIZE
  const skip     = (page - 1) * pageSize

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {}

  if (filters.status && filters.status !== "ALL") where.status   = filters.status
  if (filters.branchId)                            where.branchId = filters.branchId

  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {}
    if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom)
    if (filters.dateTo) {
      const end = new Date(filters.dateTo)
      end.setHours(23, 59, 59, 999)
      where.createdAt.lte = end
    }
  }

  if (filters.search) {
    const s = filters.search.trim()
    where.OR = [
      { orderNumber:   { contains: s, mode: "insensitive" } },
      { customerName:  { contains: s, mode: "insensitive" } },
      { customerPhone: { contains: s, mode: "insensitive" } },
      { customerEmail: { contains: s, mode: "insensitive" } },
    ]
  }

  const include = {
    branch:   { select: { id: true, name: true, city: true } },
    customer: { select: { id: true, name: true, email: true, phone: true } },
    _count:   { select: { items: true } },
  } as const

  const [orders, total] = await Promise.all([
    prisma.order.findMany({ where, include, orderBy: { createdAt: "desc" }, skip, take: pageSize }),
    prisma.order.count({ where }),
  ])

  return {
    orders: orders as unknown as OrderSummary[],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

// ─── Single order (full relations) ────────────────────────────────────────────

export async function getOrderById(id: string): Promise<OrderFull | null> {
  return prisma.order.findUnique({
    where: { id },
    include: {
      branch:   { select: { id: true, name: true, city: true } },
      customer: { select: { id: true, name: true, email: true, phone: true } },
      items: {
        include: {
          variant: {
            include: { product: { select: { id: true, name: true, slug: true } } },
          },
        },
        orderBy: { id: "asc" },
      },
      statusHistory: { orderBy: { createdAt: "desc" } },
    },
  }) as Promise<OrderFull | null>
}

// ─── KPI stats ────────────────────────────────────────────────────────────────

export async function getOrderStats(): Promise<OrderStats> {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const [total, pending, packing, ready, cancelled, todayAgg] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.order.count({ where: { status: "PACKING" } }),
    prisma.order.count({ where: { status: "READY_FOR_PICKUP" } }),
    prisma.order.count({ where: { status: "CANCELLED" } }),
    prisma.order.aggregate({
      where: { status: { not: "CANCELLED" }, createdAt: { gte: todayStart } },
      _sum:  { total: true },
    }),
  ])

  return {
    total, pending, packing, ready, cancelled,
    todayRevenue: todayAgg._sum.total ?? 0,
  }
}

// ─── Branch options for filter dropdown ──────────────────────────────────────

export async function getOrderBranchOptions(): Promise<
  { id: string; name: string; city: string }[]
> {
  return prisma.branch.findMany({
    where:   { isActive: true },
    orderBy: [{ city: "asc" }, { name: "asc" }],
    select:  { id: true, name: true, city: true },
  })
}
