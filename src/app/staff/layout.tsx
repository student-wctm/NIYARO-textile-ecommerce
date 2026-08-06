// Staff panel layout.
// Lives at /staff — separate from the (customer) route group so it gets its
// own header, sidebar, and authentication middleware (added later).

import type { Metadata } from "next"
import Link from "next/link"
import { siteConfig } from "@/config/site"

export const metadata: Metadata = {
  title: {
    template: `%s | ${siteConfig.staffPanelLabel}`,
    default: siteConfig.staffPanelLabel,
  },
}

const navItems = [
  { href: "/staff", label: "Dashboard" },
  { href: "/staff/orders", label: "Orders" },
  { href: "/staff/inventory", label: "Inventory" },
]

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Staff top bar */}
      <header className="bg-gray-900 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-6">
              <Link
                href="/staff"
                className="text-sm font-bold text-white tracking-tight"
              >
                {siteConfig.logoIcon} {siteConfig.staffPanelLabel}
              </Link>
              <nav aria-label="Staff navigation">
                <ul className="hidden sm:flex items-center gap-4">
                  {navItems.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="text-sm text-gray-300 hover:text-white transition-colors"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-400">
              {/* Branch name will be shown here once auth is implemented */}
              <span>Branch: —</span>
              <Link
                href="/"
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Back to store"
              >
                ← Store
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
