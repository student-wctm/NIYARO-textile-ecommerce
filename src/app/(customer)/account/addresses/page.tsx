import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getSessionCustomer } from "@/lib/auth"
import { getCustomerAddresses } from "@/lib/customers"
import { AddressManager } from "./_components/AddressManager"

export const metadata: Metadata = { title: "My Addresses" }
export const dynamic = "force-dynamic"

export default async function AddressesPage() {
  const customer = await getSessionCustomer()
  if (!customer) redirect("/login")

  const addresses = await getCustomerAddresses(customer.id)

  // Serialise Dates before passing to Client Component
  const serialised = addresses.map((a) => ({
    ...a,
    createdAt: a.createdAt as unknown as Date,
    updatedAt: a.updatedAt as unknown as Date,
  }))

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">My Addresses</h1>
      <AddressManager addresses={serialised} />
    </div>
  )
}
