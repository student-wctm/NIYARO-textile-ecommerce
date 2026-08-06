import type { Metadata } from "next"

export const metadata: Metadata = { title: "Inventory" }

// TODO: Fetch inventory for this branch. Show availableStock, reservedStock,
// physicalStock per variant. Allow manual stock adjustments with audit log.
export default function StaffInventoryPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Branch Inventory</h1>
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
        <p className="text-lg font-medium mb-1">Inventory management</p>
        <p className="text-sm">Stock view per variant will appear here once implemented.</p>
      </div>
    </div>
  )
}
