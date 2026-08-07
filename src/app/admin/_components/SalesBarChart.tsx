// Pure SVG bar chart — no charting library needed.
// Renders daily sales as vertical bars with value labels and axis.

import type { DailySalesPoint } from "@/lib/dashboard"

interface SalesBarChartProps {
  data: DailySalesPoint[]
}

const W = 560
const H = 200
const PAD = { top: 20, right: 16, bottom: 36, left: 60 }
const CHART_W = W - PAD.left - PAD.right
const CHART_H = H - PAD.top  - PAD.bottom

function formatK(n: number): string {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000)   return `₹${(n / 1000).toFixed(1)}k`
  return `₹${n}`
}

export function SalesBarChart({ data }: SalesBarChartProps) {
  if (data.length === 0) {
    return <EmptyChart label="No sales data yet" />
  }

  const maxRev  = Math.max(...data.map((d) => d.revenue), 1)
  const barW    = CHART_W / data.length
  const barPad  = barW * 0.25
  const innerW  = barW - barPad * 2

  // Y-axis grid lines
  const ticks = [0, 0.25, 0.5, 0.75, 1.0].map((r) => ({
    y:     PAD.top + CHART_H * (1 - r),
    label: formatK(maxRev * r),
  }))

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Daily sales bar chart"
      className="w-full h-auto"
    >
      {/* Grid lines */}
      {ticks.map((t) => (
        <g key={t.y}>
          <line
            x1={PAD.left} y1={t.y} x2={PAD.left + CHART_W} y2={t.y}
            stroke="currentColor" strokeOpacity={0.08} strokeWidth={1}
            className="text-slate-900 dark:text-white"
          />
          <text
            x={PAD.left - 6} y={t.y + 4}
            textAnchor="end" fontSize={9}
            className="fill-slate-400 dark:fill-slate-500"
          >
            {t.label}
          </text>
        </g>
      ))}

      {/* Bars */}
      {data.map((d, i) => {
        const barH  = CHART_H * (d.revenue / maxRev)
        const x     = PAD.left + i * barW + barPad
        const y     = PAD.top  + CHART_H - barH
        const isEmpty = d.revenue === 0

        return (
          <g key={d.date}>
            {/* Bar */}
            <rect
              x={x} y={isEmpty ? y - 2 : y}
              width={innerW}
              height={isEmpty ? 2 : barH}
              rx={3}
              className="fill-[var(--color-brand-500)] dark:fill-[var(--color-brand-400)]"
              opacity={0.85}
            />
            {/* Value label */}
            {!isEmpty && (
              <text
                x={x + innerW / 2} y={y - 5}
                textAnchor="middle" fontSize={8}
                className="fill-slate-500 dark:fill-slate-400"
              >
                {formatK(d.revenue)}
              </text>
            )}
            {/* X label */}
            <text
              x={x + innerW / 2} y={H - PAD.bottom + 14}
              textAnchor="middle" fontSize={10}
              className="fill-slate-500 dark:fill-slate-400"
            >
              {d.date}
            </text>
          </g>
        )
      })}

      {/* Baseline */}
      <line
        x1={PAD.left} y1={PAD.top + CHART_H}
        x2={PAD.left + CHART_W} y2={PAD.top + CHART_H}
        stroke="currentColor" strokeOpacity={0.15} strokeWidth={1}
        className="text-slate-900 dark:text-white"
      />
    </svg>
  )
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center h-32 text-sm text-slate-400 dark:text-slate-500">
      {label}
    </div>
  )
}
