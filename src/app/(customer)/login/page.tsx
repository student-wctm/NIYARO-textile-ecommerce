import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { getSessionCustomer } from "@/lib/auth"
import { siteConfig } from "@/config/site"
import { LoginForm } from "./_components/LoginForm"

export const metadata: Metadata = { title: "Sign In" }
export const dynamic = "force-dynamic"

type PageProps = { searchParams: Promise<{ next?: string; reset?: string }> }

export default async function LoginPage({ searchParams }: PageProps) {
  const session = await getSessionCustomer()
  if (session) redirect("/account")

  const { next, reset } = await searchParams
  // Sanitise: only allow relative customer paths, never admin/staff/control-center
  const safNext = next?.startsWith("/") && !next.startsWith("//")
    && !next.startsWith("/admin") && !next.startsWith("/staff") && !next.startsWith("/control-center")
    ? next : undefined

  const passwordReset = reset === "1"

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-[var(--color-brand-700)] font-bold text-2xl">
            <span aria-hidden="true">{siteConfig.logoIcon}</span>
            {siteConfig.name}
          </Link>
          <h1 className="mt-4 text-xl font-bold text-gray-900">Sign in to your account</h1>
          <p className="mt-1 text-sm text-gray-500">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-[var(--color-brand-600)] font-medium hover:underline">
              Register
            </Link>
          </p>
        </div>

        {/* Password reset success banner */}
        {passwordReset && (
          <div role="status" className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800 text-center">
            ✓ Your password has been reset. Sign in with your new password.
          </div>
        )}

        {/* Form card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <LoginForm next={safNext} />
        </div>
      </div>
    </div>
  )
}
