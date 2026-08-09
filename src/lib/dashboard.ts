// Server-only module — never import from Client Components.
// All dashboard Prisma queries live here so the page component stays clean.

import { prisma } from "@/lib/prisma"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DashboardKpis {
  totalRevenue:      number
  todaySales:        number
  totalOrders:       number
  pendingOrders:     number
  completedOrders:   number   // COLLECTED
  cancelledOrders:   number
  totalCustomers:    number
  totalProducts:     number
  totalBranches:     number
  totalCategories:   number
  lowStockCount:     number
  outOfStockCount:   number
  revenueChange:     number   // % vs yesterday
  ordersChange:      number
}

export interface DailySalesPoint {
  date:    string   // "Mon" / "Tue" / full date label
  revenue: number
  orders:  number
}

export interface MonthlyRevenuePoint {
  month:   string
  revenue: number
}

export interface BranchPerformance {
  branchName: string
  revenue:    number
  orders:     number
}

export interface LatestOrder {
  id:           string
  orderNumber:  string
  customerName: string
  branchName:   string
  total:        number
  status:       string
  createdAt:    Date
}

export interface LowStockItem {
  variantId:         string
  sku:               string
  productName:       string
  branchName:        string
  availableStock:    number
  lowStockThreshold: number
}

export interface BestSellingProduct {
  productId:    string
  productName:  string
  totalQty:     number
  totalRevenue: number
}

export interface ActivityEvent {
  id:       string
  type:     "order_placed" | "order_status" | "product_added" | "branch_added"
  title:    string
  subtitle: string
  time:     Date
}

// ─── Date-range helpers ───────────────────────────────────────────────────────

export type DateRange =
  | "today"
  | "yesterday"
  | "last7"
  | "last30"
  | "thisMonth"
  | "allTime"

export interface DateBounds {
  start: Date
  end:   Date
  label: string
}

export function resolveDateRange(range: DateRange = "last7"): DateBounds {
  const now = new Date()
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0)
  const todayEnd   = new Date(now); todayEnd.setHours(23, 59, 59, 999)

  switch (range) {
    case "today":
      return { start: todayStart, end: todayEnd, label: "Today" }

    case "yesterday": {
      const s = new Date(todayStart); s.setDate(s.getDate() - 1)
      const e = new Date(todayStart); e.setMilliseconds(-1)
      return { start: s, end: e, label: "Yesterday" }
    }

    case "last30": {
      const s = new Date(todayStart); s.setDate(s.getDate() - 29)
      return { start: s, end: todayEnd, label: "Last 30 Days" }
    }

    case "thisMonth": {
      const s = new Date(now.getFullYear(), now.getMonth(), 1)
      return { start: s, end: todayEnd, label: "This Month" }
    }

    case "allTime":
      return { start: new Date(2020, 0, 1), end: todayEnd, label: "All Time" }

    case "last7":
    default: {
      const s = new Date(todayStart); s.setDate(s.getDate() - 6)
      return { start: s, end: todayEnd, label: "Last 7 Days" }
    }
  }
}

function startOfDay(d: Date): Date {
  const r = new Date(d); r.setHours(0, 0, 0, 0); return r
}

function daysAgo(n: number): Date {
  const d = new Date(); d.setDate(d.getDate() - n); d.setHours(0, 0, 0, 0); return d
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
    completedOrders,
    cancelledOrders,
    todayOrders,
    yesterdayOrders,
    totalCustomers,
    totalProducts,
    totalBranches,
    totalCategories,
    inventoryRows,
  ] = await Promise.all([
    prisma.order.aggregate({ where: { status: { not: "CANCELLED" } }, _sum: { total: true } }),
    prisma.order.aggregate({ where: { status: { not: "CANCELLED" }, createdAt: { gte: todayStart } }, _sum: { total: true } }),
    prisma.order.aggregate({ where: { status: { not: "CANCELLED" }, createdAt: { gte: yesterdayStart, lt: todayStart } }, _sum: { total: true } }),
    prisma.order.count({ where: { status: { not: "CANCELLED" } } }),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.order.count({ where: { status: "COLLECTED" } }),
    prisma.order.count({ where: { status: "CANCELLED" } }),
    prisma.order.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.order.count({ where: { createdAt: { gte: yesterdayStart, lt: todayStart } } }),
    prisma.customer.count(),
    prisma.product.count({ where: { isActive: true } }),
    prisma.branch.count({ where: { isActive: true } }),
    prisma.category.count({ where: { isActive: true } }),
    // Inventory stats — fetch in one query, compute counts in JS
    prisma.inventory.findMany({ select: { availableStock: true, lowStockThreshold: true } }),
  ])

  let lowStockCount   = 0
  let outOfStockCount = 0
  for (const r of inventoryRows) {
    if (r.availableStock <= 0)                        outOfStockCount++
    else if (r.availableStock <= r.lowStockThreshold) lowStockCount++
  }

  const todaySales     = todayRevenueAgg._sum.total     ?? 0
  const yesterdaySales = yesterdayRevenueAgg._sum.total ?? 0

  return {
    totalRevenue:    revenueAgg._sum.total ?? 0,
    todaySales,
    totalOrders,
    pendingOrders,
    completedOrders,
    cancelledOrders,
    totalCustomers,
    totalProducts,
    totalBranches,
    totalCategories,
    lowStockCount,
    outOfStockCount,
    revenueChange:   pctChange(todaySales, yesterdaySales),
    ordersChange:    pctChange(todayOrders, yesterdayOrders),
  }
}

// ─── Daily sales — respects DateRange ────────────────────────────────────────

export async function getDailySales(range: DateRange = "last7"): Promise<DailySalesPoint[]> {
  const { start } = resolveDateRange(range)

  // Always show a 7-day or range-appropriate window with no gaps
  const now   = new Date()
  const msDay = 86_400_000
  const totalDays = Math.max(1, Math.min(31, Math.ceil((now.getTime() - start.getTime()) / msDay)))
  const days  = Array.from({ length: totalDays }, (_, i) => {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    d.setHours(0, 0, 0, 0)
    return d
  })

  const orders = await prisma.order.findMany({
    where: { status: { not: "CANCELLED" }, createdAt: { gte: days[0] } },
    select: { total: true, createdAt: true },
  })

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  return days.map((dayStart, i) => {
    const dayEnd = new Date(dayStart); dayEnd.setHours(23, 59, 59, 999)
    const dayOrders = orders.filter(
      (o) => o.createdAt >= dayStart && o.createdAt <= dayEnd
    )
    // For short ranges use day-of-week, for longer show "1 Aug" style
    const label = totalDays <= 7
      ? dayLabels[dayStart.getDay()]
      : `${dayStart.getDate()} ${dayStart.toLocaleString("en-IN", { month: "short" })}`
    return {
      date:    label,
      revenue: dayOrders.reduce((s, o) => s + o.total, 0),
      orders:  dayOrders.length,
    }
  })
}

// ─── Monthly revenue ──────────────────────────────────────────────────────────

export async function getMonthlyRevenue(range: DateRange = "last7"): Promise<MonthlyRevenuePoint[]> {
  const monthLabels = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
  const now = new Date()

  // Derive how many months to show from range
  const monthCount = range === "allTime" ? 12
    : range === "thisMonth"              ? 1
    : range === "last30"                 ? 2
    : 6   // default — last 6 months

  const months = Array.from({ length: monthCount }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (monthCount - 1) + i, 1)
    return { year: d.getFullYear(), month: d.getMonth(), label: monthLabels[d.getMonth()] }
  })

  const earliest = new Date(months[0].year, months[0].month, 1)
  const orders = await prisma.order.findMany({
    where: { status: { not: "CANCELLED" }, createdAt: { gte: earliest } },
    select: { total: true, createdAt: true },
  })

  return months.map(({ year, month, label }) => ({
    month: label,
    revenue: orders
      .filter((o) => o.createdAt.getFullYear() === year && o.createdAt.getMonth() === month)
      .reduce((s, o) => s + o.total, 0),
  }))
}

// ─── Branch performance — respects DateRange ──────────────────────────────────

export async function getBranchPerformance(range: DateRange = "last7"): Promise<BranchPerformance[]> {
  const { start } = resolveDateRange(range)
  const dateFilter = range === "allTime" ? {} : { createdAt: { gte: start } }

  const branches = await prisma.branch.findMany({
    where: { isActive: true },
    select: {
      name: true,
      orders: {
        where: { status: { not: "CANCELLED" }, ...dateFilter },
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

// ─── Latest orders — respects DateRange ──────────────────────────────────────

export async function getLatestOrders(range: DateRange = "allTime"): Promise<LatestOrder[]> {
  const { start } = resolveDateRange(range)
  const dateFilter = range === "allTime" ? {} : { createdAt: { gte: start } }

  const rows = await prisma.order.findMany({
    take: 10,
    orderBy: { createdAt: "desc" },
    where: dateFilter,
    select: {
      id: true, orderNumber: true, customerName: true,
      total: true, status: true, createdAt: true,
      branch: { select: { name: true } },
    },
  })

  return rows.map((r) => ({
    id: r.id, orderNumber: r.orderNumber, customerName: r.customerName,
    branchName: r.branch.name, total: r.total, status: r.status, createdAt: r.createdAt,
  }))
}

// ─── Low stock ────────────────────────────────────────────────────────────────

export async function getLowStockItems(): Promise<LowStockItem[]> {
  const rows = await prisma.inventory.findMany({
    where: { availableStock: { lte: 10 } },
    take: 50,
    orderBy: { availableStock: "asc" },
    select: {
      variantId: true, availableStock: true, lowStockThreshold: true,
      branch:  { select: { name: true } },
      variant: { select: { sku: true, product: { select: { name: true } } } },
    },
  })

  return rows
    .filter((r) => r.availableStock <= r.lowStockThreshold)
    .slice(0, 10)
    .map((r) => ({
      variantId: r.variantId, sku: r.variant.sku,
      productName: r.variant.product.name, branchName: r.branch.name,
      availableStock: r.availableStock, lowStockThreshold: r.lowStockThreshold,
    }))
}

// ─── Best selling — respects DateRange ───────────────────────────────────────

export async function getBestSellingProducts(range: DateRange = "allTime"): Promise<BestSellingProduct[]> {
  const { start } = resolveDateRange(range)

  // Filter orders (only COLLECTED = actually sold)
  const ordersWhere = range === "allTime"
    ? { status: "COLLECTED" as const }
    : { status: "COLLECTED" as const, createdAt: { gte: start } }

  const collectedOrderIds = await prisma.order.findMany({
    where: ordersWhere,
    select: { id: true },
  }).then((rows) => rows.map((r) => r.id))

  if (collectedOrderIds.length === 0) {
    // Fall back to all non-cancelled if no collected orders yet
    const items = await prisma.orderItem.groupBy({
      by: ["variantId"],
      _sum: { quantity: true, totalPrice: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 10,
    })
    return buildBestSelling(items)
  }

  const items = await prisma.orderItem.groupBy({
    by: ["variantId"],
    where: { orderId: { in: collectedOrderIds } },
    _sum: { quantity: true, totalPrice: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: 10,
  })

  return buildBestSelling(items)
}

async function buildBestSelling(
  items: { variantId: string; _sum: { quantity: number | null; totalPrice: number | null } }[]
): Promise<BestSellingProduct[]> {
  if (items.length === 0) return []

  const variantIds = items.map((i) => i.variantId)
  const variants = await prisma.productVariant.findMany({
    where: { id: { in: variantIds } },
    select: { id: true, product: { select: { id: true, name: true } } },
  })

  const variantMap = new Map(variants.map((v) => [v.id, v]))
  const byProduct  = new Map<string, BestSellingProduct>()

  for (const item of items) {
    const variant = variantMap.get(item.variantId)
    if (!variant) continue
    const { id, name } = variant.product
    const existing = byProduct.get(id)
    if (existing) {
      existing.totalQty     += item._sum.quantity     ?? 0
      existing.totalRevenue += item._sum.totalPrice   ?? 0
    } else {
      byProduct.set(id, {
        productId: id, productName: name,
        totalQty: item._sum.quantity ?? 0, totalRevenue: item._sum.totalPrice ?? 0,
      })
    }
  }

  return [...byProduct.values()].sort((a, b) => b.totalQty - a.totalQty).slice(0, 8)
}

// ─── Activity timeline ────────────────────────────────────────────────────────

export async function getRecentActivity(): Promise<ActivityEvent[]> {
  const since = daysAgo(7)

  const [recentOrders, recentStatusChanges, recentProducts, recentBranches] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: since } },
      take: 5, orderBy: { createdAt: "desc" },
      select: { id: true, orderNumber: true, customerName: true, createdAt: true },
    }),
    prisma.orderStatusHistory.findMany({
      where: { createdAt: { gte: since }, status: { not: "PENDING" } },
      take: 5, orderBy: { createdAt: "desc" },
      select: { id: true, status: true, createdAt: true, order: { select: { orderNumber: true } } },
    }),
    prisma.product.findMany({
      where: { createdAt: { gte: since } },
      take: 5, orderBy: { createdAt: "desc" },
      select: { id: true, name: true, createdAt: true },
    }),
    prisma.branch.findMany({
      where: { createdAt: { gte: since } },
      take: 3, orderBy: { createdAt: "desc" },
      select: { id: true, name: true, city: true, createdAt: true },
    }),
  ])

  const events: ActivityEvent[] = [
    ...recentOrders.map((o) => ({
      id: `order-${o.id}`, type: "order_placed" as const,
      title: `New order ${o.orderNumber}`, subtitle: `by ${o.customerName}`, time: o.createdAt,
    })),
    ...recentStatusChanges.map((s) => ({
      id: `status-${s.id}`, type: "order_status" as const,
      title: `Order ${s.order.orderNumber}`, subtitle: `Status → ${s.status.replace(/_/g, " ")}`, time: s.createdAt,
    })),
    ...recentProducts.map((p) => ({
      id: `product-${p.id}`, type: "product_added" as const,
      title: `Product added`, subtitle: p.name, time: p.createdAt,
    })),
    ...recentBranches.map((b) => ({
      id: `branch-${b.id}`, type: "branch_added" as const,
      title: `Branch added`, subtitle: `${b.name}, ${b.city}`, time: b.createdAt,
    })),
  ]

  return events.sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, 12)
}
