import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getSessionStaff } from "@/lib/staffAuth"
import { siteConfig } from "@/config/site"
import { StaffLoginForm } from "./_components/StaffLoginForm"

export const metadata: Metadata = { title: "Staff Login" }
export const dynamic = "force-dynamic"

type PageProps = { searchParams: Promise<{ next?: string }> }

export default async function StaffLoginPage({ searchParams }: PageProps) {
  const staff = await getSessionStaff()
  if (staff) redirect("/staff")

  const { next } = await searchParams
  const safNext = next?.startsWith("/staff") && !next.startsWith("/staff/login") ? next : undefined

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-2xl font-bold text-white tracking-tight">
            {siteConfig.logoIcon} {siteConfig.staffPanelLabel}
          </p>
          <p className="text-gray-400 text-sm mt-1">Branch staff sign in</p>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <StaffLoginForm next={safNext} />
        </div>
      </div>
    </div>
  )
}
