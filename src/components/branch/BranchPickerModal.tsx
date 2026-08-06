"use client"

import { useTransition, useEffect, useRef, useCallback } from "react"
import { selectBranch } from "@/app/(customer)/branches/actions"
import type { BranchSummary } from "@/lib/branches"
import type { SelectedBranch } from "@/types/branch"

interface BranchPickerModalProps {
  branches: BranchSummary[]
  currentBranchId: string | null
  isOpen: boolean
  onClose: () => void
}

export function BranchPickerModal({
  branches,
  currentBranchId,
  isOpen,
  onClose,
}: BranchPickerModalProps) {
  const [isPending, startTransition] = useTransition()
  const dialogRef = useRef<HTMLDialogElement>(null)

  // Sync open/close with the native <dialog> element
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (isOpen) {
      if (!dialog.open) dialog.showModal()
    } else {
      if (dialog.open) dialog.close()
    }
  }, [isOpen])

  // Close on native dialog cancel (Escape key)
  const handleCancel = useCallback(
    (e: Event) => {
      e.preventDefault() // prevent default close so we control it
      onClose()
    },
    [onClose]
  )

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    dialog.addEventListener("cancel", handleCancel)
    return () => dialog.removeEventListener("cancel", handleCancel)
  }, [handleCancel])

  // Close when clicking the backdrop (outside the dialog box)
  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    const rect = dialogRef.current?.getBoundingClientRect()
    if (!rect) return
    const outside =
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    if (outside) onClose()
  }

  function handleSelect(branch: BranchSummary) {
    const payload: SelectedBranch = {
      id: branch.id,
      name: branch.name,
      slug: branch.slug,
      city: branch.city,
    }
    startTransition(async () => {
      await selectBranch(payload)
      onClose()
    })
  }

  return (
    // backdrop:bg-black/50 styles the native ::backdrop pseudo-element
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      className="w-full max-w-md rounded-xl shadow-2xl p-0 backdrop:bg-black/50 bg-white"
      aria-labelledby="branch-picker-title"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2
          id="branch-picker-title"
          className="text-base font-semibold text-gray-900"
        >
          Choose Your Branch
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close branch picker"
          className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Branch list */}
      <div className="overflow-y-auto max-h-[60vh]">
        {branches.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-3xl mb-3" aria-hidden="true">🏪</p>
            <p className="text-sm font-medium text-gray-700 mb-1">
              No branches available
            </p>
            <p className="text-xs text-gray-400">Please check back soon.</p>
          </div>
        ) : (
          <ul role="list" className="divide-y divide-gray-100">
            {branches.map((branch) => {
              const isCurrent = branch.id === currentBranchId
              return (
                <li key={branch.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(branch)}
                    disabled={isPending}
                    aria-current={isCurrent ? "true" : undefined}
                    className={`w-full text-left px-5 py-4 flex items-start gap-3 transition-colors disabled:opacity-50 disabled:cursor-wait ${
                      isCurrent
                        ? "bg-[var(--color-brand-50)]"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    {/* Location pin icon */}
                    <span
                      className={`mt-0.5 shrink-0 ${
                        isCurrent
                          ? "text-[var(--color-brand-600)]"
                          : "text-gray-300"
                      }`}
                      aria-hidden="true"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        fill={isCurrent ? "currentColor" : "none"}
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={isCurrent ? 0 : 1.5}
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
                    </span>

                    {/* Branch details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p
                          className={`text-sm font-semibold truncate ${
                            isCurrent
                              ? "text-[var(--color-brand-700)]"
                              : "text-gray-900"
                          }`}
                        >
                          {branch.name}
                        </p>
                        {isCurrent && (
                          <span className="shrink-0 inline-flex items-center rounded-full bg-[var(--color-brand-100)] px-2 py-0.5 text-xs font-medium text-[var(--color-brand-700)]">
                            Selected
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">
                        {branch.address}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {branch.city}, {branch.state} – {branch.pincode}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {branch.phone}
                      </p>
                    </div>

                    {/* Select chevron */}
                    {!isCurrent && (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 shrink-0 text-gray-300 mt-1"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M8.25 4.5l7.5 7.5-7.5 7.5"
                        />
                      </svg>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 rounded-b-xl">
        <p className="text-xs text-gray-400 text-center">
          Your selection is saved automatically. You can change it any time.
        </p>
      </div>
    </dialog>
  )
}
