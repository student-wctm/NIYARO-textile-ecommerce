// Control Center — Order Detail

import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { getOrderById } from "@/lib/orders"
import { formatPrice } from "@/lib/utils"
import { OrderStatusBadge } from "@/app/control-center/orders/_components/OrderStatusBadge"
import { OrderStatusChanger } from "@/app/control-center/orders/_components/OrderStatusChanger"

type PageProps = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const order = await getOrderById(id)
  return { title: order ? `Order ${order.orderNumber}` : "Order Not Found" }
}

export const dynamic = "force-dynamic"

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-700">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h2>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  )
}

function FieldRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-slate-50 dark:border-slate-700/40 last:border-0">
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400 shrink-0 min-w-[120px]">{label}</span>
      <span className="text-sm text-slate-800 dark:text-slate-200 text-right">{value}</span>
    </div>
  )
}

function formatDT(d: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(d)
}

export default async function OrderDetailPage({ params }: PageProps) {
  const { id } = await params
  const order = await getOrderById(id)
  if (!order) notFound()

  const attrs = (v: typeof order.items[0]["variant"]) =>
    [v.color, v.size, v.length].filter(Boolean).join(" · ") || "—"

  return (
    <div className="max-w-5xl space-y-6 pb-10">

      {/* ── Breadcrumb ── */}
      <nav aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-sm text-slate-400">
          <li><Link href="/control-center/orders" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Orders</Link></li>
          <li aria-hidden="true">/</li>
          <li className="font-mono text-slate-700 dark:text-slate-200 font-semibold">{order.orderNumber}</li>
        </ol>
      </nav>

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
            {order.orderNumber}
          </h1>
          <OrderStatusBadge status={order.status} />
        </div>
        <p className="text-sm text-slate-400 dark:text-slate-500">
          Placed {formatDT(order.createdAt)}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── LEFT: Order info + items ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Customer & branch */}
          <Section title="Customer Details">
            <FieldRow label="Customer Name"  value={order.customerName} />
            <FieldRow label="Phone"          value={order.customerPhone} />
            <FieldRow label="Email"          value={order.customerEmail ?? "—"} />
            <FieldRow label="Pickup Branch"  value={`${order.branch.name}, ${order.branch.city}`} />
            {order.fulfilmentBranchId && order.fulfilmentBranchId !== order.branchId && (
              <FieldRow label="Fulfilment Branch" value={order.fulfilmentBranchId} />
            )}
            {order.notes && <FieldRow label="Customer Notes" value={order.notes} />}
          </Section>

          {/* Order items */}
          <Section title={`Order Items (${order.items.length})`}>
            <div className="overflow-x-auto -mx-1">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700">
                    {["Product", "SKU", "Attributes", "Qty", "Unit Price", "Total"].map((h) => (
                      <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/30">
                  {order.items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[180px]">
                          {item.variant.product.name}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                          {item.variant.product.id.slice(0, 8)}…
                        </p>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {item.variant.sku}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-500 dark:text-slate-400">
                        {attrs(item.variant)}
                      </td>
                      <td className="px-3 py-2.5 text-center font-semibold text-slate-800 dark:text-slate-200">
                        {item.quantity}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-slate-700 dark:text-slate-300">
                        {formatPrice(item.unitPrice)}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap font-semibold text-slate-900 dark:text-white">
                        {formatPrice(item.totalPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="mt-4 space-y-1.5 border-t border-slate-100 dark:border-slate-700 pt-4">
              <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                <span>Subtotal</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              {order.transferCharge > 0 && (
                <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                  <span>Transfer Charge</span>
                  <span>{formatPrice(order.transferCharge)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-slate-900 dark:text-white border-t border-slate-100 dark:border-slate-700 pt-2 mt-2">
                <span>Total</span>
                <span>{formatPrice(order.total)}</span>
              </div>
            </div>
          </Section>

          {/* Status history */}
          {order.statusHistory.length > 0 && (
            <Section title="Status History">
              <ol className="relative space-y-0">
                {order.statusHistory.map((h, i) => (
                  <li key={h.id} className="flex gap-3 pb-4 last:pb-0">
                    <div className="flex flex-col items-center shrink-0">
                      <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-brand-500)] mt-0.5 shrink-0" />
                      {i < order.statusHistory.length - 1 && (
                        <div className="w-px flex-1 bg-slate-200 dark:bg-slate-700 mt-1" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pb-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <OrderStatusBadge status={h.status} />
                          {h.note && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{h.note}</p>
                          )}
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                            by {h.changedBy}
                          </p>
                        </div>
                        <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0 mt-0.5">
                          {formatDT(h.createdAt)}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </Section>
          )}
        </div>

        {/* ── RIGHT: Status changer + timestamps ── */}
        <div className="space-y-5">

          {/* Status management */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-700">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Manage Order</h2>
            </div>
            <div className="px-5 py-4">
              <OrderStatusChanger
                orderId={order.id}
                currentStatus={order.status}
                currentNotes={order.staffNotes}
              />
            </div>
          </div>

          {/* Order meta */}
          <Section title="Order Info">
            <FieldRow label="Order Number" value={<span className="font-mono text-xs">{order.orderNumber}</span>} />
            <FieldRow label="Created" value={formatDT(order.createdAt)} />
            <FieldRow label="Updated" value={formatDT(order.updatedAt)} />
            <FieldRow label="Branch" value={order.branch.name} />
          </Section>
        </div>
      </div>
    </div>
  )
}
