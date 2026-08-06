// Server Component — fetches both the selected branch cookie AND the list of
// active branches from the DB here, then passes them down to the Client Component
// (BranchSelector). No DB access leaks to the client.

import Link from "next/link"
import { getSelectedBranchFromCookies } from "@/lib/branch-cookie"
import { getActiveBranches } from "@/lib/branches"
import { BranchSelector } from "@/components/branch/BranchSelector"
import { siteConfig } from "@/config/site"

export async function CustomerHeader() {
  // Run both fetches in parallel — neither depends on the other
  const [selectedBranch, activeBranches] = await Promise.all([
    getSelectedBranchFromCookies(),
    getActiveBranches(),
  ])

  return (
    // bg-white is explicit so the header is always light regardless of OS dark mode
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
                <Link
                  href="/products"
                  className="hover:text-[var(--color-brand-600)] transition-colors"
                >
                  Products
                </Link>
              </li>
              <li>
                <Link
                  href="/branches"
                  className="hover:text-[var(--color-brand-600)] transition-colors"
                >
                  Our Branches
                </Link>
              </li>
            </ul>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Cart icon — placeholder until cart feature is built */}
            <Link
              href="/cart"
              aria-label="Cart"
              className="relative p-2 text-gray-600 hover:text-[var(--color-brand-600)] transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
                />
              </svg>
            </Link>

            {/* Account — placeholder until auth is implemented */}
            <Link
              href="/account"
              aria-label="Account"
              className="p-2 text-gray-600 hover:text-[var(--color-brand-600)] transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}
