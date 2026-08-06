import type { Metadata } from "next"

export const metadata: Metadata = { title: "Orders" }

// TODO: Fetch orders for this branch. Allow filtering by status.
// Implement status transitions: CONFIRMED → PACKING → READY_FOR_PICKUP → COLLECTED.
export default function StaffOrdersPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Branch Orders</h1>
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
        <p className="text-lg font-medium mb-1">No orders yet</p>
        <p className="text-sm">Order management will appear here once implemented.</p>
      </div>
    </div>
  )
}
