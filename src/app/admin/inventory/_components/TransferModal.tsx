"use client"

import { useTransition, useState, useRef, useEffect } from "react"
import { transferStock } from "@/app/admin/inventory/actions"
import type { InventoryRow } from "@/lib/inventory"

interface TransferModalProps {
  row: InventoryRow
  allInventory: { id: string; branchId: string; branchName: string; variantId: string; availableStock: number }[]
  onClose: () => void
}

export function TransferModal({ row, allInventory, onClose }: TransferModalProps) {
  const [toId, setToId]   = useState("")
  const [qty, setQty]     = useState(1)
  const [note, setNote]   = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, start] = useTransition()
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => { dialogRef.current?.showModal() }, [])

  // Other branches that have an inventory record for the same variant
  const destinations = allInventory.filter(
    (i) => i.variantId === row.variantId && i.id !== row.id
  )

  const handleCancel = () => { dialogRef.current?.close(); onClose() }

  async function handleSubmit() {
    setError(null)
    if (!toId) { setError("Select a destination branch."); return }
    if (qty <= 0) { setError("Quantity must be at least 1."); return }
    if (qty > row.availableStock) { setError(`Only ${row.availableStock} available to transfer.`); return }

    start(async () => {
      const result = await transferStock(row.id, toId, qty, note)
      if (!result.success) { setError(result.error ?? "Transfer failed."); return }
      dialogRef.current?.close()
      onClose()
    })
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={handleCancel}
      className="w-full max-w-sm rounded-2xl shadow-2xl p-0 backdrop:bg-black/50 bg-white dark:bg-slate-800"
    >
      <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
        <h2 className="text-base font-semibold text-blue-700 dark:text-blue-400">🔄 Transfer Stock</h2>
        <button type="button" onClick={handleCancel} aria-label="Close"
          className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="px-6 py-5 space-y-4">
        {/* Context */}
        <div className="rounded-xl bg-slate-50 dark:bg-slate-700/40 px-4 py-3 text-sm space-y-1">
          <p className="font-semibold text-slate-800 dark:text-slate-200">{row.variant.product.name}</p>
          <p className="text-xs font-mono text-slate-500 dark:text-slate-400">{row.variant.sku}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            From: <strong className="text-slate-700 dark:text-slate-200">{row.branch.name}</strong>
            &nbsp;·&nbsp;Available: <strong className="text-slate-700 dark:text-slate-200">{row.availableStock}</strong>
          </p>
        </div>

        {/* Destination */}
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
            Destination Branch *
          </label>
          {destinations.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500 italic">
              No other branches have an inventory record for this variant.
              Add inventory to another branch first.
            </p>
          ) : (
            <select
              value={toId}
              onChange={(e) => setToId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]"
            >
              <option value="">— Select branch —</option>
              {destinations.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.branchName} (stock: {d.availableStock})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Quantity */}
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
            Quantity *
          </label>
          <input type="number" min={1} max={row.availableStock}
            value={qty}
            onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Note</label>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="Reason for transfer"
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]"
          />
        </div>

        {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>

      <div className="px-6 pb-5 flex gap-3 justify-end">
        <button type="button" onClick={handleCancel} disabled={isPending || !destinations.length}
          className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors disabled:opacity-50">
          Cancel
        </button>
        <button type="button" onClick={handleSubmit} disabled={isPending || !destinations.length || !toId}
          className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2">
          {isPending && <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
          {isPending ? "Transferring…" : `Transfer ${qty}`}
        </button>
      </div>
    </dialog>
  )
}
