// Server Component — receives pre-fetched stats, renders four KPI cards.
import type { InventoryStats } from "@/lib/inventory"

interface KpiProps { label: string; value: number; icon: string; cls: string; sub?: string }

function Card({ label, value, icon, cls, sub }: KpiProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 ${cls}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-slate-900 dark:text-white">{value.toLocaleString("en-IN")}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export function InventoryKpiRow({ stats }: { stats: InventoryStats }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Card label="Total SKU–Branch records" value={stats.totalSKUs} icon="📦"
        cls="bg-slate-100 dark:bg-slate-700/60" />
      <Card label="In Stock" value={stats.inStock} icon="✅"
        cls="bg-green-50 dark:bg-green-900/20" sub="Available > threshold" />
      <Card label="Low Stock" value={stats.lowStock} icon="⚠️"
        cls="bg-amber-50 dark:bg-amber-900/20" sub="At or below threshold" />
      <Card label="Out of Stock" value={stats.outOfStock} icon="🚫"
        cls="bg-red-50 dark:bg-red-900/20" sub="Zero available" />
    </div>
  )
}
