"use client"

import { useActionState, useTransition, useState } from "react"
import {
  addAddress,
  editAddress,
  removeAddress,
  makeDefaultAddress,
} from "@/app/(customer)/auth/actions"
import type { AuthResult } from "@/app/(customer)/auth/actions"
import type { CustomerAddress } from "@/lib/customers"

const init: AuthResult = { success: false }

const inputCls = "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] focus:border-transparent"
const errInputCls = "w-full rounded-lg border border-red-400 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent"

interface AddressFormProps {
  address?: CustomerAddress
  onClose: () => void
}

function AddressForm({ address, onClose }: AddressFormProps) {
  const isEdit = !!address

  const boundEdit = address
    ? editAddress.bind(null, address.id)
    : null

  const actionFn = isEdit && boundEdit ? boundEdit : addAddress

  const [state, formAction, isPending] = useActionState(
    actionFn as (prev: AuthResult, fd: FormData) => Promise<AuthResult>,
    init
  )
  const fe = state.fieldErrors ?? {}

  // Close drawer on success
  if (state.success) { onClose(); return null }

  function F({ label, name, required = false, type = "text", placeholder = "" }: {
    label: string; name: string; required?: boolean; type?: string; placeholder?: string
  }) {
    const err = fe[name]
    const def = address ? (address as Record<string, unknown>)[name] as string ?? "" : ""
    return (
      <div>
        <label htmlFor={`af-${name}`} className="block text-sm font-medium text-gray-700 mb-1">
          {label}{required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <input id={`af-${name}`} name={name} type={type}
          defaultValue={def} placeholder={placeholder}
          className={err ? errInputCls : inputCls} />
        {err && <p role="alert" className="mt-1 text-xs text-red-600">{err}</p>}
      </div>
    )
  }

  return (
    <form action={formAction} noValidate className="space-y-4 p-5 bg-white rounded-2xl border border-gray-200">
      <h3 className="text-base font-semibold text-gray-900">
        {isEdit ? "Edit Address" : "Add New Address"}
      </h3>

      {state.error && (
        <div role="alert" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <F label="Label (optional)" name="label" placeholder="Home / Office" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <F label="Full Name" name="fullName" required />
        <F label="Phone" name="phone" required type="tel" placeholder="+91 99999 00000" />
      </div>

      <F label="Address Line 1" name="line1" required placeholder="Flat, building, street" />
      <F label="Address Line 2" name="line2" placeholder="Area, locality (optional)" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <F label="City"    name="city"    required />
        <F label="State"   name="state"   required />
        <F label="PIN Code" name="pincode" required placeholder="110001" />
      </div>

      <F label="Landmark" name="landmark" placeholder="Near Metro Station (optional)" />

      {/* isDefault hidden fallback — must be BEFORE the checkbox so checkbox value takes precedence */}
      <input type="hidden" name="isDefault" value="false" />

      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" name="isDefault" value="true"
          defaultChecked={address?.isDefault ?? false}
          className="accent-[var(--color-brand-600)]" />
        <span className="text-sm text-gray-700">Set as default address</span>
      </label>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-brand-600)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-brand-700)] transition-colors disabled:opacity-50">
          {isPending && <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
          {isPending ? "Saving…" : isEdit ? "Update Address" : "Add Address"}
        </button>
        <button type="button" onClick={onClose}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
          Cancel
        </button>
      </div>
    </form>
  )
}

interface AddressCardProps {
  address: CustomerAddress
  onEdit: () => void
}

function AddressCard({ address, onEdit }: AddressCardProps) {
  const [isPending, start] = useTransition()

  return (
    <div className={`rounded-2xl border p-5 relative transition-all ${address.isDefault ? "border-[var(--color-brand-400)] bg-[var(--color-brand-50)]" : "border-gray-200 bg-white"} ${isPending ? "opacity-60 pointer-events-none" : ""}`}>
      {address.isDefault && (
        <span className="absolute top-3 right-3 inline-flex items-center rounded-full bg-[var(--color-brand-600)] px-2 py-0.5 text-xs font-semibold text-white">
          Default
        </span>
      )}
      {address.label && (
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{address.label}</p>
      )}
      <p className="text-sm font-semibold text-gray-900">{address.fullName}</p>
      <p className="text-sm text-gray-600 mt-0.5">{address.phone}</p>
      <p className="text-sm text-gray-600 mt-1 leading-relaxed">
        {address.line1}{address.line2 ? `, ${address.line2}` : ""},<br />
        {address.city}, {address.state} – {address.pincode}
        {address.landmark && <><br />{address.landmark}</>}
      </p>

      <div className="flex items-center gap-3 mt-4 flex-wrap">
        <button type="button" onClick={onEdit}
          className="text-xs font-medium text-[var(--color-brand-600)] hover:underline">
          Edit
        </button>
        {!address.isDefault && (
          <button type="button" onClick={() => start(() => makeDefaultAddress(address.id))}
            className="text-xs font-medium text-gray-500 hover:text-gray-700">
            Set as default
          </button>
        )}
        <button type="button"
          onClick={() => {
            if (!window.confirm("Delete this address?")) return
            start(() => removeAddress(address.id))
          }}
          className="text-xs font-medium text-red-500 hover:text-red-700">
          Delete
        </button>
      </div>
    </div>
  )
}

export function AddressManager({ addresses }: { addresses: CustomerAddress[] }) {
  const [mode, setMode] = useState<null | "add" | CustomerAddress>(null)

  return (
    <div className="space-y-5">
      {/* Add button */}
      {mode === null && (
        <button type="button" onClick={() => setMode("add")}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-brand-600)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-brand-700)] transition-colors">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Address
        </button>
      )}

      {/* Add form */}
      {mode === "add" && <AddressForm onClose={() => setMode(null)} />}

      {/* Address cards */}
      {addresses.length === 0 && mode === null ? (
        <div className="rounded-2xl border border-gray-200 py-16 text-center">
          <p className="text-4xl mb-3" aria-hidden="true">📍</p>
          <p className="text-base font-semibold text-gray-700 mb-1">No addresses saved</p>
          <p className="text-sm text-gray-400">Add a delivery address for faster checkout.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {addresses.map((addr) => (
            mode && typeof mode === "object" && mode.id === addr.id
              ? <AddressForm key={addr.id} address={addr} onClose={() => setMode(null)} />
              : <AddressCard key={addr.id} address={addr} onEdit={() => setMode(addr)} />
          ))}
        </div>
      )}
    </div>
  )
}
