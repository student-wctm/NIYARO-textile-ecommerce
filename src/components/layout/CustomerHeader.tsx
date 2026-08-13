// Server Component — all auth, branch, and session data fetched server-side.
// Nothing sensitive (session token, passwordHash, etc.) is passed to the client.

import Link from "next/link"
import { getSelectedBranchFromCookies } from "@/lib/branch-cookie"
import { getActiveBranches } from "@/lib/branches"
import { getSessionCustomer } from "@/lib/auth"
import { BranchSelector } from "@/components/branch/BranchSelector"
import { siteConfig } from "@/config/site"
import { logout } from "@/app/(customer)/auth/actions"
import { cookies } from "next/headers"
import {
  CART_COOKIE,
  getGuestCartItemCount,
  getCustomerCartItemCount,
} from "@/lib/cart"

export async function CustomerHeader() {
  const cookieStore = await cookies()

  const [selectedBranch, activeBranches, customer] = await Promise.all([
    getSelectedBranchFromCookies(),
    getActiveBranches(),
    getSessionCustomer(),
  ])

  // Cart count — resolved server-side, never exposing tokens to client
  let cartCount = 0
  if (customer) {
    cartCount = await getCustomerCartItemCount(customer.id)
  } else {
    const guestToken = cookieStore.get(CART_COOKIE)?.value
    if (guestToken) cartCount = await getGuestCartItemCount(guestToken)
  }

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
      {/* Top bar — branch selector */}
      <div className="bg-[var(--color-brand-700)] text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-9 text-sm">
            <span className="text-white/80 hidden sm:block">
              Reserve online. Pick up from your nearest branch.
            </span>
            <BranchSelector
              selectedBranch={selectedBranch}
              activeBranches={activeBranches}
            />
          </div>
        </div>
      </div>

      {/* Main nav */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 text-[var(--color-brand-700)] font-bold text-xl tracking-tight"
          >
            <span className="sr-only">{siteConfig.name} home</span>
            <span aria-hidden="true">{siteConfig.logoIcon}</span>
            <span>{siteConfig.name}</span>
          </Link>

          {/* Primary navigation */}
          <nav aria-label="Primary navigation">
            <ul className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-700">
              <li>
                <Link href="/products" className="hover:text-[var(--color-brand-600)] transition-colors">
                  Products
                </Link>
              </li>
              <li>
                <Link href="/branches" className="hover:text-[var(--color-brand-600)] transition-colors">
                  Our Branches
                </Link>
              </li>
            </ul>
          </nav>

          {/* Actions — auth-aware */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Cart with live count badge */}
            <Link
              href="/cart"
              aria-label={`Cart${cartCount > 0 ? `, ${cartCount} items` : ""}`}
              className="relative p-2 text-gray-600 hover:text-[var(--color-brand-600)] transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24"
                stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
              </svg>
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-brand-600)] text-[10px] font-bold text-white">
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </Link>

            {/* Auth-aware account area */}
            {customer ? (
              /* ── Logged in ── */
              <div className="hidden md:flex items-center gap-1">
                {/* My Orders */}
                <Link
                  href="/account/orders"
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-[var(--color-brand-600)] transition-colors"
                >
                  Orders
                </Link>
                {/* Account */}
                <Link
                  href="/account"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-[var(--color-brand-600)] transition-colors"
                >
                  <span className="w-7 h-7 rounded-full bg-[var(--color-brand-600)] text-white text-xs font-bold flex items-center justify-center">
                    {customer.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="hidden lg:inline truncate max-w-[80px]">{customer.name.split(" ")[0]}</span>
                </Link>
                {/* Logout */}
                <form action={logout}>
                  <button
                    type="submit"
                    className="px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-red-600 transition-colors"
                    aria-label="Sign out"
                  >
                    Sign out
                  </button>
                </form>
              </div>
            ) : (
              /* ── Logged out ── */
              <div className="hidden md:flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-[var(--color-brand-600)] transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center rounded-lg bg-[var(--color-brand-600)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--color-brand-700)] transition-colors"
                >
                  Register
                </Link>
              </div>
            )}

            {/* Mobile — account icon (always show, leads to /account or /login) */}
            <Link
              href={customer ? "/account" : "/login"}
              aria-label={customer ? "My account" : "Sign in"}
              className="md:hidden p-2 text-gray-600 hover:text-[var(--color-brand-600)] transition-colors"
            >
              {customer ? (
                <span className="w-7 h-7 rounded-full bg-[var(--color-brand-600)] text-white text-xs font-bold flex items-center justify-center">
                  {customer.name.slice(0, 1).toUpperCase()}
                </span>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              )}
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}
