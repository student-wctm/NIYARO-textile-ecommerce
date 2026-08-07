// Super Admin panel layout.
// Lives at /admin — completely separate from staff and customer modules.
// This layout will eventually be protected by role-based middleware.

import type { Metadata } from "next"
import Link from "next/link"
import { siteConfig } from "@/config/site"

export const metadata: Metadata = {
  title: {
    template: `%s | ${siteConfig.adminPanelLabel}`,
    default: siteConfig.adminPanelLabel,
  },
}

const navItems = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/branches", label: "Branches" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/inventory", label: "Inventory" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/settings", label: "Settings" },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
      {/* Admin top bar */}
      <header className="bg-slate-900 text-white sticky top-0 z-40">
        <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-6">
              <Link
                href="/admin"
                className="text-sm font-bold text-white tracking-tight"
              >
                ⚙️ {siteConfig.adminPanelLabel}
              </Link>
              <nav aria-label="Admin navigation">
                <ul className="hidden md:flex items-center gap-4">
                  {navItems.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="text-sm text-slate-300 hover:text-white transition-colors"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
            <Link
              href="/"
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              ← Store
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8 py-8 dark:text-slate-100">
        {children}
      </main>
    </div>
  )
}
