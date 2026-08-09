"use client"

// All Date fields are received as ISO strings (serialised on the server)
// to safely cross the Server→Client boundary.

import Link from "next/link"
import { OrderStatusBadge } from "./OrderStatusBadge"
import { formatPrice } from "@/lib/utils"
import type { OrderStatus } from "@/lib/ordersMeta"

export interface SerialOrderSummary {
  id:            string
  orderNumber:   string
  customerName:  string
  customerPhone: string
  customerEmail: string | null
  branchName:    string
  branchCity:    string
  itemCount:     number
  subtotal:      number
  total:         number
  transferCharge: number
  status:        OrderStatus
  notes:         string | null
  createdAt:     string   // ISO string
  updatedAt:     string
}

interface OrdersTableProps {
  orders: SerialOrderSummary[]
}

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day:    "2-digit",
    month:  "short",
    year:   "numeric",
    hour:   "2-digit",
    minute: "2-digit",
  }).format(new Date(iso))
}

function TableSkeleton() {
  return (
    <div className="animate-pulse space-y-0">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3.5 border-b border-slate-50 dark:border-slate-700/30 last:border-0">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-28" />
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-32" />
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-20 ml-auto" />
          <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded-full w-20" />
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-16" />
        </div>
      ))}
    </div>
  )
}

export function OrdersTable({ orders }: OrdersTableProps) {
  if (orders.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 py-20 text-center">
        <p className="text-4xl mb-3" aria-hidden="true">📋</p>
        <p className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-1">No orders found</p>
        <p className="text-sm text-slate-400 dark:text-slate-500">
          Orders will appear here once customers place reservations.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-700">
          <thead className="bg-slate-50 dark:bg-slate-700/50">
            <tr>
              {["Order", "Customer", "Branch", "Items", "Amount", "Status", "Date", ""].map((h) => (
                <th key={h} scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
            {orders.map((order) => (
              <tr key={order.id}
                className={`transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/30 ${
                  order.status === "PENDING"    ? "bg-yellow-50/20 dark:bg-yellow-900/5" :
                  order.status === "CANCELLED"  ? "bg-red-50/10 dark:bg-red-900/5" :
                  order.status === "COLLECTED"  ? "bg-slate-50/60 dark:bg-slate-700/10 opacity-70" : ""
                }`}>

                {/* Order number */}
                <td className="px-4 py-3.5 whitespace-nowrap">
                  <Link href={`/admin/orders/${order.id}`}
                    className="font-mono text-xs font-semibold text-[var(--color-brand-600)] dark:text-[var(--color-brand-400)] hover:underline">
                    {order.orderNumber}
                  </Link>
                </td>

                {/* Customer */}
                <td className="px-4 py-3.5 min-w-[140px]">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate max-w-[140px]">
                    {order.customerName}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    {order.customerPhone}
                  </p>
                  {order.customerEmail && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 truncate max-w-[140px]">
                      {order.customerEmail}
                    </p>
                  )}
                </td>

                {/* Branch */}
                <td className="px-4 py-3.5 whitespace-nowrap">
                  <p className="text-sm text-slate-700 dark:text-slate-300">{order.branchName}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">{order.branchCity}</p>
                </td>

                {/* Items count */}
                <td className="px-4 py-3.5 text-center whitespace-nowrap">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {order.itemCount}
                  </span>
                </td>

                {/* Amount */}
                <td className="px-4 py-3.5 whitespace-nowrap">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {formatPrice(order.total)}
                  </p>
                  {order.transferCharge > 0 && (
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      incl. ₹{order.transferCharge} transfer
                    </p>
                  )}
                </td>

                {/* Status */}
                <td className="px-4 py-3.5 whitespace-nowrap">
                  <OrderStatusBadge status={order.status} />
                </td>

                {/* Date */}
                <td className="px-4 py-3.5 whitespace-nowrap">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {formatDateTime(order.createdAt)}
                  </p>
                </td>

                {/* View action */}
                <td className="px-4 py-3.5 whitespace-nowrap">
                  <Link href={`/admin/orders/${order.id}`}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                    View
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export { TableSkeleton as OrdersTableSkeleton }
