// =============================================================================
// Admin — Orders Management
// SECURITY TODO: No authentication yet. Protect before production.
// =============================================================================

import type { Metadata } from "next"
import { Suspense } from "react"
import {
  getOrderList,
  getOrderStats,
  getOrderBranchOptions,
} from "@/lib/orders"
import type { OrderFilters, OrderStatus, OrderSummary } from "@/lib/orders"
import { OrderKpiRow }       from "./_components/OrderKpiRow"
import { OrdersFiltersBar }  from "./_components/OrdersFiltersBar"
import { OrdersTable }       from "./_components/OrdersTable"
import { OrdersTableSkeleton } from "./_components/OrdersTable"
import type { SerialOrderSummary } from "./_components/OrdersTable"
import { Pagination }        from "./_components/Pagination"

export const metadata: Metadata = { title: "Orders" }
export const dynamic = "force-dynamic"

type PageProps = {
  searchParams: Promise<{
    search?:   string
    status?:   string
    branchId?: string
    dateFrom?: string
    dateTo?:   string
    page?:     string
  }>
}

const VALID_STATUSES: OrderStatus[] = [
  "PENDING", "CONFIRMED", "PACKING", "READY_FOR_PICKUP", "COLLECTED", "CANCELLED",
]

function FiltersBarSkeleton() {
  return (
    <div className="animate-pulse flex gap-2 flex-wrap">
      <div className="h-9 bg-slate-200 dark:bg-slate-700 rounded-lg flex-1 min-w-[200px]" />
      <div className="h-9 w-36 bg-slate-200 dark:bg-slate-700 rounded-lg" />
      <div className="h-9 w-36 bg-slate-200 dark:bg-slate-700 rounded-lg" />
    </div>
  )
}

export default async function AdminOrdersPage({ searchParams }: PageProps) {
  const sp = await searchParams

  const statusParam = sp.status
  const status = (statusParam && VALID_STATUSES.includes(statusParam as OrderStatus))
    ? (statusParam as OrderStatus)
    : undefined

  const filters: OrderFilters = {
    search:   sp.search   || undefined,
    status,
    branchId: sp.branchId || undefined,
    dateFrom: sp.dateFrom || undefined,
    dateTo:   sp.dateTo   || undefined,
    page:     sp.page ? Math.max(1, parseInt(sp.page, 10)) : 1,
    pageSize: 20,
  }

  const [
    { orders, total, page, pageSize, totalPages },
    stats,
    branches,
  ] = await Promise.all([
    getOrderList(filters),
    getOrderStats(),
    getOrderBranchOptions(),
  ])

  // Serialise Date fields before passing to Client Components
  const serialOrders: SerialOrderSummary[] = orders.map((o: OrderSummary) => ({
    id:             o.id,
    orderNumber:    o.orderNumber,
    customerName:   o.customerName,
    customerPhone:  o.customerPhone,
    customerEmail:  o.customerEmail,
    branchName:     o.branch.name,
    branchCity:     o.branch.city,
    itemCount:      o._count.items,
    subtotal:       o.subtotal,
    total:          o.total,
    transferCharge: o.transferCharge,
    status:         o.status,
    notes:          o.notes,
    createdAt:      o.createdAt.toISOString(),
    updatedAt:      o.updatedAt.toISOString(),
  }))

  const hasFilters = !!(sp.search || sp.status || sp.branchId || sp.dateFrom || sp.dateTo)

  return (
    <div className="space-y-6 pb-10">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Orders</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            All reservations and orders across every branch
          </p>
        </div>
      </div>

      {/* ── KPI cards ── */}
      <OrderKpiRow stats={stats} />

      {/* ── Filters ── */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 px-5 py-4">
        <Suspense fallback={<FiltersBarSkeleton />}>
          <OrdersFiltersBar
            branches={branches}
            currentStatus={sp.status}
            currentBranchId={sp.branchId}
            currentDateFrom={sp.dateFrom}
            currentDateTo={sp.dateTo}
            currentSearch={sp.search}
          />
        </Suspense>
      </div>

      {/* ── Results summary ── */}
      {total > 0 && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          <span className="font-semibold text-slate-700 dark:text-slate-200">{total}</span>{" "}
          order{total === 1 ? "" : "s"} found{hasFilters ? " (filtered)" : ""}
        </p>
      )}

      {/* ── Table ── */}
      <Suspense fallback={
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <OrdersTableSkeleton />
        </div>
      }>
        <OrdersTable orders={serialOrders} />
      </Suspense>

      {/* ── Pagination ── */}
      <Suspense>
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={pageSize}
        />
      </Suspense>
    </div>
  )
}
