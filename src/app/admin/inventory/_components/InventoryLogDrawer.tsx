"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import type { InventoryLog } from "@/lib/inventory"

interface InventoryLogDrawerProps {
  inventoryId: string
  variantSku:  string
  branchName:  string
  logs:        InventoryLog[]
  onClose:     () => void
}

const typeLabel: Record<string, string> = {
  ADD:          "Stock Added",
  REMOVE:       "Stock Removed",
  TRANSFER_IN:  "Transfer In",
  TRANSFER_OUT: "Transfer Out",
  ADJUSTMENT:   "Adjustment",
  BULK_UPDATE:  "Bulk Update",
  INITIAL:      "Initial Entry",
}

const typeColor: Record<string, string> = {
  ADD:          "bg-green-500",
  REMOVE:       "bg-red-500",
  TRANSFER_IN:  "bg-blue-500",
  TRANSFER_OUT: "bg-indigo-500",
  ADJUSTMENT:   "bg-amber-500",
  BULK_UPDATE:  "bg-purple-500",
  INITIAL:      "bg-slate-400",
}

function timeAgo(d: Date): string {
  const diff  = Date.now() - new Date(d).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins  <  1) return "just now"
  if (mins  < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

export function InventoryLogDrawer({ inventoryId, variantSku, branchName, logs, onClose }: InventoryLogDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null)

  // Close on click outside
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [onClose])

  // Close on Escape
  useEffect(() => {
    function handler(e: KeyboardEvent) { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [onClose])

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-40" aria-hidden="true" onClick={onClose} />

      {/* Drawer */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Inventory History"
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white dark:bg-slate-800 shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Inventory History</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
              {variantSku} · {branchName}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close"
            className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Log list */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500 gap-2">
              <span className="text-3xl" aria-hidden="true">📋</span>
              <p className="text-sm">No history yet</p>
            </div>
          ) : (
            <ol className="relative space-y-0">
              {logs.map((log, i) => {
                const isPositive = log.quantityChange >= 0
                return (
                  <li key={log.id} className="flex gap-3 pb-5 last:pb-0">
                    <div className="flex flex-col items-center shrink-0">
                      <div className={`w-3 h-3 rounded-full mt-0.5 shrink-0 ${typeColor[log.type] ?? "bg-slate-400"}`} />
                      {i < logs.length - 1 && <div className="w-px flex-1 bg-slate-200 dark:bg-slate-700 mt-1" />}
                    </div>
                    <div className="flex-1 min-w-0 pb-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                            {typeLabel[log.type] ?? log.type}
                          </p>
                          {log.note && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{log.note}</p>
                          )}
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                            {log.quantityBefore} → {log.quantityAfter}
                            <span className={`ml-2 font-semibold ${isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                              {isPositive ? "+" : ""}{log.quantityChange}
                            </span>
                          </p>
                        </div>
                        <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0 mt-0.5">
                          {timeAgo(log.createdAt)}
                        </span>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </div>
      </div>
    </>
  )
}
