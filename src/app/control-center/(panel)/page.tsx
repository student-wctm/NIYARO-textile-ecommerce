// =============================================================================
// NIYARO Control Center Dashboard
//
// Architecture:
//   - Server Component; all queries run in a single Promise.all
//   - Date range driven by `range` URL searchParam (default: last7)
//   - Date objects are never passed to Client Components (serialisation safety)
//   - Charts and tables use pure SVG / plain HTML — zero charting libraries
//   - DateRangeFilter is a Client Component; pushes URL params only
//   - Dark mode: explicit dark: Tailwind classes on every element
// =============================================================================

import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"
import { siteConfig } from "@/config/site"
import {
  getDashboardKpis,
  getDailySales,
  getMonthlyRevenue,
  getBranchPerformance,
  getLatestOrders,
  getLowStockItems,
  getBestSellingProducts,
  getRecentActivity,
  resolveDateRange,
  type DateRange,
} from "@/lib/dashboard"
import { formatPrice } from "@/lib/utils"
import { KpiCard }                from "./_components/KpiCard"
import { DashboardCard }          from "./_components/DashboardCard"
import { SalesBarChart }          from "./_components/SalesBarChart"
import { RevenueLineChart }       from "./_components/RevenueLineChart"
import { BranchPerformanceChart } from "./_components/BranchPerformanceChart"
import { LatestOrdersTable }      from "./_components/LatestOrdersTable"
import { LowStockTable }          from "./_components/LowStockTable"
import { BestSellingTable }       from "./_components/BestSellingTable"
import { ActivityTimeline }       from "./_components/ActivityTimeline"
import { NotificationPanel, type Notification } from "./_components/NotificationPanel"
import { QuickActions }           from "./_components/QuickActions"
import { DateRangeFilter }        from "./_components/DateRangeFilter"

export const metadata: Metadata = { title: "Dashboard" }
export const dynamic = "force-dynamic"

// ─── searchParams (Promise in Next.js 16) ────────────────────────────────────

type PageProps = {
  searchParams: Promise<{ range?: string }>
}

// ─── Skeletons ────────────────────────────────────────────────────────────────

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700 ${className}`} />
}

function KpiSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-4">
      <div className="flex justify-between">
        <Skeleton className="h-11 w-11 rounded-xl" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function AdminDashboardPage({ searchParams }: PageProps) {
  const sp = await searchParams

  // Validate and resolve the range param
  const validRanges: DateRange[] = ["today", "yesterday", "last7", "last30", "thisMonth", "allTime"]
  const range: DateRange = validRanges.includes(sp.range as DateRange)
    ? (sp.range as DateRange)
    : "last7"

  const { label: rangeLabel } = resolveDateRange(range)

  // All queries in parallel — one round-trip
  const [
    kpis,
    dailySales,
    monthlyRevenue,
    branchPerf,
    latestOrders,
    lowStock,
    bestSelling,
    activity,
  ] = await Promise.all([
    getDashboardKpis(),
    getDailySales(range),
    getMonthlyRevenue(range),
    getBranchPerformance(range),
    getLatestOrders("allTime"),
    getLowStockItems(),
    getBestSellingProducts(range),
    getRecentActivity(),
  ])

  // Build notification list from live data
  const notifications: Notification[] = []

  if (kpis.pendingOrders > 0) {
    notifications.push({
      id: "pending-orders", type: "warning",
      title: `${kpis.pendingOrders} pending order${kpis.pendingOrders === 1 ? "" : "s"}`,
      body: "Orders waiting for branch confirmation.",
      href: "/control-center/orders?status=PENDING",
    })
  }

  const outOfStockItems = lowStock.filter((i) => i.availableStock === 0)
  if (outOfStockItems.length > 0) {
    notifications.push({
      id: "out-of-stock", type: "danger",
      title: `${outOfStockItems.length} item${outOfStockItems.length === 1 ? "" : "s"} out of stock`,
      body: outOfStockItems.map((i) => `${i.productName} (${i.branchName})`).slice(0, 3).join(", "),
      href: "/control-center/inventory?status=OUT_OF_STOCK",
    })
  }

  const criticalStock = lowStock.filter((i) => i.availableStock > 0)
  if (criticalStock.length > 0) {
    notifications.push({
      id: "low-stock", type: "warning",
      title: `${criticalStock.length} item${criticalStock.length === 1 ? "" : "s"} running low`,
      body: criticalStock.map((i) => `${i.productName} — ${i.availableStock} left`).slice(0, 3).join(", "),
      href: "/control-center/inventory?status=LOW_STOCK",
    })
  }

  if (kpis.totalBranches === 0) {
    notifications.push({
      id: "no-branches", type: "info",
      title: "No active branches",
      body: "Add your first branch to start accepting orders.",
      href: "/control-center/branches/new",
    })
  }

  if (kpis.totalProducts === 0) {
    notifications.push({
      id: "no-products", type: "info",
      title: "Catalogue is empty",
      body: "Add products so customers can start browsing.",
      href: "/control-center/products/new",
    })
  }

  return (
    <div className="space-y-8 pb-10">

      {/* ── Page header ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {siteConfig.name} · Live data from Neon PostgreSQL
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Date range filter — client component, pushes URL param only */}
          <Suspense>
            <DateRangeFilter current={range} />
          </Suspense>
          <Link
            href="/"
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            ← View Store
          </Link>
        </div>
      </div>

      {/* ── Quick Actions ───────────────────────────────────────────── */}
      <section aria-labelledby="qa-heading">
        <h2 id="qa-heading" className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">
          Quick Actions
        </h2>
        <QuickActions />
      </section>

      {/* ── KPI Cards — Row 1: Revenue & Orders ────────────────────── */}
      <section aria-labelledby="kpi-heading">
        <div className="flex items-center justify-between mb-3">
          <h2 id="kpi-heading" className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            Key Metrics
          </h2>
          <span className="text-xs text-slate-400 dark:text-slate-500 italic">{rangeLabel}</span>
        </div>

        {/* Revenue row */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Total Revenue"   value={formatPrice(kpis.totalRevenue)} icon="💰" accent="brand" />
          <KpiCard label="Today's Sales"   value={formatPrice(kpis.todaySales)}   icon="📈" trend={kpis.revenueChange} trendLabel="vs yesterday" accent="green" />
          <KpiCard label="Total Orders"    value={kpis.totalOrders.toLocaleString("en-IN")} icon="📋" trend={kpis.ordersChange} trendLabel="vs yesterday" accent="blue" />
          <KpiCard label="Pending Orders"  value={kpis.pendingOrders.toLocaleString("en-IN")} icon="⏳" accent={kpis.pendingOrders > 0 ? "amber" : "brand"} />
        </div>

        {/* Order status row */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <KpiCard label="Completed (Collected)" value={kpis.completedOrders.toLocaleString("en-IN")} icon="✅" accent="green" />
          <KpiCard label="Cancelled Orders"      value={kpis.cancelledOrders.toLocaleString("en-IN")} icon="🚫" accent={kpis.cancelledOrders > 0 ? "rose" : "brand"} />
          <KpiCard label="Low Stock Items"        value={kpis.lowStockCount.toLocaleString("en-IN")}   icon="⚠️" accent={kpis.lowStockCount > 0 ? "amber" : "green"} />
          <KpiCard label="Out of Stock"           value={kpis.outOfStockCount.toLocaleString("en-IN")} icon="🔴" accent={kpis.outOfStockCount > 0 ? "rose" : "green"} />
        </div>

        {/* Catalogue row */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <KpiCard label="Customers"       value={kpis.totalCustomers.toLocaleString("en-IN")}  icon="👥" accent="purple" />
          <KpiCard label="Active Products" value={kpis.totalProducts.toLocaleString("en-IN")}   icon="🧵" accent="brand"  />
          <KpiCard label="Active Branches" value={kpis.totalBranches.toLocaleString("en-IN")}   icon="🏪" accent="blue"   />
          <KpiCard label="Categories"      value={kpis.totalCategories.toLocaleString("en-IN")} icon="🗂️" accent="rose"  />
        </div>
      </section>

      {/* ── Analytics ──────────────────────────────────────────────── */}
      <section aria-labelledby="charts-heading">
        <div className="flex items-center justify-between mb-3">
          <h2 id="charts-heading" className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            Analytics
          </h2>
          <span className="text-xs text-slate-400 dark:text-slate-500 italic">{rangeLabel}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <DashboardCard title="Daily Sales" subtitle={`Revenue — ${rangeLabel}`}>
            <SalesBarChart data={dailySales} />
          </DashboardCard>
          <DashboardCard title="Monthly Revenue" subtitle="Last 6 months">
            <RevenueLineChart data={monthlyRevenue} />
          </DashboardCard>
        </div>

        <div className="mt-5">
          <DashboardCard title="Branch Performance" subtitle={`Revenue by branch — ${rangeLabel}`}>
            <BranchPerformanceChart data={branchPerf} />
          </DashboardCard>
        </div>
      </section>

      {/* ── Operations ─────────────────────────────────────────────── */}
      <section aria-labelledby="ops-heading">
        <h2 id="ops-heading" className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">
          Operations
        </h2>

        {/* Latest orders + notifications */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="xl:col-span-2">
            <DashboardCard
              title="Latest Orders"
              subtitle="10 most recent orders"
              action={
                <Link href="/control-center/orders" className="text-xs font-medium text-[var(--color-brand-600)] dark:text-[var(--color-brand-400)] hover:underline">
                  View all →
                </Link>
              }
            >
              <LatestOrdersTable orders={latestOrders} />
            </DashboardCard>
          </div>

          <DashboardCard
            title="Notifications"
            subtitle={`${notifications.length} alert${notifications.length === 1 ? "" : "s"}`}
          >
            <NotificationPanel notifications={notifications} />
          </DashboardCard>
        </div>

        {/* Best selling + low stock + activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5 mt-5">
          <DashboardCard
            title="Top Products"
            subtitle={`By units sold — ${rangeLabel}`}
            action={
              <Link href="/control-center/products" className="text-xs font-medium text-[var(--color-brand-600)] dark:text-[var(--color-brand-400)] hover:underline">
                All products →
              </Link>
            }
          >
            <BestSellingTable products={bestSelling} />
          </DashboardCard>

          <DashboardCard
            title="Inventory Alerts"
            subtitle="Low & out-of-stock items"
            action={
              <Link href="/control-center/inventory" className="text-xs font-medium text-amber-600 dark:text-amber-400 hover:underline">
                Manage →
              </Link>
            }
          >
            <LowStockTable items={lowStock} />
          </DashboardCard>

          <DashboardCard title="Recent Activity" subtitle="Last 7 days">
            <ActivityTimeline events={activity} />
          </DashboardCard>
        </div>
      </section>
    </div>
  )
}
