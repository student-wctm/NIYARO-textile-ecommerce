import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { getSessionCustomer } from "@/lib/auth"
import { siteConfig } from "@/config/site"
import { RequestCodeForm } from "./_components/RequestCodeForm"

export const metadata: Metadata = { title: "Forgot Password" }
export const dynamic = "force-dynamic"

export default async function ForgotPasswordPage() {
  // Already logged-in customers don't need a password reset
  const session = await getSessionCustomer()
  if (session) redirect("/account")

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-[var(--color-brand-700)] font-bold text-2xl">
            <span aria-hidden="true">{siteConfig.logoIcon}</span>
            {siteConfig.name}
          </Link>
          <h1 className="mt-4 text-xl font-bold text-gray-900">Forgot your password?</h1>
          <p className="mt-1 text-sm text-gray-500">
            Enter your email and we&apos;ll send a 6-digit verification code.
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[var(--color-brand-600)] text-white text-xs font-bold">1</span>
          <div className="h-px w-8 bg-gray-300" />
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-200 text-gray-400 text-xs font-bold">2</span>
          <div className="h-px w-8 bg-gray-300" />
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-200 text-gray-400 text-xs font-bold">3</span>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <RequestCodeForm />
        </div>

        <p className="mt-6 text-center text-sm text-gray-500">
          Remembered it?{" "}
          <Link href="/login" className="text-[var(--color-brand-600)] font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
