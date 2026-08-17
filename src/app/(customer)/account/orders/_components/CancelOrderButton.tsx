"use client"

// CancelOrderButton
//
// Security:
//   - Only sends orderId to the server action — never customerId, inventoryId,
//     variantId, quantity, status, or any other sensitive value.
//   - The server action performs all ownership and status checks independently.
//   - Confirmation dialog prevents accidental cancellation.
//   - Button is disabled while pending to prevent duplicate submissions.

import { useTransition, useState } from "react"
import { cancelOrder } from "@/app/(customer)/account/orders/actions"

interface CancelOrderButtonProps {
  orderId: string
}

export function CancelOrderButton({ orderId }: CancelOrderButtonProps) {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  function handleCancel() {
    if (
      !window.confirm(
        "Are you sure you want to cancel this order?\n\n" +
        "This will release the reserved items back to stock. " +
        "This action cannot be undone."
      )
    ) {
      return
    }

    setResult(null)
    startTransition(async () => {
      const res = await cancelOrder(orderId)
      if (res.success) {
        setResult({ ok: true, message: "Your order has been cancelled." })
      } else {
        setResult({ ok: false, message: res.error ?? "Cancellation failed. Please try again." })
      }
    })
  }

  // Once cancelled successfully, show a permanent confirmation — the page
  // will re-render with the updated status on next navigation, but we also
  // surface immediate feedback so the customer isn't left wondering.
  if (result?.ok) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 flex items-center gap-2 text-sm text-green-800"
      >
        <svg
          className="h-4 w-4 shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        {result.message}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleCancel}
        disabled={isPending}
        className={[
          "inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          isPending
            ? "border-red-200 bg-red-50 text-red-600 cursor-wait"
            : "border-red-300 bg-white text-red-600 hover:bg-red-50 focus-visible:outline-red-500",
        ].join(" ")}
      >
        {isPending ? (
          <>
            <svg
              className="h-4 w-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Cancelling…
          </>
        ) : (
          <>
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            Cancel Order
          </>
        )}
      </button>

      {/* Error feedback — shown below the button */}
      {result && !result.ok && (
        <p
          role="alert"
          className="text-sm text-red-600 flex items-start gap-1.5"
        >
          <svg
            className="h-4 w-4 shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
          {result.message}
        </p>
      )}
    </div>
  )
}
