import Link from "next/link"

const actions = [
  { href: "/admin/products/new",   icon: "🧵", label: "Add Product",       accent: "brand"  },
  { href: "/admin/categories/new", icon: "🗂️", label: "Add Category",      accent: "purple" },
  { href: "/admin/branches/new",   icon: "🏪", label: "Add Branch",        accent: "blue"   },
  { href: "/admin/inventory",      icon: "📦", label: "Manage Inventory",  accent: "amber"  },
  { href: "/admin/orders",         icon: "📋", label: "View Orders",       accent: "green"  },
] as const

const accentBg: Record<string, string> = {
  brand:  "bg-[var(--color-brand-50)] hover:bg-[var(--color-brand-100)] dark:bg-[var(--color-brand-900)]/20 dark:hover:bg-[var(--color-brand-900)]/30 text-[var(--color-brand-700)] dark:text-[var(--color-brand-300)]",
  purple: "bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/30 text-purple-700 dark:text-purple-300",
  blue:   "bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300",
  amber:  "bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:hover:bg-amber-900/30 text-amber-700 dark:text-amber-300",
  green:  "bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30 text-green-700 dark:text-green-300",
}

export function QuickActions() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {actions.map((a) => (
        <Link
          key={a.href}
          href={a.href}
          className={`flex flex-col items-center justify-center gap-2 rounded-xl p-4 text-center transition-colors ${accentBg[a.accent]}`}
        >
          <span className="text-2xl" aria-hidden="true">{a.icon}</span>
          <span className="text-xs font-semibold leading-tight">{a.label}</span>
        </Link>
      ))}
    </div>
  )
}
