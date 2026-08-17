import { formatPrice } from "@/lib/utils"
import type { OrderStats } from "@/lib/ordersMeta"

function Card({ label, value, icon, cls, sub }: {
  label: string; value: string; icon: string; cls: string; sub?: string
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 ${cls}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export function OrderKpiRow({ stats }: { stats: OrderStats }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      <Card label="Total Orders"    value={stats.total.toString()}              icon="📋" cls="bg-slate-100 dark:bg-slate-700/60" />
      <Card label="Pending"         value={stats.pending.toString()}             icon="⏳" cls="bg-yellow-50 dark:bg-yellow-900/20" />
      <Card label="Packing"         value={stats.packing.toString()}             icon="📦" cls="bg-indigo-50 dark:bg-indigo-900/20" />
      <Card label="Ready for Pickup" value={stats.ready.toString()}             icon="✅" cls="bg-green-50 dark:bg-green-900/20" />
      <Card label="Cancelled"       value={stats.cancelled.toString()}          icon="🚫" cls="bg-red-50 dark:bg-red-900/20" />
      <Card label="Today's Revenue" value={formatPrice(stats.todayRevenue)}     icon="💰" cls="bg-[var(--color-brand-50)] dark:bg-[var(--color-brand-900)]/20" />
    </div>
  )
}
