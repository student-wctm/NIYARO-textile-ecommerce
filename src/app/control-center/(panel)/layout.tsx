// Control Center layout.
// Server Component: validates admin session on every request.
// If session is invalid/expired, redirects to /control-center/login.

import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { getSessionAdmin } from "@/lib/adminAuth"
import { adminLogout } from "@/app/control-center/login/actions"
import { siteConfig } from "@/config/site"

export const metadata: Metadata = {
  title: {
    template: `%s | ${siteConfig.adminPanelLabel}`,
    default: siteConfig.adminPanelLabel,
  },
}

const navItems = [
  { href: "/control-center",            label: "Dashboard" },
  { href: "/control-center/branches",   label: "Branches"  },
  { href: "/control-center/categories", label: "Categories"},
  { href: "/control-center/products",   label: "Products"  },
  { href: "/control-center/inventory",  label: "Inventory" },
  { href: "/control-center/orders",     label: "Orders"    },
  { href: "/control-center/settings",   label: "Settings"  },
]

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Full DB session validation — layout is the primary auth gate for all /control-center pages.
  const admin = await getSessionAdmin()
  if (!admin) redirect("/control-center/login")

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
      <header className="bg-slate-900 text-white sticky top-0 z-40">
        <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-6">
              <Link href="/control-center" className="text-sm font-bold text-white tracking-tight">
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

            {/* Admin identity + logout */}
            <div className="flex items-center gap-3">
              <span className="hidden sm:block text-sm text-slate-400 truncate max-w-[160px]">
                {admin.name}
              </span>
              <Link href="/" className="text-sm text-slate-400 hover:text-white transition-colors">
                ← Store
              </Link>
              <form action={adminLogout}>
                <button
                  type="submit"
                  className="text-sm text-slate-400 hover:text-red-400 transition-colors px-2 py-1"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8 py-8 dark:text-slate-100">
        {children}
      </main>
    </div>
  )
}
