"use client"

// DateRangeFilter — pushes a `range` URL param so the dashboard
// Server Component re-fetches with the correct date window.
// Import only from @/lib/dashboard is safe: DateRange is a plain string union
// with zero server/Prisma dependencies.

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useTransition } from "react"
import type { DateRange } from "@/lib/dashboard"

interface Option { value: DateRange; label: string }

const OPTIONS: Option[] = [
  { value: "today",     label: "Today"        },
  { value: "yesterday", label: "Yesterday"    },
  { value: "last7",     label: "Last 7 Days"  },
  { value: "last30",    label: "Last 30 Days" },
  { value: "thisMonth", label: "This Month"   },
  { value: "allTime",   label: "All Time"     },
]

interface DateRangeFilterProps {
  current: DateRange
}

export function DateRangeFilter({ current }: DateRangeFilterProps) {
  const router   = useRouter()
  const pathname = usePathname()
  const params   = useSearchParams()
  const [isPending, startTransition] = useTransition()

  function handleChange(value: DateRange) {
    const next = new URLSearchParams(params.toString())
    if (value === "last7") {
      next.delete("range")          // default — keep URL clean
    } else {
      next.set("range", value)
    }
    startTransition(() => router.push(`${pathname}?${next.toString()}`))
  }

  return (
    <div
      role="group"
      aria-label="Dashboard date range"
      className={`flex items-center gap-1 flex-wrap transition-opacity ${isPending ? "opacity-60 pointer-events-none" : ""}`}
    >
      {OPTIONS.map((opt) => {
        const isActive = opt.value === current
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => handleChange(opt.value)}
            aria-pressed={isActive}
            className={[
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1",
              isActive
                ? "bg-[var(--color-brand-600)] text-white shadow-sm"
                : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700",
            ].join(" ")}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
