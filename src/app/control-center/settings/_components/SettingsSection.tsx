// Reusable card wrapper for each settings section.
// Server Component — no interactivity needed at this level.

interface SettingsSectionProps {
  title:       string
  description: string
  children:    React.ReactNode
  icon:        string
}

export function SettingsSection({
  title, description, children, icon,
}: SettingsSectionProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Section header */}
      <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-start gap-3">
        <span className="text-xl mt-0.5" aria-hidden="true">{icon}</span>
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
        </div>
      </div>
      {/* Section body */}
      <div className="px-6 py-5">{children}</div>
    </div>
  )
}
