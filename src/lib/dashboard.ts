// Server-only module — never import from Client Components.
// All dashboard Prisma queries live here so the page component stays clean.

import { prisma } from "@/lib/prisma"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DashboardKpis {
  totalRevenue: number
  todaySales: number
  totalOrders: number
  pendingOrders: number
  totalCustomers: number
  totalProducts: number
  totalBranches: number
  totalCategories: number
  revenueChange: number   // % change vs yesterday (0 when no prior data)
  ordersChange: number    // % change vs yesterday
}

export interface DailySalesPoint {
  date: string            // "Mon", "Tue", …
  revenue: number
  orders: number
}

export interface MonthlyRevenuePoint {
  month: string           // "Jan", "Feb", …
  revenue: number
}

export interface BranchPerformance {
  branchName: string
  revenue: number
  orders: number
}

export interface LatestOrder {
  id: string
  orderNumber: string
  customerName: string
  branchName: string
  total: number
  status: string
  createdAt: Date
}

export interface LowStockItem {
  variantId: string
  sku: string
  productName: string
  branchName: string
  availableStock: number
  lowStockThreshold: number
}

export interface BestSellingProduct {
  productId: string
  productName: string
  totalQty: number
  totalRevenue: number
}

export interface ActivityEvent {
  id: string
  type: "order_placed" | "order_status" | "product_added" | "branch_added"
  title: string
  subtitle: string
  time: Date
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function startOfDay(d: Date): Date {
  const r = new Date(d)
  r.setHours(0, 0, 0, 0)
  return r
}

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(0, 0, 0, 0)
  return d
}

function pctChange(current: number, prior: number): number {
  if (prior === 0) return current > 0 ? 100 : 0
  return Math.round(((current - prior) / prior) * 100)
}

// ─── KPI query ────────────────────────────────────────────────────────────────

export async function getDashboardKpis(): Promise<DashboardKpis> {
  const todayStart     = startOfDay(new Date())
  const yesterdayStart = daysAgo(1)

  const [
    revenueAgg,
    todayRevenueAgg,
    yesterdayRevenueAgg,
    totalOrders,
    pendingOrders,
    todayOrders,
    yesterdayOrders,
    totalCustomers,
    totalProducts,
    totalBranches,
    totalCategories,
  ] = await Promise.all([
    // Total revenue (all non-cancelled orders)
    prisma.order.aggregate({
      where: { status: { not: "CANCELLED" } },
      _sum: { total: true },
    }),
    // Today's revenue
    prisma.order.aggregate({
      where: { status: { not: "CANCELLED" }, createdAt: { gte: todayStart } },
      _sum: { total: true },
    }),
    // Yesterday's revenue (for % change)
    prisma.order.aggregate({
      where: {
        status: { not: "CANCELLED" },
        createdAt: { gte: yesterdayStart, lt: todayStart },
      },
      _sum: { total: true },
    }),
    prisma.order.count({ where: { status: { not: "CANCELLED" } } }),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.order.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.order.count({
      where: { createdAt: { gte: yesterdayStart, lt: todayStart } },
    }),
    prisma.customer.count(),
    prisma.product.count({ where: { isActive: true } }),
    prisma.branch.count({ where: { isActive: true } }),
    prisma.category.count({ where: { isActive: true } }),
  ])

  const todaySales     = todayRevenueAgg._sum.total ?? 0
  const yesterdaySales = yesterdayRevenueAgg._sum.total ?? 0

  return {
    totalRevenue:     revenueAgg._sum.total ?? 0,
    todaySales,
    totalOrders,
    pendingOrders,
    totalCustomers,
    totalProducts,
    totalBranches,
    totalCategories,
    revenueChange: pctChange(todaySales, yesterdaySales),
    ordersChange:  pctChange(todayOrders, yesterdayOrders),
  }
}

// ─── Daily sales (last 7 days) ────────────────────────────────────────────────

export async function getDailySales(): Promise<DailySalesPoint[]> {
  const days = Array.from({ length: 7 }, (_, i) => daysAgo(6 - i))

  const orders = await prisma.order.findMany({
    where: {
      status: { not: "CANCELLED" },
      createdAt: { gte: days[0] },
    },
    select: { total: true, createdAt: true },
  })

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  return days.map((dayStart, i) => {
    const dayEnd = i < 6 ? days[i + 1] : new Date()
    const dayOrders = orders.filter(
      (o) => o.createdAt >= dayStart && o.createdAt < dayEnd
    )
    return {
      date: dayLabels[dayStart.getDay()],
      revenue: dayOrders.reduce((sum, o) => sum + o.total, 0),
      orders:  dayOrders.length,
    }
  })
}

// ─── Monthly revenue (last 6 months) ─────────────────────────────────────────

export async function getMonthlyRevenue(): Promise<MonthlyRevenuePoint[]> {
  const monthLabels = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
  const now = new Date()
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
    return { year: d.getFullYear(), month: d.getMonth(), label: monthLabels[d.getMonth()] }
  })

  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
  const orders = await prisma.order.findMany({
    where: { status: { not: "CANCELLED" }, createdAt: { gte: sixMonthsAgo } },
    select: { total: true, createdAt: true },
  })

  return months.map(({ year, month, label }) => {
    const revenue = orders
      .filter((o) => o.createdAt.getFullYear() === year && o.createdAt.getMonth() === month)
      .reduce((sum, o) => sum + o.total, 0)
    return { month: label, revenue }
  })
}

// ─── Branch performance ───────────────────────────────────────────────────────

export async function getBranchPerformance(): Promise<BranchPerformance[]> {
  const branches = await prisma.branch.findMany({
    where: { isActive: true },
    select: {
      name: true,
      orders: {
        where: { status: { not: "CANCELLED" } },
        select: { total: true },
      },
    },
    orderBy: { name: "asc" },
  })

  return branches
    .map((b) => ({
      branchName: b.name,
      revenue:    b.orders.reduce((s, o) => s + o.total, 0),
      orders:     b.orders.length,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8)
}

// ─── Latest orders ────────────────────────────────────────────────────────────

export async function getLatestOrders(): Promise<LatestOrder[]> {
  const rows = await prisma.order.findMany({
    take: 10,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      orderNumber: true,
      customerName: true,
      total: true,
      status: true,
      createdAt: true,
      branch: { select: { name: true } },
    },
  })

  return rows.map((r) => ({
    id:           r.id,
    orderNumber:  r.orderNumber,
    customerName: r.customerName,
    branchName:   r.branch.name,
    total:        r.total,
    status:       r.status,
    createdAt:    r.createdAt,
  }))
}

// ─── Low stock ────────────────────────────────────────────────────────────────

export async function getLowStockItems(): Promise<LowStockItem[]> {
  // Fetch items where availableStock <= lowStockThreshold.
  // We can't reference another column in Prisma where clauses,
  // so we fetch all inventory rows ordered by stock and filter in JS.
  const rows = await prisma.inventory.findMany({
    where: { availableStock: { lte: 10 } },
    take: 50,
    orderBy: { availableStock: "asc" },
    select: {
      variantId: true,
      availableStock: true,
      lowStockThreshold: true,
      branch: { select: { name: true } },
      variant: { select: { sku: true, product: { select: { name: true } } } },
    },
  })

  return rows
    .filter((r) => r.availableStock <= r.lowStockThreshold)
    .slice(0, 10)
    .map((r) => ({
      variantId:         r.variantId,
      sku:               r.variant.sku,
      productName:       r.variant.product.name,
      branchName:        r.branch.name,
      availableStock:    r.availableStock,
      lowStockThreshold: r.lowStockThreshold,
    }))
}

// ─── Best selling ─────────────────────────────────────────────────────────────

export async function getBestSellingProducts(): Promise<BestSellingProduct[]> {
  const items = await prisma.orderItem.groupBy({
    by: ["variantId"],
    _sum: { quantity: true, totalPrice: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: 10,
  })

  if (items.length === 0) return []

  const variantIds = items.map((i) => i.variantId)
  const variants = await prisma.productVariant.findMany({
    where: { id: { in: variantIds } },
    select: { id: true, product: { select: { id: true, name: true } } },
  })

  const variantMap = new Map(variants.map((v) => [v.id, v]))

  // Aggregate by product (a product may have multiple variants in top-10)
  const byProduct = new Map<string, BestSellingProduct>()
  for (const item of items) {
    const variant = variantMap.get(item.variantId)
    if (!variant) continue
    const { id, name } = variant.product
    const existing = byProduct.get(id)
    if (existing) {
      existing.totalQty     += item._sum.quantity     ?? 0
      existing.totalRevenue += item._sum.totalPrice ?? 0
    } else {
      byProduct.set(id, {
        productId:    id,
        productName:  name,
        totalQty:     item._sum.quantity     ?? 0,
        totalRevenue: item._sum.totalPrice ?? 0,
      })
    }
  }

  return [...byProduct.values()]
    .sort((a, b) => b.totalQty - a.totalQty)
    .slice(0, 8)
}

// ─── Activity timeline ────────────────────────────────────────────────────────

export async function getRecentActivity(): Promise<ActivityEvent[]> {
  const since = daysAgo(7)

  const [recentOrders, recentStatusChanges, recentProducts, recentBranches] =
    await Promise.all([
      prisma.order.findMany({
        where: { createdAt: { gte: since } },
        take: 5,
        orderBy: { createdAt: "desc" },
        select: { id: true, orderNumber: true, customerName: true, createdAt: true },
      }),
      prisma.orderStatusHistory.findMany({
        where: { createdAt: { gte: since }, status: { not: "PENDING" } },
        take: 5,
        orderBy: { createdAt: "desc" },
        select: { id: true, status: true, createdAt: true, order: { select: { orderNumber: true } } },
      }),
      prisma.product.findMany({
        where: { createdAt: { gte: since } },
        take: 5,
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, createdAt: true },
      }),
      prisma.branch.findMany({
        where: { createdAt: { gte: since } },
        take: 3,
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, city: true, createdAt: true },
      }),
    ])

  const events: ActivityEvent[] = [
    ...recentOrders.map((o) => ({
      id:       `order-${o.id}`,
      type:     "order_placed" as const,
      title:    `New order ${o.orderNumber}`,
      subtitle: `by ${o.customerName}`,
      time:     o.createdAt,
    })),
    ...recentStatusChanges.map((s) => ({
      id:       `status-${s.id}`,
      type:     "order_status" as const,
      title:    `Order ${s.order.orderNumber}`,
      subtitle: `Status → ${s.status.replace(/_/g, " ")}`,
      time:     s.createdAt,
    })),
    ...recentProducts.map((p) => ({
      id:       `product-${p.id}`,
      type:     "product_added" as const,
      title:    `Product added`,
      subtitle: p.name,
      time:     p.createdAt,
    })),
    ...recentBranches.map((b) => ({
      id:       `branch-${b.id}`,
      type:     "branch_added" as const,
      title:    `Branch added`,
      subtitle: `${b.name}, ${b.city}`,
      time:     b.createdAt,
    })),
  ]

  return events
    .sort((a, b) => b.time.getTime() - a.time.getTime())
    .slice(0, 12)
}
