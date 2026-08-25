import type { Metadata } from "next"
import Link from "next/link"
import { siteConfig } from "@/config/site"
import { ResetPasswordForm } from "./_components/ResetPasswordForm"

export const metadata: Metadata = { title: "Set New Password" }
export const dynamic = "force-dynamic"

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-[var(--color-brand-700)] font-bold text-2xl">
            <span aria-hidden="true">{siteConfig.logoIcon}</span>
            {siteConfig.name}
          </Link>
          <h1 className="mt-4 text-xl font-bold text-gray-900">Set new password</h1>
          <p className="mt-1 text-sm text-gray-500">
            Choose a strong password for your account.
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-green-500 text-white text-xs font-bold">✓</span>
          <div className="h-px w-8 bg-green-500" />
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-green-500 text-white text-xs font-bold">✓</span>
          <div className="h-px w-8 bg-[var(--color-brand-600)]" />
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[var(--color-brand-600)] text-white text-xs font-bold">3</span>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <ResetPasswordForm />
        </div>
      </div>
    </div>
  )
}
