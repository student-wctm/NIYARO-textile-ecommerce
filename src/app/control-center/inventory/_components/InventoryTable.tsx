"use client"

// InventoryTable — receives serialised rows from the Server Component page.
// Dates are stripped to strings before crossing the server→client boundary.
// All modals are lazy-rendered (null until triggered) to keep initial bundle small.

import { useState } from "react"
import { StockStatusBadge } from "./StockStatusBadge"
import { StockAdjustModal } from "./StockAdjustModal"
import { TransferModal }    from "./TransferModal"
import { InventoryLogDrawer } from "./InventoryLogDrawer"
import type { StockStatus } from "@/lib/inventory"
import type { InventoryLog } from "@/lib/inventory"

// ─── Serialisable row type (no Date fields) ──────────────────────────────────

export interface SerialInventoryRow {
  id:               string
  branchId:         string
  variantId:        string
  physicalStock:    number
  reservedStock:    number
  availableStock:   number
  lowStockThreshold: number
  branchPrice:      number | null
  status:           StockStatus
  branch:           { id: string; name: string; city: string }
  variant:          {
    id:           string
    sku:          string
    color:        string | null
    size:         string | null
    length:       string | null
    priceOverride: number | null
    isActive:     boolean
    productId:    string
    product:      {
      id:         string
      name:       string
      basePrice:  number
      isActive:   boolean
      categoryId: string
      category:   { id: string; name: string }
    }
  }
}

export interface SerialInventoryLog {
  id:              string
  inventoryId:     string
  type:            string
  quantityBefore:  number
  quantityChange:  number
  quantityAfter:   number
  note:            string | null
  createdAt:       string   // ISO string
}

// Minimal shape needed by TransferModal allInventory prop
type TransferTarget = { id: string; branchId: string; branchName: string; variantId: string; availableStock: number }

// ─── Modal state ─────────────────────────────────────────────────────────────

type ModalState =
  | { kind: "none" }
  | { kind: "add";      row: SerialInventoryRow }
  | { kind: "remove";   row: SerialInventoryRow }
  | { kind: "transfer"; row: SerialInventoryRow }
  | { kind: "history";  row: SerialInventoryRow; logs: SerialInventoryLog[] }

interface InventoryTableProps {
  rows:         SerialInventoryRow[]
  allInventory: TransferTarget[]   // all active rows (same variant, any branch) for transfer
  logsMap:      Record<string, SerialInventoryLog[]>  // pre-loaded logs keyed by inventoryId
}

// ─── Action button ────────────────────────────────────────────────────────────

function ActionBtn({
  label, onClick, variant = "default",
}: { label: string; onClick: () => void; variant?: "green" | "red" | "blue" | "slate" | "default" }) {
  const cls: Record<string, string> = {
    green:  "border-green-200 text-green-700 bg-green-50 hover:bg-green-100 dark:border-green-800 dark:text-green-400 dark:bg-green-900/20 dark:hover:bg-green-900/40",
    red:    "border-red-200 text-red-700 bg-red-50 hover:bg-red-100 dark:border-red-800 dark:text-red-400 dark:bg-red-900/20 dark:hover:bg-red-900/40",
    blue:   "border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 dark:border-blue-800 dark:text-blue-400 dark:bg-blue-900/20 dark:hover:bg-blue-900/40",
    slate:  "border-slate-200 text-slate-600 bg-white hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:bg-slate-800 dark:hover:bg-slate-700",
    default:"border-slate-200 text-slate-600 bg-white hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:bg-slate-800 dark:hover:bg-slate-700",
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 ${cls[variant]}`}
    >
      {label}
    </button>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function InventoryTable({ rows, allInventory, logsMap }: InventoryTableProps) {
  const [modal, setModal] = useState<ModalState>({ kind: "none" })
  const close = () => setModal({ kind: "none" })

  if (rows.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 py-20 text-center">
        <p className="text-4xl mb-3" aria-hidden="true">📦</p>
        <p className="text-base font-medium text-slate-700 dark:text-slate-300 mb-1">No inventory records found</p>
        <p className="text-sm text-slate-400 dark:text-slate-500">
          Add products with variants, then set stock levels here.
        </p>
      </div>
    )
  }

  // Convert SerialInventoryRow to the shape StockAdjustModal expects
  function toAdjustRow(row: SerialInventoryRow) {
    return {
      id:            row.id,
      physicalStock: row.physicalStock,
      reservedStock: row.reservedStock,
      availableStock: row.availableStock,
      variant: { sku: row.variant.sku, product: { name: row.variant.product.name } },
      branch:  { name: row.branch.name },
    }
  }

  // Convert to full InventoryRow shape TransferModal needs
  function toTransferRow(row: SerialInventoryRow) {
    return row as unknown as Parameters<typeof TransferModal>[0]["row"]
  }

  // Convert SerialInventoryLog → InventoryLog (createdAt as Date)
  function toLogs(logs: SerialInventoryLog[]): InventoryLog[] {
    return logs.map((l) => ({ ...l, createdAt: new Date(l.createdAt) })) as unknown as InventoryLog[]
  }

  return (
    <>
      {/* ── Table ──────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr>
                {["Product / Variant", "Branch", "SKU", "Physical", "Reserved", "Available", "Threshold", "Status", "Actions"].map((h) => (
                  <th key={h} scope="col"
                    className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
              {rows.map((row) => {
                const v = row.variant
                const attrs = [v.color, v.size, v.length].filter(Boolean).join(" · ")

                return (
                  <tr key={row.id}
                    className={`transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/30 ${
                      row.status === "OUT_OF_STOCK" ? "bg-red-50/30 dark:bg-red-900/10" :
                      row.status === "LOW_STOCK"    ? "bg-amber-50/20 dark:bg-amber-900/10" : ""
                    }`}>

                    {/* Product / Variant */}
                    <td className="px-4 py-3 min-w-[180px]">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[200px]"
                        title={v.product.name}>{v.product.name}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{v.product.category.name}</p>
                      {attrs && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{attrs}</p>}
                    </td>

                    {/* Branch */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-sm text-slate-700 dark:text-slate-300">{row.branch.name}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{row.branch.city}</p>
                    </td>

                    {/* SKU */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-mono text-xs text-slate-600 dark:text-slate-400">{v.sku}</span>
                    </td>

                    {/* Physical */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{row.physicalStock}</span>
                    </td>

                    {/* Reserved */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <span className="text-sm text-slate-500 dark:text-slate-400">{row.reservedStock}</span>
                    </td>

                    {/* Available */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <span className={`text-sm font-bold ${
                        row.availableStock <= 0 ? "text-red-600 dark:text-red-400" :
                        row.availableStock <= row.lowStockThreshold ? "text-amber-600 dark:text-amber-400" :
                        "text-green-700 dark:text-green-400"
                      }`}>{row.availableStock}</span>
                    </td>

                    {/* Threshold */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <span className="text-xs text-slate-400 dark:text-slate-500">{row.lowStockThreshold}</span>
                    </td>

                    {/* Status badge */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StockStatusBadge status={row.status} />
                    </td>

                    {/* Action buttons */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <ActionBtn label="+ Add"
                          variant="green"
                          onClick={() => setModal({ kind: "add", row })} />
                        <ActionBtn label="− Remove"
                          variant="red"
                          onClick={() => setModal({ kind: "remove", row })} />
                        <ActionBtn label="⇄ Transfer"
                          variant="blue"
                          onClick={() => setModal({ kind: "transfer", row })} />
                        <ActionBtn label="History"
                          variant="slate"
                          onClick={() => setModal({
                            kind: "history", row,
                            logs: logsMap[row.id] ?? [],
                          })} />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modals / Drawer ─────────────────────────────────────── */}
      {modal.kind === "add" && (
        <StockAdjustModal row={toAdjustRow(modal.row)} mode="ADD" onClose={close} />
      )}
      {modal.kind === "remove" && (
        <StockAdjustModal row={toAdjustRow(modal.row)} mode="REMOVE" onClose={close} />
      )}
      {modal.kind === "transfer" && (
        <TransferModal
          row={toTransferRow(modal.row)}
          allInventory={allInventory}
          onClose={close}
        />
      )}
      {modal.kind === "history" && (
        <InventoryLogDrawer
          inventoryId={modal.row.id}
          variantSku={modal.row.variant.sku}
          branchName={modal.row.branch.name}
          logs={toLogs(modal.logs)}
          onClose={close}
        />
      )}
    </>
  )
}
