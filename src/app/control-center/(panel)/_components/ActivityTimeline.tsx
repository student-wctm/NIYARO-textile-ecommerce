import type { ActivityEvent } from "@/lib/dashboard"

const icons: Record<ActivityEvent["type"], string> = {
  order_placed:  "🛍️",
  order_status:  "📦",
  product_added: "🧵",
  branch_added:  "🏪",
}

const dotColors: Record<ActivityEvent["type"], string> = {
  order_placed:  "bg-blue-500",
  order_status:  "bg-green-500",
  product_added: "bg-[var(--color-brand-500)]",
  branch_added:  "bg-purple-500",
}

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins  <  1) return "just now"
  if (mins  < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

export function ActivityTimeline({ events }: { events: ActivityEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-500">
        <span className="text-3xl mb-2" aria-hidden="true">📅</span>
        <p className="text-sm">No recent activity</p>
      </div>
    )
  }

  return (
    <ol className="relative space-y-0" aria-label="Recent activity timeline">
      {events.map((event, i) => (
        <li key={event.id} className="flex gap-3 pb-4 last:pb-0">
          {/* Timeline connector */}
          <div className="flex flex-col items-center shrink-0">
            <div className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${dotColors[event.type]}`} />
            {i < events.length - 1 && (
              <div className="w-px flex-1 bg-slate-200 dark:bg-slate-700 mt-1" />
            )}
          </div>
          {/* Content */}
          <div className="pb-1 min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  <span className="mr-1" aria-hidden="true">{icons[event.type]}</span>
                  {event.title}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  {event.subtitle}
                </p>
              </div>
              <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0 mt-0.5">
                {timeAgo(event.time)}
              </span>
            </div>
          </div>
        </li>
      ))}
    </ol>
  )
}
