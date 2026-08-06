import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = { title: "Dashboard" }

const panels = [
  {
    href: "/admin/branches",
    icon: "🏪",
    title: "Branches",
    description: "Add, edit, and manage store branches. Set transfer charges between branches.",
  },
  {
    href: "/admin/products",
    icon: "🧵",
    title: "Products & Catalogue",
    description: "Manage the centralised product catalogue, variants, categories, and images.",
  },
  {
    href: "/admin/inventory",
    icon: "📦",
    title: "Inventory",
    description: "View and adjust stock levels across all branches and variants.",
  },
  {
    href: "/admin/orders",
    icon: "📋",
    title: "Orders",
    description: "Monitor all orders across every branch. Override status and resolve issues.",
  },
  {
    href: "/admin/settings",
    icon: "⚙️",
    title: "Settings",
    description: "Configure global settings, default transfer charges, and system parameters.",
  },
]

// TODO: Replace with live stats (total orders, branches, revenue) fetched
// from the database once the business logic layer is implemented.
export default function AdminDashboardPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Super Admin Dashboard</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Authentication and role-based access control coming soon. This is the
          foundation scaffold.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {panels.map((panel) => (
          <Link
            key={panel.href}
            href={panel.href}
            className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md hover:border-slate-300 transition-all group"
          >
            <span className="text-3xl" aria-hidden="true">
              {panel.icon}
            </span>
            <h2 className="mt-4 text-base font-semibold text-slate-900 group-hover:text-[var(--color-brand-700)]">
              {panel.title}
            </h2>
            <p className="mt-1 text-sm text-slate-500">{panel.description}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
