// Customer-facing Branches page.
// Fetches all active branches from the real database and renders them as cards.
// Each card has a "Select This Branch" button wired to the selectBranch Server Action.

import type { Metadata } from "next"
import { getActiveBranches } from "@/lib/branches"
import { getSelectedBranchFromCookies } from "@/lib/branch-cookie"
import { siteConfig } from "@/config/site"
import { BranchCard } from "./_components/BranchCard"

export const metadata: Metadata = {
  title: "Our Branches",
  description: `Find a ${siteConfig.name} branch near you and reserve items for pickup.`,
}

// Force dynamic — reads cookies and live DB data
export const dynamic = "force-dynamic"

export default async function BranchesPage() {
  const [branches, selectedBranch] = await Promise.all([
    getActiveBranches(),
    getSelectedBranchFromCookies(),
  ])

  return (
    <div className="bg-white min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        {/* ── Page header ── */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900">Our Branches</h1>
          <p className="mt-2 text-gray-500 max-w-xl">
            Browse and reserve items online, then collect at the branch most
            convenient for you.
          </p>
          {selectedBranch && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--color-brand-50)] px-4 py-1.5 text-sm text-[var(--color-brand-700)]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-2.079 3.218-4.402 3.218-6.853C19.5 6.161 15.976 2.25 12 2.25S4.5 6.161 4.5 11.474c0 2.451 1.274 4.774 3.218 6.853a19.58 19.58 0 002.683 2.282 16.975 16.975 0 001.144.742zM12 13.5a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z"
                  clipRule="evenodd"
                />
              </svg>
              <span>
                Your selected branch:{" "}
                <strong>{selectedBranch.name}</strong> ({selectedBranch.city})
              </span>
            </div>
          )}
        </div>

        {/* ── Branch cards ── */}
        {branches.length === 0 ? (
          <div className="rounded-xl border border-gray-200 py-20 text-center">
            <p className="text-4xl mb-4" aria-hidden="true">🏪</p>
            <p className="text-lg font-medium text-gray-700 mb-2">
              No branches open yet
            </p>
            <p className="text-sm text-gray-400">
              Check back soon — we&apos;re opening new locations.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {branches.map((branch) => (
              <BranchCard
                key={branch.id}
                branch={branch}
                isSelected={selectedBranch?.id === branch.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
