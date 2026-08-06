import type { Metadata } from "next"

export const metadata: Metadata = { title: "Orders" }

// TODO: All orders across branches. Filter by branch, status, date range.
// Admin can override any status and cancel orders.
export default function AdminOrdersPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">All Orders</h1>
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">
        <p className="text-sm">Order management UI coming soon.</p>
      </div>
    </div>
  )
}
