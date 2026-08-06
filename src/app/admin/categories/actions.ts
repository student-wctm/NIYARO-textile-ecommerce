"use server"

// =============================================================================
// Admin Category Server Actions
//
// SECURITY TODO: No authentication or authorization yet.
// Before production, add admin session check at the top of every action:
//   const session = await getAdminSession()
//   if (!session) throw new Error("Unauthorized")
// =============================================================================

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import {
  generateUniqueCategorySlug,
  getCategoryById,
} from "@/lib/products"

export interface ActionResult {
  success: boolean
  error?: string
  fieldErrors?: Record<string, string>
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validateCategoryFields(data: FormData): {
  values: {
    name: string
    description: string | null
    sortOrder: number
    isActive: boolean
  }
  fieldErrors: Record<string, string>
} {
  const fieldErrors: Record<string, string> = {}

  const name = (data.get("name") as string | null)?.trim() ?? ""
  const description = (data.get("description") as string | null)?.trim() || null
  const sortOrderRaw = (data.get("sortOrder") as string | null)?.trim() ?? "0"
  const isActive = data.get("isActive") === "true"

  if (!name) fieldErrors.name = "Category name is required."
  else if (name.length < 2) fieldErrors.name = "Name must be at least 2 characters."
  else if (name.length > 80) fieldErrors.name = "Name must be 80 characters or fewer."

  const sortOrder = parseInt(sortOrderRaw, 10)
  if (isNaN(sortOrder) || sortOrder < 0) {
    fieldErrors.sortOrder = "Sort order must be a non-negative number."
  }

  return {
    values: { name, description, sortOrder: isNaN(sortOrder) ? 0 : sortOrder, isActive },
    fieldErrors,
  }
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createCategory(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const { values, fieldErrors } = validateCategoryFields(formData)
  if (Object.keys(fieldErrors).length > 0) return { success: false, fieldErrors }

  try {
    const slug = await generateUniqueCategorySlug(values.name)
    await prisma.category.create({
      data: {
        name: values.name,
        slug,
        description: values.description,
        sortOrder: values.sortOrder,
        isActive: values.isActive,
      },
    })
  } catch (err) {
    console.error("[createCategory]", err)
    return { success: false, error: "Failed to create category. Please try again." }
  }

  revalidatePath("/admin/categories")
  revalidatePath("/admin/products")
  revalidatePath("/products", "layout")
  redirect("/admin/categories")
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateCategory(
  id: string,
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  if (!id) return { success: false, error: "Category ID is required." }

  const { values, fieldErrors } = validateCategoryFields(formData)
  if (Object.keys(fieldErrors).length > 0) return { success: false, fieldErrors }

  try {
    const existing = await getCategoryById(id)
    if (!existing) return { success: false, error: "Category not found." }

    const slug =
      existing.name.trim().toLowerCase() === values.name.trim().toLowerCase()
        ? existing.slug
        : await generateUniqueCategorySlug(values.name, id)

    await prisma.category.update({
      where: { id },
      data: {
        name: values.name,
        slug,
        description: values.description,
        sortOrder: values.sortOrder,
        isActive: values.isActive,
      },
    })
  } catch (err) {
    console.error("[updateCategory]", err)
    return { success: false, error: "Failed to update category. Please try again." }
  }

  revalidatePath("/admin/categories")
  revalidatePath("/admin/products")
  revalidatePath("/products", "layout")
  redirect("/admin/categories")
}

// ─── Toggle status ────────────────────────────────────────────────────────────

export async function toggleCategoryStatus(
  id: string,
  current: boolean
): Promise<ActionResult> {
  try {
    await prisma.category.update({ where: { id }, data: { isActive: !current } })
  } catch (err) {
    console.error("[toggleCategoryStatus]", err)
    return { success: false, error: "Failed to update status." }
  }
  revalidatePath("/admin/categories")
  revalidatePath("/products", "layout")
  return { success: true }
}
