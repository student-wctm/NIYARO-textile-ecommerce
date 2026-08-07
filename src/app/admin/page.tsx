// =============================================================================
// NIYARO Super Admin Dashboard
//
// SECURITY TODO: No authentication yet. Protect before production.
//
// Architecture:
//   All data fetched server-side in a single Promise.all — no waterfalls.
//   Date objects are not passed to Client Components (serialisation safety).
//   Charts use pure SVG — zero charting libraries.
//   Dark mode: explicit dark: Tailwind classes on every element.
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
} from "@/lib/dashboard"
import { formatPrice } from "@/lib/utils"
import { KpiCard }               from "./_components/KpiCard"
import { DashboardCard }         from "./_components/DashboardCard"
import { SalesBarChart }         from "./_components/SalesBarChart"
import { RevenueLineChart }      from "./_components/RevenueLineChart"
import { BranchPerformanceChart } from "./_components/BranchPerformanceChart"
import { LatestOrdersTable }     from "./_components/LatestOrdersTable"
import { LowStockTable }         from "./_components/LowStockTable"
import { BestSellingTable }      from "./_components/BestSellingTable"
import { ActivityTimeline }      from "./_components/ActivityTimeline"
import { NotificationPanel, type Notification } from "./_components/NotificationPanel"
import { QuickActions }          from "./_components/QuickActions"

export const metadata: Metadata = { title: "Dashboard" }
export const dynamic = "force-dynamic" // always fresh data

// ─── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700 ${className}`} />
  )
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

function ChartSkeleton({ height = "h-52" }: { height?: string }) {
  return <Skeleton className={`w-full ${height}`} />
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function AdminDashboardPage() {
  // All queries run in parallel — single round-trip to the database
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
    getDailySales(),
    getMonthlyRevenue(),
    getBranchPerformance(),
    getLatestOrders(),
    getLowStockItems(),
    getBestSellingProducts(),
    getRecentActivity(),
  ])

  // Build notification list from live data
  const notifications: Notification[] = []

  if (kpis.pendingOrders > 0) {
    notifications.push({
      id: "pending-orders",
      type: "warning",
      title: `${kpis.pendingOrders} pending order${kpis.pendingOrders === 1 ? "" : "s"}`,
      body: "Orders waiting for branch confirmation.",
      href: "/admin/orders",
    })
  }

  const outOfStock = lowStock.filter((i) => i.availableStock === 0)
  if (outOfStock.length > 0) {
    notifications.push({
      id: "out-of-stock",
      type: "danger",
      title: `${outOfStock.length} item${outOfStock.length === 1 ? "" : "s"} out of stock`,
      body: outOfStock.map((i) => `${i.productName} (${i.branchName})`).slice(0, 3).join(", "),
      href: "/admin/inventory",
    })
  }

  const criticalStock = lowStock.filter((i) => i.availableStock > 0)
  if (criticalStock.length > 0) {
    notifications.push({
      id: "low-stock",
      type: "warning",
      title: `${criticalStock.length} item${criticalStock.length === 1 ? "" : "s"} running low`,
      body: criticalStock.map((i) => `${i.productName} — ${i.availableStock} left`).slice(0, 3).join(", "),
      href: "/admin/inventory",
    })
  }

  if (kpis.totalBranches === 0) {
    notifications.push({
      id: "no-branches",
      type: "info",
      title: "No active branches",
      body: "Add your first branch to start accepting orders.",
      href: "/admin/branches/new",
    })
  }

  if (kpis.totalProducts === 0) {
    notifications.push({
      id: "no-products",
      type: "info",
      title: "Catalogue is empty",
      body: "Add products so customers can start browsing.",
      href: "/admin/products/new",
    })
  }

  // Serialise activity timestamps → strings so they cross Server→Client safely
  const activityForClient = activity.map((e) => ({
    ...e,
    time: e.time as unknown as Date, // kept as Date since ActivityTimeline is a Server Component
  }))

  return (
    <div className="space-y-8 pb-10">
      {/* ── Page header ───────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {siteConfig.name} · Live data from Neon PostgreSQL
          </p>
        </div>
        <Link
          href="/"
          className="self-start sm:self-auto inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          ← View Store
        </Link>
      </div>

      {/* ── Quick Actions ─────────────────────────────────────────── */}
      <section aria-labelledby="qa-heading">
        <h2 id="qa-heading" className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">
          Quick Actions
        </h2>
        <QuickActions />
      </section>

      {/* ── KPI cards ─────────────────────────────────────────────── */}
      <section aria-labelledby="kpi-heading">
        <h2 id="kpi-heading" className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">
          Key Metrics
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Total Revenue"
            value={formatPrice(kpis.totalRevenue)}
            icon="💰"
            accent="brand"
          />
          <KpiCard
            label="Today's Sales"
            value={formatPrice(kpis.todaySales)}
            icon="📈"
            trend={kpis.revenueChange}
            trendLabel="vs yesterday"
            accent="green"
          />
          <KpiCard
            label="Total Orders"
            value={kpis.totalOrders.toLocaleString("en-IN")}
            icon="📋"
            trend={kpis.ordersChange}
            trendLabel="vs yesterday"
            accent="blue"
          />
          <KpiCard
            label="Pending Orders"
            value={kpis.pendingOrders.toLocaleString("en-IN")}
            icon="⏳"
            accent={kpis.pendingOrders > 0 ? "amber" : "brand"}
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <KpiCard
            label="Customers"
            value={kpis.totalCustomers.toLocaleString("en-IN")}
            icon="👥"
            accent="purple"
          />
          <KpiCard
            label="Active Products"
            value={kpis.totalProducts.toLocaleString("en-IN")}
            icon="🧵"
            accent="brand"
          />
          <KpiCard
            label="Active Branches"
            value={kpis.totalBranches.toLocaleString("en-IN")}
            icon="🏪"
            accent="blue"
          />
          <KpiCard
            label="Categories"
            value={kpis.totalCategories.toLocaleString("en-IN")}
            icon="🗂️"
            accent="rose"
          />
        </div>
      </section>

      {/* ── Charts row ────────────────────────────────────────────── */}
      <section aria-labelledby="charts-heading">
        <h2 id="charts-heading" className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">
          Analytics
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <DashboardCard
            title="Daily Sales"
            subtitle="Revenue for the last 7 days"
          >
            <SalesBarChart data={dailySales} />
          </DashboardCard>

          <DashboardCard
            title="Monthly Revenue"
            subtitle="Last 6 months"
          >
            <RevenueLineChart data={monthlyRevenue} />
          </DashboardCard>
        </div>

        <div className="mt-5">
          <DashboardCard
            title="Branch Performance"
            subtitle="Revenue by active branch (all time)"
          >
            <BranchPerformanceChart data={branchPerf} />
          </DashboardCard>
        </div>
      </section>

      {/* ── Tables + side panels ──────────────────────────────────── */}
      <section aria-labelledby="data-heading">
        <h2 id="data-heading" className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">
          Operations
        </h2>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          {/* Latest orders — spans 2 cols on xl */}
          <div className="xl:col-span-2">
            <DashboardCard
              title="Latest Orders"
              subtitle="10 most recent orders"
              action={
                <Link
                  href="/admin/orders"
                  className="text-xs font-medium text-[var(--color-brand-600)] dark:text-[var(--color-brand-400)] hover:underline"
                >
                  View all →
                </Link>
              }
            >
              <LatestOrdersTable orders={latestOrders} />
            </DashboardCard>
          </div>

          {/* Notification panel */}
          <DashboardCard
            title="Notifications"
            subtitle={`${notifications.length} alert${notifications.length === 1 ? "" : "s"}`}
          >
            <NotificationPanel notifications={notifications} />
          </DashboardCard>
        </div>

        {/* Second row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5 mt-5">
          {/* Best selling */}
          <DashboardCard
            title="Best Selling Products"
            subtitle="By units sold (all time)"
            action={
              <Link href="/admin/products" className="text-xs font-medium text-[var(--color-brand-600)] dark:text-[var(--color-brand-400)] hover:underline">
                All products →
              </Link>
            }
          >
            <BestSellingTable products={bestSelling} />
          </DashboardCard>

          {/* Low stock */}
          <DashboardCard
            title="Low Stock Alert"
            subtitle="Variants at or below threshold"
            action={
              <Link href="/admin/inventory" className="text-xs font-medium text-amber-600 dark:text-amber-400 hover:underline">
                Manage →
              </Link>
            }
          >
            <LowStockTable items={lowStock} />
          </DashboardCard>

          {/* Activity timeline */}
          <DashboardCard
            title="Recent Activity"
            subtitle="Last 7 days"
          >
            <ActivityTimeline events={activityForClient} />
          </DashboardCard>
        </div>
      </section>
    </div>
  )
}
