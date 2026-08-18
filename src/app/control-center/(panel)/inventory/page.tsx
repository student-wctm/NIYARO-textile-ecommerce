// =============================================================================
// Control Center — Inventory Management
//
// Architecture notes:
//   This is a Server Component. All DB queries run server-side.
//   Date fields are serialised to ISO strings before being passed to any
//   Client Component, preventing the "Date is not serialisable" boundary error.
//   Filters come from URL searchParams (safe, no state required on server).
// =============================================================================

import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"
import {
  getInventoryList,
  getInventoryStats,
  getActiveBranchOptions,
  getActiveCategoryOptions,
  getInventoryLog,
  getStockStatus,
} from "@/lib/inventory"
import type { InventoryFilters, StockStatus } from "@/lib/inventory"
import { InventoryKpiRow }   from "./_components/InventoryKpiRow"
import { InventoryFiltersBar } from "./_components/InventoryFiltersBar"
import { InventoryTable }    from "./_components/InventoryTable"
import type { SerialInventoryRow, SerialInventoryLog } from "./_components/InventoryTable"
import { ExportButton }      from "./_components/ExportButton"
import { Pagination }        from "./_components/Pagination"

export const metadata: Metadata = { title: "Inventory" }
export const dynamic = "force-dynamic"

// ─── searchParams type (Next.js 16 — Promise) ────────────────────────────────

type PageProps = {
  searchParams: Promise<{
    branchId?:   string
    categoryId?: string
    status?:     string
    search?:     string
    page?:       string
  }>
}

// ─── Skeleton used in Suspense fallbacks ─────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-pulse">
      <div className="h-12 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700" />
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-slate-50 dark:border-slate-700/30 last:border-0">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-36" />
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24" />
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-20" />
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-12 ml-auto" />
        </div>
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminInventoryPage({ searchParams }: PageProps) {
  const sp = await searchParams

  // Build filters from URL params
  const rawStatus = sp.status ?? ""
  const validStatuses: (StockStatus | "ALL")[] = ["IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK", "ALL"]
  const status = validStatuses.includes(rawStatus as StockStatus)
    ? (rawStatus as StockStatus)
    : undefined

  const filters: InventoryFilters = {
    branchId:   sp.branchId   || undefined,
    categoryId: sp.categoryId || undefined,
    status,
    search:     sp.search     || undefined,
    page:       sp.page ? Math.max(1, parseInt(sp.page, 10)) : 1,
    pageSize:   20,
  }

  // Run all queries in parallel
  const [
    { rows, total, page, pageSize, totalPages },
    stats,
    branches,
    categories,
  ] = await Promise.all([
    getInventoryList(filters),
    getInventoryStats(),
    getActiveBranchOptions(),
    getActiveCategoryOptions(),
  ])

  // Load logs for all visible rows (capped at 20 logs each for performance)
  const logsRaw = await Promise.all(
    rows.map((r) => getInventoryLog(r.id, 20).then((logs) => ({ id: r.id, logs })))
  )
  const logsMapRaw = Object.fromEntries(logsRaw.map(({ id, logs }) => [id, logs]))

  // ── Serialise for Client Components ────────────────────────────────────────
  // Strip Date fields → ISO strings. This prevents the Next.js 16 serialisation
  // error when passing Prisma objects across the Server→Client boundary.

  const serialRows: SerialInventoryRow[] = rows.map((r) => ({
    id:               r.id,
    branchId:         r.branchId,
    variantId:        r.variantId,
    physicalStock:    r.physicalStock,
    reservedStock:    r.reservedStock,
    availableStock:   r.availableStock,
    lowStockThreshold: r.lowStockThreshold,
    branchPrice:      r.branchPrice,
    status:           getStockStatus(r),
    branch: {
      id:   r.branch.id,
      name: r.branch.name,
      city: r.branch.city,
    },
    variant: {
      id:           r.variant.id,
      sku:          r.variant.sku,
      color:        r.variant.color,
      size:         r.variant.size,
      length:       r.variant.length,
      priceOverride: r.variant.priceOverride,
      isActive:     r.variant.isActive,
      productId:    r.variant.productId,
      product: {
        id:         r.variant.product.id,
        name:       r.variant.product.name,
        basePrice:  r.variant.product.basePrice,
        isActive:   r.variant.product.isActive,
        categoryId: r.variant.product.categoryId,
        category: {
          id:   r.variant.product.category.id,
          name: r.variant.product.category.name,
        },
      },
    },
  }))

  const serialLogsMap: Record<string, SerialInventoryLog[]> = {}
  for (const { id, logs } of logsRaw) {
    serialLogsMap[id] = logs.map((l) => ({
      id:             l.id,
      inventoryId:    l.inventoryId,
      type:           l.type as string,
      quantityBefore: l.quantityBefore,
      quantityChange: l.quantityChange,
      quantityAfter:  l.quantityAfter,
      note:           l.note,
      createdAt:      l.createdAt.toISOString(),
    }))
  }

  // Flat transfer targets — needed by TransferModal allInventory prop
  const allInventoryForTransfer = serialRows.map((r) => ({
    id:           r.id,
    branchId:     r.branchId,
    branchName:   r.branch.name,
    variantId:    r.variantId,
    availableStock: r.availableStock,
  }))

  const hasFilters = !!(sp.branchId || sp.categoryId || sp.status || sp.search)
  const csvFilters: InventoryFilters = { ...filters, page: undefined, pageSize: undefined }

  return (
    <div className="space-y-6 pb-10">
      {/* ── Page header ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Inventory</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Branch-wise, variant-wise stock management
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ExportButton filters={csvFilters} />
          <Link
            href="/control-center/products"
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-brand-600)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-700)] transition-colors"
          >
            + Add Product
          </Link>
        </div>
      </div>

      {/* ── KPI cards ──────────────────────────────────────────── */}
      <InventoryKpiRow stats={stats} />

      {/* ── Filters ────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 px-5 py-4">
        <Suspense>
          <InventoryFiltersBar
            branches={branches}
            categories={categories}
            currentBranchId={sp.branchId}
            currentCategoryId={sp.categoryId}
            currentStatus={sp.status}
            currentSearch={sp.search}
          />
        </Suspense>
      </div>

      {/* ── Results summary ────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {total > 0
            ? <><span className="font-semibold text-slate-700 dark:text-slate-200">{total}</span> record{total === 1 ? "" : "s"} found{hasFilters ? " (filtered)" : ""}</>
            : hasFilters ? "No records match your filters." : "No inventory records yet."
          }
        </p>
      </div>

      {/* ── Table ──────────────────────────────────────────────── */}
      <Suspense fallback={<TableSkeleton />}>
        <InventoryTable
          rows={serialRows}
          allInventory={allInventoryForTransfer}
          logsMap={serialLogsMap}
        />
      </Suspense>

      {/* ── Pagination ─────────────────────────────────────────── */}
      <Suspense>
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={pageSize}
        />
      </Suspense>

      {/* ── Empty state setup hint ─────────────────────────────── */}
      {total === 0 && !hasFilters && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 px-6 py-8 text-center">
          <p className="text-3xl mb-3" aria-hidden="true">🏗️</p>
          <p className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-1">
            No inventory records yet
          </p>
          <p className="text-sm text-slate-400 dark:text-slate-500 max-w-md mx-auto mb-5">
            Inventory records are created per product variant per branch.
            Add branches and products first, then stock levels will appear here.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link href="/control-center/branches/new"
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
              Add Branch
            </Link>
            <Link href="/control-center/products/new"
              className="rounded-lg bg-[var(--color-brand-600)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-700)] transition-colors">
              Add Product
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
