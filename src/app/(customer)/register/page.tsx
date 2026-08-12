import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { getSessionCustomer } from "@/lib/auth"
import { siteConfig } from "@/config/site"
import { RegisterForm } from "./_components/RegisterForm"

export const metadata: Metadata = { title: "Create Account" }
export const dynamic = "force-dynamic"

type PageProps = { searchParams: Promise<{ next?: string }> }

export default async function RegisterPage({ searchParams }: PageProps) {
  const session = await getSessionCustomer()
  if (session) redirect("/account")

  const { next } = await searchParams
  const safNext = next?.startsWith("/") && !next.startsWith("//")
    && !next.startsWith("/admin") && !next.startsWith("/staff")
    ? next : undefined

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-[var(--color-brand-700)] font-bold text-2xl">
            <span aria-hidden="true">{siteConfig.logoIcon}</span>
            {siteConfig.name}
          </Link>
          <h1 className="mt-4 text-xl font-bold text-gray-900">Create your account</h1>
          <p className="mt-1 text-sm text-gray-500">
            Already have an account?{" "}
            <Link href="/login" className="text-[var(--color-brand-600)] font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <RegisterForm next={safNext} />
        </div>
      </div>
    </div>
  )
}
