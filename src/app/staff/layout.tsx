// Staff panel layout.
// Server Component: validates staff session and exposes branch identity.
// If session is invalid/expired, redirects to /staff/login.

import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { getSessionStaff } from "@/lib/staffAuth"
import { staffLogout } from "@/app/staff/login/actions"
import { siteConfig } from "@/config/site"

export const metadata: Metadata = {
  title: {
    template: `%s | ${siteConfig.staffPanelLabel}`,
    default: siteConfig.staffPanelLabel,
  },
}

const navItems = [
  { href: "/staff",           label: "Dashboard" },
  { href: "/staff/orders",    label: "Orders"    },
  { href: "/staff/inventory", label: "Inventory" },
]

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Full DB session validation — branchId comes from StaffMember, never from browser.
  const staff = await getSessionStaff()
  if (!staff) redirect("/staff/login")

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-gray-900 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-6">
              <Link href="/staff" className="text-sm font-bold text-white tracking-tight">
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

            {/* Staff identity: name + assigned branch */}
            <div className="flex items-center gap-3 text-sm text-gray-400">
              <span className="hidden sm:block">
                {staff.name} &mdash; <span className="text-gray-300 font-medium">{staff.branch.name}</span>
              </span>
              <Link href="/" className="text-gray-400 hover:text-white transition-colors">
                ← Store
              </Link>
              <form action={staffLogout}>
                <button
                  type="submit"
                  className="text-gray-400 hover:text-red-400 transition-colors px-2 py-1"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
