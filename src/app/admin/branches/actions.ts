"use server"

// =============================================================================
// Admin Branch Server Actions
//
// SECURITY TODO: This admin panel has NO authentication or authorization yet.
// Before going to production, every action in this file MUST be protected by:
//   1. A session check confirming the caller is an authenticated admin user.
//   2. Role-based authorization (admin role, not staff).
// Example guard to add at the top of each action:
//   const session = await getAdminSession()
//   if (!session) throw new Error("Unauthorized")
// =============================================================================

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { generateUniqueSlug } from "@/lib/branches"

// ─── Validation ───────────────────────────────────────────────────────────────

export interface ActionResult {
  success: boolean
  error?: string
  fieldErrors?: Record<string, string>
}

function validateBranchFields(data: FormData): {
  values: {
    name: string
    address: string
    city: string
    state: string
    pincode: string
    phone: string
    email: string | null
    latitude: number | null
    longitude: number | null
    isActive: boolean
  }
  fieldErrors: Record<string, string>
} {
  const fieldErrors: Record<string, string> = {}

  const name = (data.get("name") as string | null)?.trim() ?? ""
  const address = (data.get("address") as string | null)?.trim() ?? ""
  const city = (data.get("city") as string | null)?.trim() ?? ""
  const state = (data.get("state") as string | null)?.trim() ?? ""
  const pincode = (data.get("pincode") as string | null)?.trim() ?? ""
  const phone = (data.get("phone") as string | null)?.trim() ?? ""
  const emailRaw = (data.get("email") as string | null)?.trim() ?? ""
  const latRaw = (data.get("latitude") as string | null)?.trim() ?? ""
  const lngRaw = (data.get("longitude") as string | null)?.trim() ?? ""
  const isActive = data.get("isActive") === "true"

  // Required fields
  if (!name) fieldErrors.name = "Branch name is required."
  else if (name.length < 2) fieldErrors.name = "Name must be at least 2 characters."
  else if (name.length > 100) fieldErrors.name = "Name must be 100 characters or fewer."

  if (!address) fieldErrors.address = "Address is required."
  if (!city) fieldErrors.city = "City is required."
  if (!state) fieldErrors.state = "State is required."

  if (!pincode) {
    fieldErrors.pincode = "PIN code is required."
  } else if (!/^\d{6}$/.test(pincode)) {
    fieldErrors.pincode = "PIN code must be exactly 6 digits."
  }

  if (!phone) {
    fieldErrors.phone = "Phone number is required."
  } else if (!/^[+]?[\d\s\-()]{7,15}$/.test(phone)) {
    fieldErrors.phone = "Enter a valid phone number."
  }

  // Optional email
  const email =
    emailRaw.length > 0
      ? emailRaw
      : null
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fieldErrors.email = "Enter a valid email address."
  }

  // Optional coordinates
  let latitude: number | null = null
  let longitude: number | null = null

  if (latRaw.length > 0) {
    const parsed = parseFloat(latRaw)
    if (isNaN(parsed) || parsed < -90 || parsed > 90) {
      fieldErrors.latitude = "Latitude must be a number between -90 and 90."
    } else {
      latitude = parsed
    }
  }

  if (lngRaw.length > 0) {
    const parsed = parseFloat(lngRaw)
    if (isNaN(parsed) || parsed < -180 || parsed > 180) {
      fieldErrors.longitude = "Longitude must be a number between -180 and 180."
    } else {
      longitude = parsed
    }
  }

  return {
    values: { name, address, city, state, pincode, phone, email, latitude, longitude, isActive },
    fieldErrors,
  }
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createBranch(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const { values, fieldErrors } = validateBranchFields(formData)

  if (Object.keys(fieldErrors).length > 0) {
    return { success: false, fieldErrors }
  }

  try {
    const slug = await generateUniqueSlug(values.name)

    await prisma.branch.create({
      data: {
        name: values.name,
        slug,
        address: values.address,
        city: values.city,
        state: values.state,
        pincode: values.pincode,
        phone: values.phone,
        email: values.email,
        latitude: values.latitude,
        longitude: values.longitude,
        isActive: values.isActive,
      },
    })
  } catch (err) {
    console.error("[createBranch]", err)
    return { success: false, error: "Failed to create branch. Please try again." }
  }

  revalidatePath("/admin/branches")
  revalidatePath("/(customer)/branches", "layout")
  redirect("/admin/branches")
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateBranch(
  id: string,
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  if (!id) return { success: false, error: "Branch ID is required." }

  const { values, fieldErrors } = validateBranchFields(formData)

  if (Object.keys(fieldErrors).length > 0) {
    return { success: false, fieldErrors }
  }

  try {
    // Regenerate slug only if name changed
    const existing = await prisma.branch.findUnique({
      where: { id },
      select: { name: true, slug: true },
    })
    if (!existing) return { success: false, error: "Branch not found." }

    const slug =
      existing.name.trim().toLowerCase() === values.name.trim().toLowerCase()
        ? existing.slug
        : await generateUniqueSlug(values.name, id)

    await prisma.branch.update({
      where: { id },
      data: {
        name: values.name,
        slug,
        address: values.address,
        city: values.city,
        state: values.state,
        pincode: values.pincode,
        phone: values.phone,
        email: values.email,
        latitude: values.latitude,
        longitude: values.longitude,
        isActive: values.isActive,
      },
    })
  } catch (err) {
    console.error("[updateBranch]", err)
    return { success: false, error: "Failed to update branch. Please try again." }
  }

  revalidatePath("/admin/branches")
  revalidatePath(`/admin/branches/${id}/edit`)
  revalidatePath("/(customer)/branches", "layout")
  redirect("/admin/branches")
}

// ─── Toggle active status ─────────────────────────────────────────────────────

export async function toggleBranchStatus(
  id: string,
  currentStatus: boolean
): Promise<ActionResult> {
  if (!id) return { success: false, error: "Branch ID is required." }

  try {
    await prisma.branch.update({
      where: { id },
      data: { isActive: !currentStatus },
    })
  } catch (err) {
    console.error("[toggleBranchStatus]", err)
    return { success: false, error: "Failed to update branch status." }
  }

  revalidatePath("/admin/branches")
  revalidatePath("/(customer)/branches", "layout")
  return { success: true }
}
