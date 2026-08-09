"use server"

// =============================================================================
// Admin Settings Server Actions
//
// SECURITY TODO: No authentication yet. Protect before production.
//
// Each section has its own action so partial saves are possible and
// errors stay scoped to the relevant section.
// =============================================================================

import { revalidatePath } from "next/cache"
import { upsertSettings } from "@/lib/settings"

export interface ActionResult {
  success: boolean
  error?:  string
  fieldErrors?: Record<string, string>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function str(data: FormData, key: string): string {
  return (data.get(key) as string | null)?.trim() ?? ""
}

function isValidEmail(v: string): boolean {
  return !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}

function isValidPhone(v: string): boolean {
  return !v || /^[+]?[\d\s\-().]{7,20}$/.test(v)
}

function isNonNegativeInt(v: string): boolean {
  const n = parseInt(v, 10)
  return !isNaN(n) && n >= 0 && String(n) === v
}

function isNonNegativeFloat(v: string): boolean {
  const n = parseFloat(v)
  return !isNaN(n) && n >= 0
}

// ─── Store Information ────────────────────────────────────────────────────────

export async function saveStoreInfo(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const name        = str(formData, "store.name")
  const tagline     = str(formData, "store.tagline")
  const description = str(formData, "store.description")
  const phone       = str(formData, "store.phone")
  const email       = str(formData, "store.email")
  const address     = str(formData, "store.address")

  const fe: Record<string, string> = {}
  if (!name)               fe["store.name"]  = "Store name is required."
  if (name.length > 100)   fe["store.name"]  = "Store name must be 100 characters or fewer."
  if (!isValidEmail(email)) fe["store.email"] = "Enter a valid email address."
  if (!isValidPhone(phone)) fe["store.phone"] = "Enter a valid phone number."

  if (Object.keys(fe).length) return { success: false, fieldErrors: fe }

  try {
    await upsertSettings({
      "store.name":        name,
      "store.tagline":     tagline,
      "store.description": description,
      "store.phone":       phone,
      "store.email":       email,
      "store.address":     address,
    })
  } catch (err) {
    console.error("[saveStoreInfo]", err)
    return { success: false, error: "Failed to save store information." }
  }

  revalidatePath("/admin/settings")
  revalidatePath("/admin")
  return { success: true }
}

// ─── Order Settings ───────────────────────────────────────────────────────────

export async function saveOrderSettings(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const prefix             = str(formData, "order.number_prefix")
  const transferChargeRaw  = str(formData, "order.default_transfer_charge")
  const cancellationEnabled = formData.get("order.cancellation_enabled") === "true"
  const windowRaw          = str(formData, "order.cancellation_window_hours")

  const fe: Record<string, string> = {}
  if (!prefix)                          fe["order.number_prefix"]            = "Order prefix is required."
  if (!/^[A-Z0-9]{1,8}$/.test(prefix)) fe["order.number_prefix"]            = "Prefix must be 1–8 uppercase letters/numbers."
  if (!isNonNegativeFloat(transferChargeRaw)) fe["order.default_transfer_charge"] = "Enter a valid amount (0 or more)."
  if (!isNonNegativeInt(windowRaw))     fe["order.cancellation_window_hours"] = "Enter a whole number of hours (0 or more)."

  if (Object.keys(fe).length) return { success: false, fieldErrors: fe }

  try {
    await upsertSettings({
      "order.number_prefix":             prefix,
      "order.default_transfer_charge":   transferChargeRaw,
      "order.cancellation_enabled":      String(cancellationEnabled),
      "order.cancellation_window_hours": windowRaw,
    })
  } catch (err) {
    console.error("[saveOrderSettings]", err)
    return { success: false, error: "Failed to save order settings." }
  }

  revalidatePath("/admin/settings")
  return { success: true }
}

// ─── Inventory Settings ───────────────────────────────────────────────────────

export async function saveInventorySettings(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const thresholdRaw  = str(formData, "inventory.default_low_stock_threshold")
  const oosBehaviour  = str(formData, "inventory.out_of_stock_behaviour")

  const fe: Record<string, string> = {}
  if (!isNonNegativeInt(thresholdRaw))    fe["inventory.default_low_stock_threshold"] = "Enter a whole number (0 or more)."
  if (!["hide","show_unavailable"].includes(oosBehaviour))
    fe["inventory.out_of_stock_behaviour"] = "Select a valid option."

  if (Object.keys(fe).length) return { success: false, fieldErrors: fe }

  try {
    await upsertSettings({
      "inventory.default_low_stock_threshold": thresholdRaw,
      "inventory.out_of_stock_behaviour":      oosBehaviour,
    })
  } catch (err) {
    console.error("[saveInventorySettings]", err)
    return { success: false, error: "Failed to save inventory settings." }
  }

  revalidatePath("/admin/settings")
  return { success: true }
}

// ─── Store / Customer Settings ────────────────────────────────────────────────

export async function saveCustomerSettings(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const isActive           = formData.get("store.is_active") === "true"
  const reservationEnabled = formData.get("store.reservation_enabled") === "true"
  const pickupMessage      = str(formData, "store.pickup_only_message")

  try {
    await upsertSettings({
      "store.is_active":           String(isActive),
      "store.reservation_enabled": String(reservationEnabled),
      "store.pickup_only_message": pickupMessage,
    })
  } catch (err) {
    console.error("[saveCustomerSettings]", err)
    return { success: false, error: "Failed to save customer settings." }
  }

  revalidatePath("/admin/settings")
  revalidatePath("/")
  return { success: true }
}
