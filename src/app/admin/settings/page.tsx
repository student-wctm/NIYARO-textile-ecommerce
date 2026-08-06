import type { Metadata } from "next"

export const metadata: Metadata = { title: "Settings" }

// TODO: Global configuration — default inter-branch transfer charge,
// low-stock threshold defaults, notification settings, etc.
// All configurable from here rather than hard-coded in the codebase.
export default function AdminSettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Settings</h1>
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">
        <p className="text-sm">Global settings UI coming soon.</p>
      </div>
    </div>
  )
}
