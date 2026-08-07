// Pure SVG line chart — monthly revenue over 6 months.

import type { MonthlyRevenuePoint } from "@/lib/dashboard"

interface RevenueLineChartProps {
  data: MonthlyRevenuePoint[]
}

const W = 560
const H = 200
const PAD = { top: 20, right: 20, bottom: 36, left: 64 }
const CHART_W = W - PAD.left - PAD.right
const CHART_H = H - PAD.top  - PAD.bottom

function formatK(n: number): string {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000)   return `₹${(n / 1000).toFixed(0)}k`
  return `₹${n}`
}

export function RevenueLineChart({ data }: RevenueLineChartProps) {
  if (data.length === 0) {
    return <div className="flex items-center justify-center h-32 text-sm text-slate-400">No data</div>
  }

  const maxRev  = Math.max(...data.map((d) => d.revenue), 1)
  const stepX   = CHART_W / (data.length - 1 || 1)

  const points = data.map((d, i) => ({
    x: PAD.left + i * stepX,
    y: PAD.top  + CHART_H - (CHART_H * d.revenue / maxRev),
    ...d,
  }))

  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ")

  // Area fill
  const areaPath =
    `M ${points[0].x},${PAD.top + CHART_H} ` +
    points.map((p) => `L ${p.x},${p.y}`).join(" ") +
    ` L ${points[points.length - 1].x},${PAD.top + CHART_H} Z`

  const ticks = [0, 0.5, 1.0].map((r) => ({
    y:     PAD.top + CHART_H * (1 - r),
    label: formatK(maxRev * r),
  }))

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Monthly revenue chart" className="w-full h-auto">
      {/* Grid */}
      {ticks.map((t) => (
        <g key={t.y}>
          <line x1={PAD.left} y1={t.y} x2={PAD.left + CHART_W} y2={t.y}
            stroke="currentColor" strokeOpacity={0.08} strokeWidth={1}
            className="text-slate-900 dark:text-white" />
          <text x={PAD.left - 6} y={t.y + 4} textAnchor="end" fontSize={9}
            className="fill-slate-400 dark:fill-slate-500">{t.label}</text>
        </g>
      ))}

      {/* Area fill */}
      <defs>
        <linearGradient id="rev-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="var(--color-brand-500)" stopOpacity={0.25} />
          <stop offset="100%" stopColor="var(--color-brand-500)" stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#rev-grad)" />

      {/* Line */}
      <polyline points={polyline} fill="none"
        className="stroke-[var(--color-brand-500)] dark:stroke-[var(--color-brand-400)]"
        strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />

      {/* Dots + labels */}
      {points.map((p) => (
        <g key={p.month}>
          <circle cx={p.x} cy={p.y} r={4}
            className="fill-[var(--color-brand-500)] dark:fill-[var(--color-brand-400)] stroke-white dark:stroke-slate-800"
            strokeWidth={2} />
          <text x={p.x} y={H - PAD.bottom + 14}
            textAnchor="middle" fontSize={10}
            className="fill-slate-500 dark:fill-slate-400">{p.month}</text>
        </g>
      ))}
    </svg>
  )
}
