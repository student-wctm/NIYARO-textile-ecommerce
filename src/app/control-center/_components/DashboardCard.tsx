// Reusable card wrapper used by chart/table sections throughout the dashboard.

interface DashboardCardProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function DashboardCard({ title, subtitle, action, children, className = "" }: DashboardCardProps) {
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden ${className}`}>
      {/* Card header */}
      <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-slate-100 dark:border-slate-700/50">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
          {subtitle && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{subtitle}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {/* Card body */}
      <div className="px-5 py-4">{children}</div>
    </div>
  )
}
