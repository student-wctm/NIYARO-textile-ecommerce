import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = { title: "Dashboard" }

const panels = [
  {
    href: "/staff/orders",
    icon: "📋",
    title: "Orders",
    description: "View, confirm, pack, and mark orders as ready for pickup.",
  },
  {
    href: "/staff/inventory",
    icon: "📦",
    title: "Inventory",
    description: "Check and update stock levels for your branch.",
  },
]

// TODO: Replace static cards with live order counts and low-stock alerts
// fetched from the database for the authenticated staff member's branch.
export default function StaffDashboardPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Branch Dashboard</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Authentication and branch assignment coming soon. This is the
          foundation scaffold.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {panels.map((panel) => (
          <Link
            key={panel.href}
            href={panel.href}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md hover:border-[var(--color-brand-100)] transition-all group"
          >
            <span className="text-3xl" aria-hidden="true">
              {panel.icon}
            </span>
            <h2 className="mt-4 text-base font-semibold text-gray-900 group-hover:text-[var(--color-brand-700)]">
              {panel.title}
            </h2>
            <p className="mt-1 text-sm text-gray-500">{panel.description}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
