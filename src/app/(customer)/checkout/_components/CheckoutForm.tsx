"use client"

import { useActionState, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { placeOrder } from "@/app/(customer)/checkout/actions"
import type { CheckoutResult } from "@/app/(customer)/checkout/actions"
import { getProductImageUrl } from "@/lib/image"
import { formatPrice } from "@/lib/utils"

// ─── Serialisable types passed from Server Component ─────────────────────────
// (Date fields stripped before crossing boundary)

export interface CheckoutCartItem {
  variantId:  string
  sku:        string
  productName: string
  color:      string | null
  size:       string | null
  length:     string | null
  quantity:   number
  unitPrice:  number          // display snapshot — server revalidates
  imageUrl:   string | null
  imageAlt:   string | null
}

export interface CheckoutBranch {
  id:   string
  name: string
  city: string
}

export interface CheckoutCustomer {
  name:  string
  phone: string | null
  email: string
}

interface CheckoutFormProps {
  items:      CheckoutCartItem[]
  branch:     CheckoutBranch
  customer:   CheckoutCustomer
}

const init: CheckoutResult = { success: false }

const inputCls = "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] focus:border-transparent"
const errInputCls = "w-full rounded-lg border border-red-400 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent"

export function CheckoutForm({ items, branch, customer }: CheckoutFormProps) {
  const [state, action, isPending] = useActionState(placeOrder, init)
  const fe = state.fieldErrors ?? {}

  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0)

  return (
    <form action={action} noValidate className="space-y-8">

      {/* ── Top-level error ── */}
      {state.error && !state.priceChanges && !state.stockErrors && (
        <div role="alert" className="rounded-xl bg-red-50 border border-red-200 px-5 py-4 text-sm text-red-700">
          {state.error}
        </div>
      )}

      {/* ── Price change notice ── */}
      {state.priceChanges && state.priceChanges.length > 0 && (
        <div role="alert" className="rounded-xl bg-amber-50 border border-amber-200 px-5 py-4 space-y-3">
          <p className="text-sm font-semibold text-amber-800">{state.error}</p>
          <ul className="space-y-1">
            {state.priceChanges.map((pc) => (
              <li key={pc.variantId} className="text-xs text-amber-700 flex items-center justify-between gap-4">
                <span className="truncate">{pc.productName} <span className="font-mono text-amber-500">({pc.sku})</span></span>
                <span className="shrink-0">
                  <span className="line-through text-amber-400">{formatPrice(pc.oldPrice)}</span>
                  {" → "}
                  <span className="font-bold">{formatPrice(pc.newPrice)}</span>
                </span>
              </li>
            ))}
          </ul>
          <Link href="/cart" className="inline-flex items-center text-xs font-medium text-amber-800 underline hover:text-amber-900">
            ← Review cart and update
          </Link>
        </div>
      )}

      {/* ── Stock error notice ── */}
      {state.stockErrors && state.stockErrors.length > 0 && (
        <div role="alert" className="rounded-xl bg-red-50 border border-red-200 px-5 py-4 space-y-2">
          <p className="text-sm font-semibold text-red-700">{state.error}</p>
          <ul className="space-y-1">
            {state.stockErrors.map((se) => (
              <li key={se.variantId} className="text-xs text-red-600">
                <span className="font-medium">{se.productName}</span> ({se.sku}) — You requested{" "}
                <strong>{se.requested}</strong>, only{" "}
                <strong>{se.available}</strong> available.
              </li>
            ))}
          </ul>
          <Link href="/cart" className="inline-flex items-center text-xs font-medium text-red-700 underline hover:text-red-900">
            ← Update cart
          </Link>
        </div>
      )}

      {/* ── Section 1: Contact Details ── */}
      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">
          Contact Details
        </h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 mb-1">
              Full Name *
            </label>
            <input id="customerName" name="customerName" type="text"
              defaultValue={customer.name} required
              className={fe.customerName ? errInputCls : inputCls} />
            {fe.customerName && <p role="alert" className="mt-1 text-xs text-red-600">{fe.customerName}</p>}
          </div>
          <div>
            <label htmlFor="customerPhone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number *
            </label>
            <input id="customerPhone" name="customerPhone" type="tel"
              defaultValue={customer.phone ?? ""} required
              placeholder="+91 99999 00000"
              className={fe.customerPhone ? errInputCls : inputCls} />
            {fe.customerPhone && <p role="alert" className="mt-1 text-xs text-red-600">{fe.customerPhone}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={customer.email} disabled
              className={`${inputCls} opacity-60`} />
            <p className="mt-1 text-xs text-gray-400">Email is from your account and cannot be changed here.</p>
          </div>
        </div>
      </section>

      {/* ── Section 2: Pickup Branch ── */}
      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">
          Pickup Branch
        </h2>
        <div className="rounded-xl bg-[var(--color-brand-50)] border border-[var(--color-brand-100)] p-4 flex items-start gap-3">
          <svg className="h-5 w-5 text-[var(--color-brand-600)] shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-2.079 3.218-4.402 3.218-6.853C19.5 6.161 15.976 2.25 12 2.25S4.5 6.161 4.5 11.474c0 2.451 1.274 4.774 3.218 6.853a19.58 19.58 0 002.683 2.282 16.975 16.975 0 001.144.742zM12 13.5a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-[var(--color-brand-800)]">{branch.name}</p>
            <p className="text-xs text-[var(--color-brand-600)] mt-0.5">{branch.city}</p>
            <Link href="/cart" className="mt-1.5 inline-block text-xs text-[var(--color-brand-600)] hover:underline">
              Change branch →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Section 3: Order Items ── */}
      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">
          Order Summary ({items.length} item{items.length !== 1 ? "s" : ""})
        </h2>
        <ul className="space-y-4">
          {items.map((item) => {
            const attrs = [item.color, item.size, item.length].filter(Boolean).join(" · ")
            const imgUrl = getProductImageUrl(item.imageUrl)
            return (
              <li key={item.variantId} className="flex gap-3">
                <div className="relative h-16 w-16 shrink-0 rounded-lg overflow-hidden bg-gray-50 border border-gray-100">
                  <Image src={imgUrl} alt={item.imageAlt ?? item.productName}
                    fill className="object-cover" sizes="64px"
                    onError={(e) => { (e.target as HTMLImageElement).src = "/images/placeholders/product.svg" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.productName}</p>
                  <p className="text-xs font-mono text-gray-400 mt-0.5">{item.sku}</p>
                  {attrs && <p className="text-xs text-gray-500 mt-0.5">{attrs}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-gray-900">{formatPrice(item.unitPrice * item.quantity)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{item.quantity} × {formatPrice(item.unitPrice)}</p>
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      {/* ── Section 4: Notes ── */}
      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">
          Notes <span className="font-normal text-gray-400 text-sm">(optional)</span>
        </h2>
        <textarea name="notes" rows={3}
          placeholder="Any special instructions for the branch staff…"
          className={`${inputCls} resize-none`} />
      </section>

      {/* ── Section 5: Total ── */}
      <section className="rounded-xl bg-gray-50 border border-gray-200 p-5 space-y-3">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Subtotal</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-400">
          <span>Delivery</span>
          <span>Pickup (free)</span>
        </div>
        <div className="flex justify-between text-base font-bold text-gray-900 border-t border-gray-200 pt-3 mt-1">
          <span>Total</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        <p className="text-xs text-gray-400">
          Payment will be collected at the branch on pickup.
        </p>
      </section>

      {/* ── Place Order button ── */}
      <button
        type="submit"
        disabled={isPending}
        className={[
          "w-full inline-flex items-center justify-center gap-2 rounded-xl px-6 py-4 text-base font-bold transition-colors",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand-600)]",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          isPending
            ? "bg-[var(--color-brand-500)] text-white"
            : "bg-[var(--color-brand-600)] text-white hover:bg-[var(--color-brand-700)]",
        ].join(" ")}>
        {isPending ? (
          <>
            <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Placing Order…
          </>
        ) : (
          <>
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Place Order
          </>
        )}
      </button>

      <p className="text-xs text-gray-400 text-center -mt-2">
        By placing this order you agree to pay at the branch on pickup.
        No online payment is charged at this step.
      </p>
    </form>
  )
}
