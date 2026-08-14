// =============================================================================
// Checkout Page
//
// Security:
//   - Requires authentication — unauthenticated users redirected to /login?next=/checkout
//   - customerId from server session ONLY
//   - Cart loaded from DB server-side
//   - Branch validated server-side
//   - Nothing from URL params or query string is trusted
// =============================================================================

import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { getSessionCustomer } from "@/lib/auth"
import { getCustomerCart } from "@/lib/cart"
import { prisma } from "@/lib/prisma"
import { getProductImageUrl } from "@/lib/image"
import { CheckoutForm } from "./_components/CheckoutForm"
import type { CheckoutCartItem, CheckoutBranch, CheckoutCustomer } from "./_components/CheckoutForm"

export const metadata: Metadata = { title: "Checkout" }
export const dynamic = "force-dynamic"

export default async function CheckoutPage() {
  // ── Auth guard ────────────────────────────────────────────────────────────
  const customer = await getSessionCustomer()
  if (!customer) {
    redirect("/login?next=/checkout")
  }

  // ── Load cart server-side ─────────────────────────────────────────────────
  const cart = await getCustomerCart(customer.id)

  if (!cart || cart.items.length === 0) {
    return (
      <div className="bg-white min-h-screen">
        <div className="mx-auto max-w-xl px-4 py-16 text-center space-y-5">
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto">
            <svg className="h-10 w-10 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Your cart is empty</h1>
          <p className="text-sm text-gray-500">Add items to your cart before proceeding to checkout.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/products"
              className="inline-flex items-center justify-center rounded-xl bg-[var(--color-brand-600)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-brand-700)] transition-colors">
              Continue Shopping
            </Link>
            <Link href="/cart"
              className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              View Cart
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ── Resolve branch ────────────────────────────────────────────────────────
  let branch: CheckoutBranch | null = null
  if (cart.branchId) {
    const b = await prisma.branch.findUnique({
      where:  { id: cart.branchId },
      select: { id: true, name: true, city: true, isActive: true },
    })
    if (b?.isActive) branch = { id: b.id, name: b.name, city: b.city }
  }

  if (!branch) {
    return (
      <div className="bg-white min-h-screen">
        <div className="mx-auto max-w-xl px-4 py-16 text-center space-y-5">
          <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
            <svg className="h-10 w-10 text-amber-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900">No branch selected</h1>
          <p className="text-sm text-gray-500">
            Please select a pickup branch before proceeding to checkout. You can change
            your branch from the cart or the header.
          </p>
          <Link href="/cart"
            className="inline-flex items-center justify-center rounded-xl bg-[var(--color-brand-600)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-brand-700)] transition-colors">
            ← Back to Cart
          </Link>
        </div>
      </div>
    )
  }

  // ── Serialise cart items for Client Component ─────────────────────────────
  const serialItems: CheckoutCartItem[] = cart.items.map((item) => ({
    variantId:   item.variantId,
    sku:         item.variant.sku,
    productName: item.variant.product.name,
    color:       item.variant.color,
    size:        item.variant.size,
    length:      item.variant.length,
    quantity:    item.quantity,
    unitPrice:   item.unitPrice,
    imageUrl:    item.variant.product.images[0]?.imageUrl ?? null,
    imageAlt:    item.variant.product.images[0]?.altText ?? null,
  }))

  const serialCustomer: CheckoutCustomer = {
    name:  customer.name,
    phone: customer.phone,
    email: customer.email,
  }

  return (
    <div className="bg-white min-h-screen">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10">

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6">
          <ol className="flex items-center gap-2 text-sm text-gray-400 flex-wrap">
            <li><Link href="/cart" className="hover:text-gray-600 transition-colors">Cart</Link></li>
            <li aria-hidden="true">/</li>
            <li className="text-gray-700 font-medium">Checkout</li>
          </ol>
        </nav>

        <h1 className="text-2xl font-bold text-gray-900 mb-8">Checkout</h1>

        <CheckoutForm
          items={serialItems}
          branch={branch}
          customer={serialCustomer}
        />
      </div>
    </div>
  )
}
