"use client"

import { useTransition, useState } from "react"
import { changeOrderStatus, updateStaffNotes } from "@/app/admin/orders/actions"
import { OrderStatusBadge } from "./OrderStatusBadge"
import { STATUS_LABEL, STATUS_TRANSITIONS } from "@/lib/ordersMeta"
import type { OrderStatus } from "@/lib/ordersMeta"

interface OrderStatusChangerProps {
  orderId:       string
  currentStatus: OrderStatus
  currentNotes:  string | null
}

const DESTRUCTIVE: OrderStatus[] = ["CANCELLED"]

// Button style per target status
const BTN_CLS: Partial<Record<OrderStatus, string>> = {
  CONFIRMED:        "bg-blue-600 hover:bg-blue-700 text-white",
  PACKING:          "bg-indigo-600 hover:bg-indigo-700 text-white",
  READY_FOR_PICKUP: "bg-green-600 hover:bg-green-700 text-white",
  COLLECTED:        "bg-slate-700 hover:bg-slate-800 text-white",
  CANCELLED:        "bg-red-600 hover:bg-red-700 text-white",
}

export function OrderStatusChanger({ orderId, currentStatus, currentNotes }: OrderStatusChangerProps) {
  const [isPending, startTransition] = useTransition()
  const [toast, setToast]     = useState<{ msg: string; ok: boolean } | null>(null)
  const [note, setNote]       = useState(currentNotes ?? "")
  const [notesSaved, setNotesSaved] = useState(false)
  const [notesPending, startNotes]  = useTransition()

  const allowed = STATUS_TRANSITIONS[currentStatus]

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  function handleChange(next: OrderStatus) {
    const isDestructive = DESTRUCTIVE.includes(next)
    if (isDestructive) {
      const confirmed = window.confirm(
        `Are you sure you want to ${STATUS_LABEL[next].toLowerCase()} this order?\n\nThis cannot be undone.`
      )
      if (!confirmed) return
    }
    startTransition(async () => {
      const result = await changeOrderStatus(orderId, next, note.trim() || undefined)
      if (result.success) {
        showToast(`Status updated to "${STATUS_LABEL[next]}"`, true)
      } else {
        showToast(result.error ?? "Failed to update status.", false)
      }
    })
  }

  function handleSaveNotes() {
    startNotes(async () => {
      const result = await updateStaffNotes(orderId, note)
      if (result.success) {
        setNotesSaved(true)
        setTimeout(() => setNotesSaved(false), 2500)
      }
    })
  }

  return (
    <div className="space-y-5">
      {/* Toast */}
      {toast && (
        <div role="status" aria-live="polite"
          className={`rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2 ${
            toast.ok
              ? "bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-400"
              : "bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-400"
          }`}>
          {toast.ok ? "✅" : "❌"} {toast.msg}
        </div>
      )}

      {/* Current status */}
      <div>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
          Current Status
        </p>
        <OrderStatusBadge status={currentStatus} />
      </div>

      {/* Available transitions */}
      {allowed.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
            Change Status
          </p>
          <div className="flex flex-wrap gap-2">
            {allowed.map((next) => (
              <button
                key={next}
                type="button"
                onClick={() => handleChange(next)}
                disabled={isPending}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${BTN_CLS[next] ?? "bg-slate-600 hover:bg-slate-700 text-white"}`}
              >
                {isPending && (
                  <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                )}
                {DESTRUCTIVE.includes(next) && "⚠️ "}
                {STATUS_LABEL[next]}
              </button>
            ))}
          </div>
          {allowed.some((s) => DESTRUCTIVE.includes(s)) && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
              ⚠️ Cancellation will release reserved inventory.
            </p>
          )}
        </div>
      )}

      {/* Terminal state notice */}
      {allowed.length === 0 && (
        <p className="text-sm text-slate-400 dark:text-slate-500 italic">
          This order is in a final state and cannot be changed.
        </p>
      )}

      {/* Staff notes */}
      <div>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
          Staff Notes
        </p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Internal notes — not visible to the customer"
          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] resize-none"
        />
        <div className="flex items-center justify-between mt-1.5">
          {notesSaved && (
            <span className="text-xs text-green-600 dark:text-green-400">Notes saved ✓</span>
          )}
          {!notesSaved && <span />}
          <button
            type="button"
            onClick={handleSaveNotes}
            disabled={notesPending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            {notesPending ? "Saving…" : "Save Notes"}
          </button>
        </div>
      </div>
    </div>
  )
}
