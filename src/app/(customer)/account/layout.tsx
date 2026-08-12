import { redirect } from "next/navigation"
import Link from "next/link"
import { getSessionCustomer } from "@/lib/auth"
import { logout } from "@/app/(customer)/auth/actions"
import { siteConfig } from "@/config/site"

const navLinks = [
  { href: "/account",           label: "Overview",  icon: "🏠" },
  { href: "/account/orders",    label: "My Orders", icon: "📋" },
  { href: "/account/addresses", label: "Addresses", icon: "📍" },
  { href: "/account/profile",   label: "Profile",   icon: "👤" },
]

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const customer = await getSessionCustomer()
  if (!customer) redirect("/login")

  return (
    <div className="bg-white min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* Sidebar */}
          <aside className="lg:w-56 shrink-0">
            <div className="bg-gray-50 rounded-2xl border border-gray-200 p-5 space-y-4">
              {/* Customer info */}
              <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
                <div className="w-10 h-10 rounded-full bg-[var(--color-brand-600)] text-white flex items-center justify-center font-bold text-sm">
                  {customer.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{customer.name}</p>
                  <p className="text-xs text-gray-500 truncate">{customer.email}</p>
                </div>
              </div>

              {/* Nav */}
              <nav aria-label="Account navigation">
                <ul className="space-y-1">
                  {navLinks.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href}
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-white hover:text-[var(--color-brand-700)] transition-colors">
                        <span aria-hidden="true">{l.icon}</span>
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>

              {/* Logout */}
              <div className="pt-2 border-t border-gray-200">
                <form action={logout}>
                  <button type="submit"
                    className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
                    <span aria-hidden="true">🚪</span>
                    Sign Out
                  </button>
                </form>
              </div>
            </div>
          </aside>

          {/* Content */}
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  )
}
