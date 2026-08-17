"use server"

// =============================================================================
// Control Center — Product & Variant Server Actions
// PROTECTED: every action requires an active admin session.
// =============================================================================

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { del } from "@vercel/blob"
import { prisma } from "@/lib/prisma"
import {
  generateUniqueProductSlug,
  getProductById,
  isSkuTaken,
} from "@/lib/products"
import { getSessionAdmin } from "@/lib/adminAuth"

// ─── Auth guard ───────────────────────────────────────────────────────────────

async function requireAdmin() {
  const admin = await getSessionAdmin()
  if (!admin) throw new Error("Unauthorized: admin authentication required.")
  return admin
}

export interface ActionResult {
  success: boolean
  error?: string
  fieldErrors?: Record<string, string>
}

// ─── Shared validation helpers ────────────────────────────────────────────────

function str(data: FormData, key: string): string {
  return (data.get(key) as string | null)?.trim() ?? ""
}

function optStr(data: FormData, key: string): string | null {
  const v = str(data, key)
  return v.length > 0 ? v : null
}

function optFloat(data: FormData, key: string): number | null {
  const v = str(data, key)
  if (!v) return null
  const n = parseFloat(v)
  return isNaN(n) ? null : n
}

// ─── Product validation ───────────────────────────────────────────────────────

function validateProductFields(data: FormData): {
  values: {
    name: string
    description: string | null
    categoryId: string
    basePrice: number
    comparePrice: number | null
    fabric: string | null
    careInstructions: string | null
    isActive: boolean
    isFeatured: boolean
  }
  fieldErrors: Record<string, string>
} {
  const fieldErrors: Record<string, string> = {}

  const name = str(data, "name")
  const description = optStr(data, "description")
  const categoryId = str(data, "categoryId")
  const basePriceRaw = str(data, "basePrice")
  const comparePriceRaw = str(data, "comparePrice")
  const fabric = optStr(data, "fabric")
  const careInstructions = optStr(data, "careInstructions")
  const isActive = data.get("isActive") === "true"
  const isFeatured = data.get("isFeatured") === "true"

  if (!name) fieldErrors.name = "Product name is required."
  else if (name.length < 2) fieldErrors.name = "Name must be at least 2 characters."
  else if (name.length > 200) fieldErrors.name = "Name must be 200 characters or fewer."

  if (!categoryId) fieldErrors.categoryId = "Category is required."

  const basePrice = parseFloat(basePriceRaw)
  if (!basePriceRaw) fieldErrors.basePrice = "Base price is required."
  else if (isNaN(basePrice) || basePrice < 0)
    fieldErrors.basePrice = "Enter a valid price (e.g. 499 or 1299.50)."

  const comparePrice = comparePriceRaw ? parseFloat(comparePriceRaw) : null
  if (comparePriceRaw && (isNaN(comparePrice!) || comparePrice! < 0))
    fieldErrors.comparePrice = "Enter a valid compare price or leave blank."

  return {
    values: {
      name, description, categoryId,
      basePrice: isNaN(basePrice) ? 0 : basePrice,
      comparePrice,
      fabric, careInstructions, isActive, isFeatured,
    },
    fieldErrors,
  }
}

// ─── Create product ───────────────────────────────────────────────────────────

export async function createProduct(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  try { await requireAdmin() } catch { return { success: false, error: "Unauthorized." } }
  const { values, fieldErrors } = validateProductFields(formData)
  if (Object.keys(fieldErrors).length > 0) return { success: false, fieldErrors }

  let productId: string
  try {
    const slug = await generateUniqueProductSlug(values.name)
    const product = await prisma.product.create({
      data: {
        name: values.name,
        slug,
        description: values.description,
        categoryId: values.categoryId,
        basePrice: values.basePrice,
        comparePrice: values.comparePrice,
        fabric: values.fabric,
        careInstructions: values.careInstructions,
        isActive: values.isActive,
        isFeatured: values.isFeatured,
      },
    })
    productId = product.id
  } catch (err) {
    console.error("[createProduct]", err)
    return { success: false, error: "Failed to create product. Please try again." }
  }

  revalidatePath("/control-center/products")
  revalidatePath("/products", "layout")
  redirect(`/control-center/products/${productId}/edit`)
}

/**
 * Same as createProduct but returns the new productId instead of redirecting.
 * Used by the New Product page so it can render ImageManager + VariantManager
 * inline without a full page navigation.
 */
export async function createProductAndReturn(
  _prev: ActionResult & { productId?: string },
  formData: FormData
): Promise<ActionResult & { productId?: string }> {
  try { await requireAdmin() } catch { return { success: false, error: "Unauthorized." } }
  const { values, fieldErrors } = validateProductFields(formData)
  if (Object.keys(fieldErrors).length > 0) return { success: false, fieldErrors }

  try {
    const slug = await generateUniqueProductSlug(values.name)
    const product = await prisma.product.create({
      data: {
        name: values.name,
        slug,
        description: values.description,
        categoryId: values.categoryId,
        basePrice: values.basePrice,
        comparePrice: values.comparePrice,
        fabric: values.fabric,
        careInstructions: values.careInstructions,
        isActive: values.isActive,
        isFeatured: values.isFeatured,
      },
    })
    revalidatePath("/control-center/products")
    revalidatePath("/products", "layout")
    return { success: true, productId: product.id }
  } catch (err) {
    console.error("[createProductAndReturn]", err)
    return { success: false, error: "Failed to create product. Please try again." }
  }
}

// ─── Update product ───────────────────────────────────────────────────────────

export async function updateProduct(
  id: string,
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  try { await requireAdmin() } catch { return { success: false, error: "Unauthorized." } }
  if (!id) return { success: false, error: "Product ID is required." }

  const { values, fieldErrors } = validateProductFields(formData)
  if (Object.keys(fieldErrors).length > 0) return { success: false, fieldErrors }

  try {
    const existing = await getProductById(id)
    if (!existing) return { success: false, error: "Product not found." }

    const slug =
      existing.name.trim().toLowerCase() === values.name.trim().toLowerCase()
        ? existing.slug
        : await generateUniqueProductSlug(values.name, id)

    await prisma.product.update({
      where: { id },
      data: {
        name: values.name,
        slug,
        description: values.description,
        categoryId: values.categoryId,
        basePrice: values.basePrice,
        comparePrice: values.comparePrice,
        fabric: values.fabric,
        careInstructions: values.careInstructions,
        isActive: values.isActive,
        isFeatured: values.isFeatured,
      },
    })
  } catch (err) {
    console.error("[updateProduct]", err)
    return { success: false, error: "Failed to update product. Please try again." }
  }

  revalidatePath("/control-center/products")
  revalidatePath(`/control-center/products/${id}/edit`)
  revalidatePath("/products", "layout")
  return { success: true }
}

// ─── Toggle product status ────────────────────────────────────────────────────

export async function toggleProductStatus(
  id: string,
  current: boolean
): Promise<ActionResult> {
  try { await requireAdmin() } catch { return { success: false, error: "Unauthorized." } }
  try {
    await prisma.product.update({ where: { id }, data: { isActive: !current } })
  } catch (err) {
    console.error("[toggleProductStatus]", err)
    return { success: false, error: "Failed to update status." }
  }
  revalidatePath("/control-center/products")
  revalidatePath("/products", "layout")
  return { success: true }
}

// ─── Variant validation ───────────────────────────────────────────────────────

function validateVariantFields(
  data: FormData,
  variantIndex: number
): {
  values: {
    sku: string
    color: string | null
    size: string | null
    length: string | null
    priceOverride: number | null
    isActive: boolean
  }
  fieldErrors: Record<string, string>
} {
  const fieldErrors: Record<string, string> = {}
  const prefix = `variant_${variantIndex}_`

  const sku = str(data, `${prefix}sku`)
  const color = optStr(data, `${prefix}color`)
  const size = optStr(data, `${prefix}size`)
  const length = optStr(data, `${prefix}length`)
  const priceOverride = optFloat(data, `${prefix}priceOverride`)
  const isActive = data.get(`${prefix}isActive`) !== "false"

  if (!sku) fieldErrors[`${prefix}sku`] = "SKU is required."
  else if (!/^[A-Za-z0-9_-]{2,50}$/.test(sku))
    fieldErrors[`${prefix}sku`] = "SKU must be 2–50 alphanumeric characters, hyphens, or underscores."

  if (!color && !size && !length)
    fieldErrors[`${prefix}attributes`] =
      "At least one attribute (colour, size, or length) is required."

  if (priceOverride !== null && priceOverride < 0)
    fieldErrors[`${prefix}priceOverride`] = "Price override must be positive."

  return { values: { sku, color, size, length, priceOverride, isActive }, fieldErrors }
}

// ─── Add variant ─────────────────────────────────────────────────────────────

export async function addVariant(
  productId: string,
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  try { await requireAdmin() } catch { return { success: false, error: "Unauthorized." } }
  const { values, fieldErrors } = validateVariantFields(formData, 0)
  if (Object.keys(fieldErrors).length > 0) return { success: false, fieldErrors }

  // Check SKU uniqueness
  if (await isSkuTaken(values.sku)) {
    return { success: false, fieldErrors: { variant_0_sku: `SKU "${values.sku}" is already in use.` } }
  }

  try {
    await prisma.productVariant.create({
      data: {
        productId,
        sku: values.sku,
        color: values.color,
        size: values.size,
        length: values.length,
        priceOverride: values.priceOverride,
        isActive: values.isActive,
      },
    })
  } catch (err) {
    console.error("[addVariant]", err)
    return { success: false, error: "Failed to add variant. Please try again." }
  }

  revalidatePath(`/control-center/products/${productId}/edit`)
  return { success: true }
}

// ─── Update variant ───────────────────────────────────────────────────────────

export async function updateVariant(
  variantId: string,
  productId: string,
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  try { await requireAdmin() } catch { return { success: false, error: "Unauthorized." } }
  const { values, fieldErrors } = validateVariantFields(formData, 0)
  if (Object.keys(fieldErrors).length > 0) return { success: false, fieldErrors }

  if (await isSkuTaken(values.sku, variantId)) {
    return { success: false, fieldErrors: { variant_0_sku: `SKU "${values.sku}" is already in use.` } }
  }

  try {
    await prisma.productVariant.update({
      where: { id: variantId },
      data: {
        sku: values.sku,
        color: values.color,
        size: values.size,
        length: values.length,
        priceOverride: values.priceOverride,
        isActive: values.isActive,
      },
    })
  } catch (err) {
    console.error("[updateVariant]", err)
    return { success: false, error: "Failed to update variant." }
  }

  revalidatePath(`/control-center/products/${productId}/edit`)
  return { success: true }
}

// ─── Toggle variant status ────────────────────────────────────────────────────

export async function toggleVariantStatus(
  variantId: string,
  productId: string,
  current: boolean
): Promise<ActionResult> {
  try { await requireAdmin() } catch { return { success: false, error: "Unauthorized." } }
  try {
    await prisma.productVariant.update({
      where: { id: variantId },
      data: { isActive: !current },
    })
  } catch (err) {
    console.error("[toggleVariantStatus]", err)
    return { success: false, error: "Failed to update variant status." }
  }
  revalidatePath(`/control-center/products/${productId}/edit`)
  return { success: true }
}

// =============================================================================
// IMAGE MANAGEMENT
//
// Architecture:
//   1. Client POSTs file to /api/upload/product-image (Route Handler)
//   2. Route Handler validates + uploads to Vercel Blob → returns { url }
//   3. Client calls saveProductImage(productId, url, altText) to persist metadata
//   4. ProductImage.imageUrl holds the Vercel Blob public URL
//   5. deleteProductImage deletes both the Blob file and the DB record
//
// No binary data is stored in PostgreSQL at any point.
// =============================================================================

/**
 * Persists a successfully uploaded image URL to the database.
 * Called by the client after the /api/upload/product-image route returns a URL.
 */
export async function saveProductImage(
  productId: string,
  imageUrl: string,
  altText: string | null,
  makePrimary: boolean
): Promise<ActionResult> {
  try { await requireAdmin() } catch { return { success: false, error: "Unauthorized." } }
  if (!productId) return { success: false, error: "Product ID is required." }
  if (!imageUrl) return { success: false, error: "Image URL is required." }

  try {
    const existingCount = await prisma.productImage.count({ where: { productId } })

    if (makePrimary || existingCount === 0) {
      // Demote current primary before promoting this one
      await prisma.productImage.updateMany({
        where: { productId, isPrimary: true },
        data: { isPrimary: false },
      })
    }

    await prisma.productImage.create({
      data: {
        productId,
        imageUrl,
        altText: altText || null,
        isPrimary: makePrimary || existingCount === 0,
        sortOrder: existingCount,
      },
    })
  } catch (err) {
    console.error("[saveProductImage]", err)
    return { success: false, error: "Failed to save image record." }
  }

  revalidatePath(`/control-center/products/${productId}/edit`)
  revalidatePath("/control-center/products")
  revalidatePath("/products", "layout")
  return { success: true }
}

/**
 * Sets a specific image as the primary image for a product.
 * Demotes all other images for that product first.
 */
export async function setPrimaryImage(
  imageId: string,
  productId: string
): Promise<ActionResult> {
  try { await requireAdmin() } catch { return { success: false, error: "Unauthorized." } }
  try {
    await prisma.$transaction([
      prisma.productImage.updateMany({
        where: { productId, isPrimary: true },
        data: { isPrimary: false },
      }),
      prisma.productImage.update({
        where: { id: imageId },
        data: { isPrimary: true },
      }),
    ])
  } catch (err) {
    console.error("[setPrimaryImage]", err)
    return { success: false, error: "Failed to update primary image." }
  }

  revalidatePath(`/control-center/products/${productId}/edit`)
  revalidatePath("/control-center/products")
  revalidatePath("/products", "layout")
  return { success: true }
}

/**
 * Updates the sortOrder of multiple images in a single transaction.
 * Called after the admin reorders images via drag-and-drop.
 * Expects an ordered array of image IDs.
 */
export async function reorderImages(
  productId: string,
  orderedIds: string[]
): Promise<ActionResult> {
  try { await requireAdmin() } catch { return { success: false, error: "Unauthorized." } }
  try {
    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.productImage.update({
          where: { id },
          data: { sortOrder: index },
        })
      )
    )
  } catch (err) {
    console.error("[reorderImages]", err)
    return { success: false, error: "Failed to reorder images." }
  }

  revalidatePath(`/control-center/products/${productId}/edit`)
  return { success: true }
}

/**
 * Deletes an image from both Vercel Blob storage and the database.
 * If the deleted image was the primary, promotes the next image automatically.
 */
export async function deleteProductImage(
  imageId: string,
  productId: string
): Promise<ActionResult> {
  try { await requireAdmin() } catch { return { success: false, error: "Unauthorized." } }
  try {
    // Fetch the record first so we have the URL and isPrimary flag
    const image = await prisma.productImage.findUnique({ where: { id: imageId } })
    if (!image) return { success: false, error: "Image not found." }

    // Delete from Vercel Blob (fire-and-forget if it was a local /public path)
    if (image.imageUrl.startsWith("https://")) {
      try {
        await del(image.imageUrl, { token: process.env.BLOB_READ_WRITE_TOKEN })
      } catch (blobErr) {
        // Log but don't fail — DB record cleanup is more important
        console.warn("[deleteProductImage] Blob deletion failed:", blobErr)
      }
    }

    // Delete DB record
    await prisma.productImage.delete({ where: { id: imageId } })

    // If we deleted the primary, promote the image with the lowest sortOrder
    if (image.isPrimary) {
      const next = await prisma.productImage.findFirst({
        where: { productId },
        orderBy: { sortOrder: "asc" },
      })
      if (next) {
        await prisma.productImage.update({
          where: { id: next.id },
          data: { isPrimary: true },
        })
      }
    }
  } catch (err) {
    console.error("[deleteProductImage]", err)
    return { success: false, error: "Failed to remove image." }
  }

  revalidatePath(`/control-center/products/${productId}/edit`)
  revalidatePath("/control-center/products")
  revalidatePath("/products", "layout")
  return { success: true }
}

// Legacy action — kept for backwards compatibility if any existing records
// were created with the old URL-paste form. Can be removed once all images
// have been migrated to Vercel Blob uploads.
export async function addProductImage(
  productId: string,
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  try { await requireAdmin() } catch { return { success: false, error: "Unauthorized." } }
  const imageUrl = (formData.get("imageUrl") as string | null)?.trim() ?? ""
  const altText = (formData.get("altText") as string | null)?.trim() || null
  const makePrimary = formData.get("isPrimary") === "true"

  if (!imageUrl)
    return { success: false, fieldErrors: { imageUrl: "Image URL is required." } }
  if (!/^(\/|https?:\/\/)/.test(imageUrl))
    return {
      success: false,
      fieldErrors: { imageUrl: 'Path must start with "/" or "https://".' },
    }

  return saveProductImage(productId, imageUrl, altText, makePrimary)
}
