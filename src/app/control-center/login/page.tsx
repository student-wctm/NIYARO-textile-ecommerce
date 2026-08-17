import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getSessionAdmin } from "@/lib/adminAuth"
import { siteConfig } from "@/config/site"
import { AdminLoginForm } from "./_components/AdminLoginForm"

export const metadata: Metadata = { title: "Control Center Login" }
export const dynamic = "force-dynamic"

type PageProps = { searchParams: Promise<{ next?: string }> }

export default async function AdminLoginPage({ searchParams }: PageProps) {
  // Already authenticated → go to control center dashboard
  const admin = await getSessionAdmin()
  if (admin) redirect("/control-center")

  const { next } = await searchParams
  const safNext = next?.startsWith("/control-center") && !next.startsWith("/control-center/login") ? next : undefined

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-2xl font-bold text-white tracking-tight">
            ⚙️ {siteConfig.adminPanelLabel}
          </p>
          <p className="text-slate-400 text-sm mt-1">Sign in to continue</p>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <AdminLoginForm next={safNext} />
        </div>
        <p className="text-center text-xs text-slate-500 mt-4">
          Admin access only. Customers sign in at{" "}
          <a href="/login" className="text-slate-400 hover:text-slate-300 underline">/login</a>.
        </p>
      </div>
    </div>
  )
}
