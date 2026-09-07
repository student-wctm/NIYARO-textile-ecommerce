"use client"

import { useState, useCallback } from "react"

interface ProductHighlightsProps {
  highlights:         Array<{ label: string; value: string }>
  additionalDetails:  string | null
  careInstructions:   string | null
}

export function ProductHighlights({
  highlights,
  additionalDetails,
  careInstructions,
}: ProductHighlightsProps) {
  const [expanded, setExpanded]   = useState(false)
  const [copied,   setCopied]     = useState(false)

  const hasExtras = !!(additionalDetails || careInstructions)

  // Build copyable text from highlights + extras
  const buildCopyText = useCallback(() => {
    const lines: string[] = []
    if (highlights.length > 0) {
      lines.push("Product Highlights")
      highlights.forEach((h) => lines.push(`${h.label}: ${h.value}`))
    }
    if (additionalDetails) {
      lines.push("", "Additional Details", additionalDetails)
    }
    if (careInstructions) {
      lines.push("", "Care Instructions", careInstructions)
    }
    return lines.join("\n")
  }, [highlights, additionalDetails, careInstructions])

  async function handleCopy() {
    const text = buildCopyText()
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        // Graceful fallback: execCommand (deprecated but supported)
        const ta = document.createElement("textarea")
        ta.value = text
        ta.style.position = "fixed"
        ta.style.opacity = "0"
        document.body.appendChild(ta)
        ta.focus(); ta.select()
        document.execCommand("copy")
        document.body.removeChild(ta)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard unavailable — silently do nothing
    }
  }

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-800">Product Highlights</h2>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-gray-500 border border-gray-200 bg-white hover:bg-gray-50 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-brand-500)]"
          aria-label="Copy product highlights to clipboard"
        >
          {copied ? (
            <>
              <svg className="h-3.5 w-3.5 text-green-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              <span className="text-green-600">Copied!</span>
            </>
          ) : (
            <>
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
              </svg>
              COPY
            </>
          )}
        </button>
      </div>

      {/* Highlights table */}
      {highlights.length > 0 && (
        <div className="divide-y divide-gray-50">
          {highlights.map((h) => (
            <div key={h.label} className="flex px-4 py-2.5">
              <span className="w-32 shrink-0 text-xs font-medium text-gray-500">{h.label}</span>
              <span className="text-xs text-gray-800 leading-relaxed">{h.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Additional details — expand/collapse */}
      {hasExtras && (
        <div className="border-t border-gray-100">
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            aria-expanded={expanded}
          >
            <span>Additional Details</span>
            <svg
              className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
              fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
          {expanded && (
            <div className="px-4 pb-4 space-y-3">
              {additionalDetails && (
                <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line">{additionalDetails}</p>
              )}
              {careInstructions && (
                <div>
                  <p className="text-xs font-medium text-gray-700 mb-1">Care Instructions</p>
                  <p className="text-xs text-gray-500 leading-relaxed">{careInstructions}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
