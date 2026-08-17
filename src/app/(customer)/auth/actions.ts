"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import {
  hashPassword,
  verifyPassword,
  createSession,
  invalidateSession,
  getSessionCustomer,
} from "@/lib/auth"
import {
  getCustomerByEmail,
  createCustomer,
  updateCustomerProfile,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from "@/lib/customers"
import { mergeGuestCart } from "@/app/(customer)/cart/actions"
import { getSelectedBranchFromCookies } from "@/lib/branch-cookie"

export interface AuthResult {
  success: boolean
  error?:  string
  fieldErrors?: Record<string, string>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isEmail(v: string)  { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) }
function isPhone(v: string)  { return !v || /^[+]?[\d\s\-().]{7,20}$/.test(v) }
function isPincode(v: string){ return /^\d{6}$/.test(v) }

/**
 * Determine the post-auth redirect destination.
 * Reads the `next` search-param that the proxy middleware appended when it
 * redirected the user to /login (e.g. ?next=/checkout).
 * Falls back to /account for safety — we never redirect to external URLs.
 */
function resolveRedirectTarget(defaultPath: string): string {
  // `headers()` lets us read the full request URL in a Server Action
  // The referer / x-invoke-path contains the URL that triggered the action.
  // A safer approach: the LoginForm / RegisterForm must pass the `next`
  // value as a hidden input from the current URL searchParams. We read it
  // here from FormData if present, otherwise fall back to default.
  // The actual FormData reading happens in login/register and is passed in.
  return defaultPath
}

/**
 * Sanitise and validate the `next` redirect path.
 * Only allow relative paths that start with /. Prevents open-redirect attacks.
 */
function sanitiseNext(next: string | null | undefined): string | null {
  if (!next) return null
  // Must start with / and not be a protocol-relative URL (//evil.com)
  if (!next.startsWith("/") || next.startsWith("//")) return null
  // Disallow admin / staff / control-center routes — post-login redirect must be customer paths only
  if (next.startsWith("/admin") || next.startsWith("/staff") || next.startsWith("/control-center")) return null
  return next
}

// ─── Register ─────────────────────────────────────────────────────────────────

export async function register(
  _prev: AuthResult,
  formData: FormData
): Promise<AuthResult> {
  const name     = (formData.get("name")     as string | null)?.trim() ?? ""
  const email    = (formData.get("email")    as string | null)?.trim().toLowerCase() ?? ""
  const phone    = (formData.get("phone")    as string | null)?.trim() ?? ""
  const password = (formData.get("password") as string | null) ?? ""
  const confirm  = (formData.get("confirm")  as string | null) ?? ""
  const terms    = formData.get("terms") === "on"
  // Hidden input optionally injected by the register page from URL searchParams
  const next     = sanitiseNext(formData.get("next") as string | null)

  const fe: Record<string, string> = {}
  if (!name || name.length < 2)     fe.name     = "Full name must be at least 2 characters."
  if (!email || !isEmail(email))    fe.email    = "Enter a valid email address."
  if (phone && !isPhone(phone))     fe.phone    = "Enter a valid phone number."
  if (password.length < 8)          fe.password = "Password must be at least 8 characters."
  if (password !== confirm)         fe.confirm  = "Passwords do not match."
  if (!terms)                       fe.terms    = "You must accept the terms."

  if (Object.keys(fe).length) return { success: false, fieldErrors: fe }

  // Check uniqueness
  const existing = await getCustomerByEmail(email)
  if (existing) return { success: false, fieldErrors: { email: "An account with this email already exists." } }

  const passwordHash = await hashPassword(password)
  const customer = await createCustomer({ name, email, phone, passwordHash })

  const reqHeaders = await headers()
  await createSession(customer.id, {
    userAgent: reqHeaders.get("user-agent") ?? undefined,
  })

  // ── Cart merge after successful registration ──────────────────────────────
  // If the new customer had items in a guest cart, merge them now.
  // Use the selected branch from the branch cookie as the cart's branch.
  const selectedBranch = await getSelectedBranchFromCookies()
  await mergeGuestCart(customer.id, selectedBranch?.id)

  redirect(next ?? "/account")
}

// ─── Login ────────────────────────────────────────────────────────────────────

export async function login(
  _prev: AuthResult,
  formData: FormData
): Promise<AuthResult> {
  const email    = (formData.get("email")    as string | null)?.trim().toLowerCase() ?? ""
  const password = (formData.get("password") as string | null) ?? ""
  // Hidden input optionally injected by the login page from URL searchParams
  const next     = sanitiseNext(formData.get("next") as string | null)

  if (!email || !password) {
    return { success: false, error: "Email and password are required." }
  }

  // Constant-time-ish: always look up then compare to avoid timing oracle
  const customer = await getCustomerByEmail(email)

  // If no customer, still run verifyPassword against a dummy hash to avoid
  // timing attacks that could enumerate valid email addresses.
  const dummyHash = "$2a$12$invalidhashinvalidhashinvalidhashXXXXXXXXXXXXXXXX"
  const hash = customer?.passwordHash ?? dummyHash
  const valid = await verifyPassword(password, hash)

  if (!customer || !valid) {
    return { success: false, error: "Invalid email or password." }
  }
  if (!customer.isActive) {
    return { success: false, error: "This account has been deactivated. Please contact support." }
  }

  const reqHeaders = await headers()
  await createSession(customer.id, {
    userAgent: reqHeaders.get("user-agent") ?? undefined,
  })

  // ── Cart merge after successful login ─────────────────────────────────────
  // Merge any guest cart into the customer's cart.
  // Uses the selected branch from the branch cookie so the cart stays
  // scoped to the branch the customer already chose.
  const selectedBranch = await getSelectedBranchFromCookies()
  await mergeGuestCart(customer.id, selectedBranch?.id)

  redirect(next ?? "/account")
}

// ─── Logout ───────────────────────────────────────────────────────────────────

export async function logout(): Promise<void> {
  await invalidateSession()
  redirect("/login")
}

// ─── Update profile ───────────────────────────────────────────────────────────

export async function updateProfile(
  _prev: AuthResult,
  formData: FormData
): Promise<AuthResult> {
  const session = await getSessionCustomer()
  if (!session) return { success: false, error: "Not authenticated." }

  const name  = (formData.get("name")  as string | null)?.trim() ?? ""
  const phone = (formData.get("phone") as string | null)?.trim() ?? ""

  const fe: Record<string, string> = {}
  if (!name || name.length < 2) fe.name  = "Name must be at least 2 characters."
  if (phone && !isPhone(phone)) fe.phone = "Enter a valid phone number."
  if (Object.keys(fe).length) return { success: false, fieldErrors: fe }

  try {
    await updateCustomerProfile(session.id, { name, phone })
  } catch {
    return { success: false, error: "Failed to update profile." }
  }

  revalidatePath("/account")
  revalidatePath("/account/profile")
  return { success: true }
}

// ─── Address actions ──────────────────────────────────────────────────────────

function validateAddress(fd: FormData): {
  values: Parameters<typeof createAddress>[1]
  fieldErrors: Record<string, string>
} {
  const fe: Record<string, string> = {}
  const fullName = (fd.get("fullName") as string | null)?.trim() ?? ""
  const phone    = (fd.get("phone")    as string | null)?.trim() ?? ""
  const line1    = (fd.get("line1")    as string | null)?.trim() ?? ""
  const line2    = (fd.get("line2")    as string | null)?.trim() || undefined
  const city     = (fd.get("city")     as string | null)?.trim() ?? ""
  const state    = (fd.get("state")    as string | null)?.trim() ?? ""
  const pincode  = (fd.get("pincode")  as string | null)?.trim() ?? ""
  const landmark = (fd.get("landmark") as string | null)?.trim() || undefined
  const label    = (fd.get("label")    as string | null)?.trim() || undefined
  const isDefault = fd.get("isDefault") === "true"

  if (!fullName) fe.fullName = "Full name is required."
  if (!phone || !isPhone(phone)) fe.phone = "Enter a valid phone number."
  if (!line1)    fe.line1   = "Address line 1 is required."
  if (!city)     fe.city    = "City is required."
  if (!state)    fe.state   = "State is required."
  if (!isPincode(pincode)) fe.pincode = "Enter a valid 6-digit PIN code."

  return { values: { fullName, phone, line1, line2, city, state, pincode, landmark, label, isDefault }, fieldErrors: fe }
}

export async function addAddress(
  _prev: AuthResult,
  formData: FormData
): Promise<AuthResult> {
  const session = await getSessionCustomer()
  if (!session) return { success: false, error: "Not authenticated." }

  const { values, fieldErrors } = validateAddress(formData)
  if (Object.keys(fieldErrors).length) return { success: false, fieldErrors }

  try {
    await createAddress(session.id, values)
  } catch {
    return { success: false, error: "Failed to save address." }
  }

  revalidatePath("/account/addresses")
  return { success: true }
}

export async function editAddress(
  addressId: string,
  _prev: AuthResult,
  formData: FormData
): Promise<AuthResult> {
  const session = await getSessionCustomer()
  if (!session) return { success: false, error: "Not authenticated." }

  const { values, fieldErrors } = validateAddress(formData)
  if (Object.keys(fieldErrors).length) return { success: false, fieldErrors }

  try {
    await updateAddress(addressId, session.id, values)
  } catch {
    return { success: false, error: "Failed to update address." }
  }

  revalidatePath("/account/addresses")
  return { success: true }
}

export async function removeAddress(addressId: string): Promise<void> {
  const session = await getSessionCustomer()
  if (!session) return
  await deleteAddress(addressId, session.id)
  revalidatePath("/account/addresses")
}

export async function makeDefaultAddress(addressId: string): Promise<void> {
  const session = await getSessionCustomer()
  if (!session) return
  await setDefaultAddress(addressId, session.id)
  revalidatePath("/account/addresses")
}
