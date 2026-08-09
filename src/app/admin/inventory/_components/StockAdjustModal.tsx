"use client"

import { useTransition, useState, useRef, useEffect } from "react"
import { addStock, removeStock } from "@/app/admin/inventory/actions"
import type { InventoryRow } from "@/lib/inventory"

interface StockAdjustModalProps {
  row: Pick<InventoryRow, "id" | "physicalStock" | "availableStock" | "reservedStock"> & {
    variant: { sku: string; product: { name: string } }
    branch:  { name: string }
  }
  mode: "ADD" | "REMOVE"
  onClose: () => void
}

export function StockAdjustModal({ row, mode, onClose }: StockAdjustModalProps) {
  const [qty, setQty]     = useState(1)
  const [note, setNote]   = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, start] = useTransition()
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => { dialogRef.current?.showModal() }, [])

  const handleCancel = () => { dialogRef.current?.close(); onClose() }

  async function handleSubmit() {
    setError(null)
    if (qty <= 0) { setError("Quantity must be at least 1."); return }
    if (mode === "REMOVE" && qty > row.availableStock) {
      setError(`Cannot remove more than available stock (${row.availableStock}).`); return
    }
    start(async () => {
      const result = mode === "ADD"
        ? await addStock(row.id, qty, note)
        : await removeStock(row.id, qty, note)
      if (!result.success) { setError(result.error ?? "Failed."); return }
      dialogRef.current?.close()
      onClose()
    })
  }

  const isAdd = mode === "ADD"
  const accent = isAdd ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"
  const btnCls = isAdd
    ? "bg-green-600 hover:bg-green-700 text-white"
    : "bg-red-600 hover:bg-red-700 text-white"

  return (
    <dialog
      ref={dialogRef}
      onCancel={handleCancel}
      className="w-full max-w-sm rounded-2xl shadow-2xl p-0 backdrop:bg-black/50 bg-white dark:bg-slate-800"
    >
      <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
        <h2 className={`text-base font-semibold ${accent}`}>
          {isAdd ? "➕ Add Stock" : "➖ Remove Stock"}
        </h2>
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
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{row.variant.sku} · {row.branch.name}</p>
          <div className="flex gap-4 mt-2 text-xs text-slate-500 dark:text-slate-400">
            <span>Physical: <strong className="text-slate-700 dark:text-slate-200">{row.physicalStock}</strong></span>
            <span>Reserved: <strong className="text-slate-700 dark:text-slate-200">{row.reservedStock}</strong></span>
            <span>Available: <strong className="text-slate-700 dark:text-slate-200">{row.availableStock}</strong></span>
          </div>
        </div>

        {/* Quantity */}
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
            Quantity *
          </label>
          <input
            type="number" min={1}
            value={qty}
            onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]"
          />
        </div>

        {/* Note */}
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
            Reason / Note
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. New stock received, Damaged items removed"
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]"
          />
        </div>

        {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>

      <div className="px-6 pb-5 flex gap-3 justify-end">
        <button type="button" onClick={handleCancel} disabled={isPending}
          className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors disabled:opacity-50">
          Cancel
        </button>
        <button type="button" onClick={handleSubmit} disabled={isPending}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2 ${btnCls}`}>
          {isPending && <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
          {isPending ? "Saving…" : isAdd ? `Add ${qty}` : `Remove ${qty}`}
        </button>
      </div>
    </dialog>
  )
}
