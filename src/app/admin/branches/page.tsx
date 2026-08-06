// =============================================================================
// Admin — Branch Management
//
// SECURITY TODO: This page has NO authentication or authorization yet.
// Add admin session verification before going to production.
// =============================================================================

import type { Metadata } from "next"
import Link from "next/link"
import { getAllBranches } from "@/lib/branches"
import { BranchTable } from "./_components/BranchTable"

export const metadata: Metadata = { title: "Branches" }

// Force dynamic rendering — branch list changes after mutations
export const dynamic = "force-dynamic"

export default async function AdminBranchesPage() {
  const branches = await getAllBranches()

  const activeCount = branches.filter((b) => b.isActive).length
  const inactiveCount = branches.length - activeCount

  return (
    <div>
      {/* ── Page header ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Branches</h1>
          {branches.length > 0 && (
            <p className="text-sm text-slate-500 mt-1">
              {branches.length} total &middot;{" "}
              <span className="text-green-700">{activeCount} active</span>
              {inactiveCount > 0 && (
                <>, <span className="text-slate-400">{inactiveCount} inactive</span></>
              )}
            </p>
          )}
        </div>

        <Link
          href="/admin/branches/new"
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-brand-600)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-700)] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand-600)] self-start sm:self-auto"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Branch
        </Link>
      </div>

      {/* ── Branch table ─────────────────────────────────────── */}
      <BranchTable branches={branches} />

      {/* ── Footer note ──────────────────────────────────────── */}
      {branches.length > 0 && (
        <p className="mt-4 text-xs text-slate-400">
          Branches cannot be permanently deleted once inventory or orders are
          associated with them. Use Deactivate to hide a branch from customers.
        </p>
      )}
    </div>
  )
}
