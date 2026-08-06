import type { Metadata } from "next"

export const metadata: Metadata = { title: "Inventory" }

// TODO: Cross-branch inventory matrix. Filter by product/variant/branch.
// Bulk stock adjustment with reason field for audit trail.
export default function AdminInventoryPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Inventory (All Branches)</h1>
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">
        <p className="text-sm">Cross-branch inventory view coming soon.</p>
      </div>
    </div>
  )
}
