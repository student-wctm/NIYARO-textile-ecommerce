"use client"

import { useTransition } from "react"
import { selectBranch } from "@/app/(customer)/branches/actions"
import type { BranchSummary } from "@/lib/branches"
import type { SelectedBranch } from "@/types/branch"

interface BranchCardProps {
  branch: BranchSummary
  isSelected: boolean
}

export function BranchCard({ branch, isSelected }: BranchCardProps) {
  const [isPending, startTransition] = useTransition()

  function handleSelect() {
    const payload: SelectedBranch = {
      id: branch.id,
      name: branch.name,
      slug: branch.slug,
      city: branch.city,
    }
    startTransition(async () => {
      await selectBranch(payload)
    })
  }

  return (
    <div
      className={`rounded-xl border p-5 flex flex-col gap-4 transition-shadow ${
        isSelected
          ? "border-[var(--color-brand-500)] bg-[var(--color-brand-50)] shadow-sm"
          : "border-gray-200 bg-white hover:shadow-md"
      }`}
    >
      {/* Branch name + selected badge */}
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-base font-semibold text-gray-900 leading-tight">
          {branch.name}
        </h2>
        {isSelected && (
          <span className="shrink-0 inline-flex items-center rounded-full bg-[var(--color-brand-600)] px-2.5 py-0.5 text-xs font-medium text-white">
            Selected
          </span>
        )}
      </div>

      {/* Details */}
      <div className="space-y-1.5 text-sm text-gray-600 flex-1">
        <div className="flex items-start gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 shrink-0 text-gray-400 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
            />
          </svg>
          <span>
            {branch.address}, {branch.city}, {branch.state} – {branch.pincode}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 shrink-0 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"
            />
          </svg>
          <a
            href={`tel:${branch.phone}`}
            className="hover:text-[var(--color-brand-600)] transition-colors"
          >
            {branch.phone}
          </a>
        </div>
      </div>

      {/* Action button */}
      {isSelected ? (
        <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-brand-700)]">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          This is your branch
        </div>
      ) : (
        <button
          type="button"
          onClick={handleSelect}
          disabled={isPending}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-brand-600)] px-4 py-2 text-sm font-medium text-[var(--color-brand-700)] hover:bg-[var(--color-brand-50)] transition-colors disabled:opacity-50 disabled:cursor-wait focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand-500)]"
        >
          {isPending ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Selecting…
            </>
          ) : (
            "Select This Branch"
          )}
        </button>
      )}
    </div>
  )
}
