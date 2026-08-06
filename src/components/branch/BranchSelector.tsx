"use client"

// BranchSelector is a Client Component because it owns the modal open/close state.
// activeBranches and selectedBranch are passed in from the parent Server Component
// (CustomerHeader) — all DB access happens server-side, never here.

import { useState } from "react"
import { BranchPickerModal } from "@/components/branch/BranchPickerModal"
import type { SelectedBranch } from "@/types/branch"
import type { BranchSummary } from "@/lib/branches"

interface BranchSelectorProps {
  selectedBranch: SelectedBranch | null
  activeBranches: BranchSummary[]
}

export function BranchSelector({
  selectedBranch,
  activeBranches,
}: BranchSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Trigger button — lives in the top bar */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={
          selectedBranch
            ? `Current branch: ${selectedBranch.name}. Click to change.`
            : "Select a branch"
        }
        aria-haspopup="dialog"
        className="flex items-center gap-1.5 text-sm text-white/90 hover:text-white transition-colors py-1 px-2 rounded"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
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
          {selectedBranch ? (
            <>
              <span className="font-medium">{selectedBranch.name}</span>
              <span className="text-white/60 ml-1">({selectedBranch.city})</span>
            </>
          ) : (
            <span className="font-medium">Select Branch</span>
          )}
        </span>

        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-3.5 w-3.5 text-white/60"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Modal — rendered in the same Client Component tree so it has access
          to setIsOpen, but the <dialog> element itself is appended via the
          browser's native dialog API and does not cause layout shift */}
      <BranchPickerModal
        branches={activeBranches}
        currentBranchId={selectedBranch?.id ?? null}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  )
}
