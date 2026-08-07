// KpiCard — metric card with icon, value, label and optional trend indicator.
// Works in both light and dark contexts (explicit bg classes used throughout).

interface KpiCardProps {
  label: string
  value: string
  icon: string
  trend?: number        // % change, positive = up, negative = down, undefined = no trend
  trendLabel?: string   // e.g. "vs yesterday"
  accent?: "brand" | "green" | "blue" | "amber" | "purple" | "rose"
}

const accentMap = {
  brand:  { bg: "bg-[var(--color-brand-50)] dark:bg-[var(--color-brand-900)]/20",  icon: "text-[var(--color-brand-600)]" },
  green:  { bg: "bg-green-50 dark:bg-green-900/20",   icon: "text-green-600 dark:text-green-400" },
  blue:   { bg: "bg-blue-50 dark:bg-blue-900/20",     icon: "text-blue-600 dark:text-blue-400" },
  amber:  { bg: "bg-amber-50 dark:bg-amber-900/20",   icon: "text-amber-600 dark:text-amber-400" },
  purple: { bg: "bg-purple-50 dark:bg-purple-900/20", icon: "text-purple-600 dark:text-purple-400" },
  rose:   { bg: "bg-rose-50 dark:bg-rose-900/20",     icon: "text-rose-600 dark:text-rose-400" },
}

export function KpiCard({ label, value, icon, trend, trendLabel = "vs yesterday", accent = "brand" }: KpiCardProps) {
  const { bg, icon: iconCls } = accentMap[accent]
  const trendUp   = trend !== undefined && trend > 0
  const trendDown = trend !== undefined && trend < 0

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        {/* Icon badge */}
        <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center text-xl shrink-0`}>
          <span aria-hidden="true">{icon}</span>
        </div>

        {/* Trend pill */}
        {trend !== undefined && (
          <span className={[
            "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold",
            trendUp   ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "",
            trendDown ? "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400" : "",
            !trendUp && !trendDown ? "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400" : "",
          ].join(" ")}>
            {trendUp && "↑"}
            {trendDown && "↓"}
            {Math.abs(trend)}%
          </span>
        )}
      </div>

      <div>
        <p className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{value}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{label}</p>
        {trend !== undefined && (
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{trendLabel}</p>
        )}
      </div>
    </div>
  )
}
