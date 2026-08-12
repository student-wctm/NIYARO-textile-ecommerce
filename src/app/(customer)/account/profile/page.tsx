import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getSessionCustomer } from "@/lib/auth"
import { getCustomerById } from "@/lib/customers"
import { ProfileForm } from "./_components/ProfileForm"

export const metadata: Metadata = { title: "My Profile" }
export const dynamic = "force-dynamic"

export default async function ProfilePage() {
  const session = await getSessionCustomer()
  if (!session) redirect("/login")

  const customer = await getCustomerById(session.id)
  if (!customer) redirect("/login")

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">My Profile</h1>
      <div className="max-w-lg bg-white rounded-2xl border border-gray-200 p-6">
        <ProfileForm
          name={customer.name}
          email={customer.email}
          phone={customer.phone}
        />
      </div>
    </div>
  )
}
