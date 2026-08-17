// Notification panel — shows pending orders and low stock alerts.
// Rendered as a Server Component (receives plain data from the parent).

import Link from "next/link"

interface Notification {
  id: string
  type: "warning" | "info" | "danger"
  title: string
  body: string
  href: string
}

interface NotificationPanelProps {
  notifications: Notification[]
}

export type { Notification }

const typeStyles = {
  danger:  { bg: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",     dot: "bg-red-500",    text: "text-red-700 dark:text-red-400" },
  warning: { bg: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800", dot: "bg-amber-500",  text: "text-amber-700 dark:text-amber-400" },
  info:    { bg: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",  dot: "bg-blue-500",   text: "text-blue-700 dark:text-blue-400" },
}

export function NotificationPanel({ notifications }: NotificationPanelProps) {
  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-slate-400 dark:text-slate-500 gap-2">
        <span className="text-3xl" aria-hidden="true">🔔</span>
        <p className="text-sm">All clear — no alerts</p>
      </div>
    )
  }

  return (
    <ul className="space-y-2">
      {notifications.map((n) => {
        const s = typeStyles[n.type]
        return (
          <li key={n.id}>
            <Link
              href={n.href}
              className={`flex items-start gap-3 rounded-xl border p-3 transition-opacity hover:opacity-90 ${s.bg}`}
            >
              <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
              <div className="min-w-0 flex-1">
                <p className={`text-xs font-semibold ${s.text} truncate`}>{n.title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{n.body}</p>
              </div>
              <svg className="h-3.5 w-3.5 shrink-0 text-slate-400 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
