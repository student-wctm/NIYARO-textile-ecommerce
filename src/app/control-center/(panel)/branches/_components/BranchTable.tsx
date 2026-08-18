"use client"

import { useTransition } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/Badge"
import { toggleBranchStatus } from "@/app/control-center/(panel)/branches/actions"
import type { Branch } from "@/lib/branches"

interface BranchTableProps {
  branches: Branch[]
}

export function BranchTable({ branches }: BranchTableProps) {
  if (branches.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 py-16 text-center">
        <p className="text-3xl mb-3" aria-hidden="true">🏪</p>
        <p className="text-slate-700 font-medium mb-1">No branches yet</p>
        <p className="text-sm text-slate-400">
          Click "Add Branch" to create your first branch.
        </p>
      </div>
    )
  }

  return (
    /* Outer wrapper scrolls horizontally on small screens */
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50">
            <tr>
              {[
                "Branch",
                "Location",
                "Contact",
                "Status",
                "Actions",
              ].map((heading) => (
                <th
                  key={heading}
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {branches.map((branch) => (
              <BranchRow key={branch.id} branch={branch} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Individual row — isolated so its own useTransition doesn't block siblings

function BranchRow({ branch }: { branch: Branch }) {
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    startTransition(async () => {
      await toggleBranchStatus(branch.id, branch.isActive)
    })
  }

  return (
    <tr
      className={`transition-opacity ${isPending ? "opacity-50" : "hover:bg-slate-50"}`}
    >
      {/* Branch name + slug */}
      <td className="px-4 py-3">
        <p className="text-sm font-semibold text-slate-900">{branch.name}</p>
        <p className="text-xs text-slate-400 font-mono mt-0.5">{branch.slug}</p>
      </td>

      {/* Location */}
      <td className="px-4 py-3">
        <p className="text-sm text-slate-700">{branch.city}, {branch.state}</p>
        <p className="text-xs text-slate-400 mt-0.5 max-w-xs truncate">{branch.address}</p>
        <p className="text-xs text-slate-400">{branch.pincode}</p>
      </td>

      {/* Contact */}
      <td className="px-4 py-3">
        <p className="text-sm text-slate-700">{branch.phone}</p>
        {branch.email && (
          <p className="text-xs text-slate-400 mt-0.5">{branch.email}</p>
        )}
      </td>

      {/* Status badge */}
      <td className="px-4 py-3 whitespace-nowrap">
        <Badge variant={branch.isActive ? "success" : "default"}>
          {branch.isActive ? "Active" : "Inactive"}
        </Badge>
      </td>

      {/* Actions */}
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex items-center gap-2">
          {/* Edit */}
          <Link
            href={`/control-center/branches/${branch.id}/edit`}
            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-slate-400"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
            </svg>
            Edit
          </Link>

          {/* Toggle active/inactive */}
          <button
            type="button"
            onClick={handleToggle}
            disabled={isPending}
            aria-label={branch.isActive ? `Deactivate ${branch.name}` : `Activate ${branch.name}`}
            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 disabled:opacity-50 disabled:cursor-not-allowed ${
              branch.isActive
                ? "text-amber-700 border-amber-200 bg-amber-50 hover:bg-amber-100 focus-visible:outline-amber-400"
                : "text-green-700 border-green-200 bg-green-50 hover:bg-green-100 focus-visible:outline-green-400"
            }`}
          >
            {branch.isActive ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
                Deactivate
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Activate
              </>
            )}
          </button>
        </div>
      </td>
    </tr>
  )
}
