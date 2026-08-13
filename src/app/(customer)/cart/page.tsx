// =============================================================================
// Cart Page
// Works for both guest and logged-in customers.
// Cart is resolved server-side — cartId/customerId never read from URL.
// =============================================================================

import type { Metadata } from "next"
import Link from "next/link"
import { cookies } from "next/headers"
import { getSessionCustomer } from "@/lib/auth"
import {
  CART_COOKIE,
  getGuestCart,
  getCustomerCart,
  computeCartSubtotal,
} from "@/lib/cart"
import { CartLineItem } from "./_components/CartLineItem"
import { CartSummary }  from "./_components/CartSummary"
import type { SerialCartItem } from "./_components/CartLineItem"

export const metadata: Metadata = { title: "Your Cart" }
export const dynamic = "force-dynamic"

export default async function CartPage() {
  // ── Resolve cart server-side ──────────────────────────────────────────────
  const cookieStore = await cookies()
  const customer    = await getSessionCustomer()

  let branchId:   string | null = null
  let branchName: string | null = null
  let items:      SerialCartItem[] = []

  if (customer) {
    const cart = await getCustomerCart(customer.id)
    if (cart) {
      branchId = cart.branchId
      // Fetch branch name from the cart's branchId if set
      if (cart.branchId) {
        // Branch name is not in CartWithItems — resolve via the existing branch-cookie
        // which already stores the name. For the cart page we use the branch-cookie
        // as the display name; the DB value is the authoritative ID.
      }
      items = cart.items.map(serialiseItem)
    }
  } else {
    const guestToken = cookieStore.get(CART_COOKIE)?.value
    if (guestToken) {
      const cart = await getGuestCart(guestToken)
      if (cart) {
        branchId = cart.branchId
        items = cart.items.map(serialiseItem)
      }
    }
  }

  // Fetch the branch name separately so we can display it
  if (branchId) {
    const { prisma } = await import("@/lib/prisma")
    const branch = await prisma.branch.findUnique({
      where:  { id: branchId },
      select: { name: true },
    })
    branchName = branch?.name ?? null
  }

  const subtotal  = computeCartSubtotal(items)
  const itemCount = items.reduce((s, i) => s + i.quantity, 0)

  // ── Empty state ───────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="bg-white min-h-screen">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16 flex flex-col items-center text-center gap-6">
          {/* Cart icon illustration */}
          <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center">
            <svg className="h-12 w-12 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.2} viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h1>
            <p className="text-gray-500 text-sm max-w-sm">
              Browse our textile collection and add items to your cart. You can
              reserve online and pick up from your nearest branch.
            </p>
          </div>

          <Link href="/products"
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-brand-600)] px-6 py-3 text-base font-semibold text-white hover:bg-[var(--color-brand-700)] transition-colors">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Continue Shopping
          </Link>

          {!customer && (
            <p className="text-sm text-gray-400">
              <Link href="/login" className="text-[var(--color-brand-600)] hover:underline font-medium">Sign in</Link>
              {" "}to see your saved cart items.
            </p>
          )}
        </div>
      </div>
    )
  }

  // ── Filled cart ───────────────────────────────────────────────────────────
  return (
    <div className="bg-white min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">

        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Your Cart</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {itemCount} item{itemCount !== 1 ? "s" : ""}
            </p>
          </div>
          <Link href="/products" className="text-sm text-gray-500 hover:text-[var(--color-brand-600)] transition-colors">
            ← Continue Shopping
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Cart line items */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-200 px-5">
              <ul aria-label="Cart items">
                {items.map((item) => (
                  <CartLineItem key={item.id} item={item} />
                ))}
              </ul>
            </div>
          </div>

          {/* Order summary sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <CartSummary
                subtotal={subtotal}
                itemCount={itemCount}
                branchName={branchName}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Serialise CartItemFull to remove Date fields ─────────────────────────────

function serialiseItem(item: {
  id: string
  variantId: string
  quantity: number
  unitPrice: number
  variant: {
    sku: string
    color: string | null
    size: string | null
    length: string | null
    priceOverride: number | null
    product: {
      id: string
      name: string
      slug: string
      basePrice: number
      images: { id: string; imageUrl: string; altText: string | null; isPrimary: boolean }[]
    }
  }
}): SerialCartItem {
  return {
    id:        item.id,
    variantId: item.variantId,
    quantity:  item.quantity,
    unitPrice: item.unitPrice,
    variant: {
      sku:           item.variant.sku,
      color:         item.variant.color,
      size:          item.variant.size,
      length:        item.variant.length,
      priceOverride: item.variant.priceOverride,
      product: {
        id:        item.variant.product.id,
        name:      item.variant.product.name,
        slug:      item.variant.product.slug,
        basePrice: item.variant.product.basePrice,
        images:    item.variant.product.images,
      },
    },
  }
}
