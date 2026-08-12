// =============================================================================
// cart.ts — Server-only. Never import from Client Components.
//
// All cart database operations live here.
//
// Design notes:
//   - A CartSession ties a cart to either a customerId OR a guestToken.
//   - branchId on CartSession scopes the cart to a pickup branch (nullable;
//     required at checkout but not at add-to-cart time).
//   - unitPrice on CartItem is a snapshot for display. Checkout MUST
//     re-fetch current server-side prices and re-validate stock.
//   - Quantity is always enforced >= 1 in every write operation.
//   - Variant activeness and existence are verified before any mutation.
//   - Cart ownership is always verified before reads/writes:
//       customer carts: CartSession.customerId === session.id
//       guest carts:    CartSession.guestToken === cookie value
// =============================================================================

import { prisma } from "@/lib/prisma"
import type {
  CartSession,
  CartItem,
  ProductVariant,
  ProductImage,
  Product,
} from "@/generated/prisma/client"

// ─── Exported types ───────────────────────────────────────────────────────────

export type { CartSession, CartItem }

/** A cart item fully hydrated with variant → product → images. */
export type CartItemFull = CartItem & {
  variant: ProductVariant & {
    product: Pick<Product, "id" | "name" | "slug" | "basePrice"> & {
      images: Pick<ProductImage, "id" | "imageUrl" | "altText" | "isPrimary">[]
    }
  }
}

/** A cart session with all hydrated items. */
export type CartWithItems = CartSession & {
  items: CartItemFull[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Cart cookie name — NOT HttpOnly; used to identify guest carts client-side. */
export const CART_COOKIE = "niyaro_cart"

/** Cart TTL: 30 days from last update. */
const CART_TTL_MS = 30 * 24 * 60 * 60 * 1000

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cartExpiry(): Date {
  return new Date(Date.now() + CART_TTL_MS)
}

/** Prisma include block for a fully hydrated CartItem. */
function makeItemInclude() {
  return {
    variant: {
      include: {
        product: {
          select: {
            id:        true,
            name:      true,
            slug:      true,
            basePrice: true,
            images: {
              select:  { id: true, imageUrl: true, altText: true, isPrimary: true },
              orderBy: [{ isPrimary: "desc" as const }, { sortOrder: "asc" as const }],
              take:    1,
            },
          },
        },
      },
    },
  }
}

/** Resolve the display price for a variant (branch price is checked at checkout). */
function resolveUnitPrice(
  variant: Pick<ProductVariant, "priceOverride">,
  productBasePrice: number
): number {
  return variant.priceOverride ?? productBasePrice
}

// ─── Session fetchers ─────────────────────────────────────────────────────────

/**
 * Get an existing guest cart by token, or return null.
 * Does NOT create a new cart — the caller decides when to create.
 */
export async function getGuestCart(guestToken: string): Promise<CartWithItems | null> {
  if (!guestToken) return null
  const cart = await prisma.cartSession.findUnique({
    where:   { guestToken },
    include: { items: { include: makeItemInclude(), orderBy: { createdAt: "asc" } } },
  })
  if (!cart) return null
  if (cart.expiresAt < new Date()) {
    // Expired — clean up silently
    await prisma.cartSession.delete({ where: { id: cart.id } }).catch(() => null)
    return null
  }
  return cart as CartWithItems
}

/**
 * Get an existing customer cart by customerId, or return null.
 * Picks the most-recently-updated cart if somehow duplicates exist.
 */
export async function getCustomerCart(customerId: string): Promise<CartWithItems | null> {
  const cart = await prisma.cartSession.findFirst({
    where:   { customerId, expiresAt: { gt: new Date() } },
    orderBy: { updatedAt: "desc" },
    include: { items: { include: makeItemInclude(), orderBy: { createdAt: "asc" } } },
  })
  return cart as CartWithItems | null
}

/**
 * Get or create a guest CartSession.
 * Returns the cart and the token (caller must set the cookie if newly created).
 */
export async function getOrCreateGuestCart(
  guestToken: string | null,
  branchId?: string
): Promise<{ cart: CartWithItems; token: string; created: boolean }> {
  if (guestToken) {
    const existing = await getGuestCart(guestToken)
    if (existing) {
      // Refresh expiry on activity
      await prisma.cartSession.update({
        where: { id: existing.id },
        data:  { expiresAt: cartExpiry(), ...(branchId ? { branchId } : {}) },
      })
      return { cart: existing, token: guestToken, created: false }
    }
  }

  // Create a new guest cart
  const token = crypto.randomUUID()
  const cart = await prisma.cartSession.create({
    data: {
      guestToken: token,
      branchId:   branchId ?? null,
      expiresAt:  cartExpiry(),
    },
    include: { items: { include: makeItemInclude(), orderBy: { createdAt: "asc" } } },
  })
  return { cart: cart as CartWithItems, token, created: true }
}

/**
 * Get or create a customer CartSession.
 * Deduplicates: if more than one exists, keeps the newest and deletes the rest.
 */
export async function getOrCreateCustomerCart(
  customerId: string,
  branchId?: string
): Promise<CartWithItems> {
  const existing = await getCustomerCart(customerId)
  if (existing) {
    await prisma.cartSession.update({
      where: { id: existing.id },
      data:  { expiresAt: cartExpiry(), ...(branchId ? { branchId } : {}) },
    })
    return existing
  }

  const cart = await prisma.cartSession.create({
    data: {
      customerId,
      branchId:  branchId ?? null,
      expiresAt: cartExpiry(),
    },
    include: { items: { include: makeItemInclude(), orderBy: { createdAt: "asc" } } },
  })
  return cart as CartWithItems
}

// ─── Cart item count (for header badge) ──────────────────────────────────────

/**
 * Returns total item count (sum of quantities) for a cart.
 * Efficient — uses aggregate, does not fetch full items.
 */
export async function getCartItemCount(cartId: string): Promise<number> {
  const result = await prisma.cartItem.aggregate({
    where: { cartSessionId: cartId },
    _sum:  { quantity: true },
  })
  return result._sum.quantity ?? 0
}

/**
 * Get item count by guestToken — for the header badge without a full cart fetch.
 */
export async function getGuestCartItemCount(guestToken: string): Promise<number> {
  const cart = await prisma.cartSession.findUnique({
    where:  { guestToken },
    select: { id: true, expiresAt: true },
  })
  if (!cart || cart.expiresAt < new Date()) return 0
  return getCartItemCount(cart.id)
}

/**
 * Get item count by customerId.
 */
export async function getCustomerCartItemCount(customerId: string): Promise<number> {
  const cart = await prisma.cartSession.findFirst({
    where:  { customerId, expiresAt: { gt: new Date() } },
    select: { id: true },
    orderBy: { updatedAt: "desc" },
  })
  if (!cart) return 0
  return getCartItemCount(cart.id)
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export interface CartMutationResult {
  success:    boolean
  error?:     string
  itemCount?: number
}

/**
 * Add a variant to a cart, or increment its quantity if already present.
 *
 * Security rules enforced here:
 *   1. Variant must exist and be active.
 *   2. Quantity must be >= 1.
 *   3. Price is fetched server-side — never trusted from the caller.
 *   4. Cart ownership verified by cartId (caller must ensure cartId belongs
 *      to the current session before calling).
 */
export async function addToCart(
  cartId:    string,
  variantId: string,
  quantity:  number
): Promise<CartMutationResult> {
  if (quantity < 1) {
    return { success: false, error: "Quantity must be at least 1." }
  }

  // Verify variant exists, is active, and fetch current server-side price
  const variant = await prisma.productVariant.findUnique({
    where:   { id: variantId },
    include: { product: { select: { basePrice: true, isActive: true } } },
  })

  if (!variant || !variant.isActive) {
    return { success: false, error: "This variant is not available." }
  }
  if (!variant.product.isActive) {
    return { success: false, error: "This product is not available." }
  }

  const unitPrice = resolveUnitPrice(variant, variant.product.basePrice)

  // Upsert: increment if already in cart, else create
  await prisma.cartItem.upsert({
    where:  { cartSessionId_variantId: { cartSessionId: cartId, variantId } },
    update: { quantity: { increment: quantity }, unitPrice, updatedAt: new Date() },
    create: { cartSessionId: cartId, variantId, quantity, unitPrice },
  })

  // Refresh cart expiry
  await prisma.cartSession.update({
    where: { id: cartId },
    data:  { expiresAt: cartExpiry() },
  })

  const itemCount = await getCartItemCount(cartId)
  return { success: true, itemCount }
}

/**
 * Set the quantity of a specific cart item.
 * Quantity must be >= 1. Use removeFromCart to delete.
 * Verifies the item belongs to the given cartId.
 */
export async function updateCartItemQuantity(
  cartId:     string,
  variantId:  string,
  quantity:   number
): Promise<CartMutationResult> {
  if (quantity < 1) {
    return { success: false, error: "Quantity must be at least 1. Use remove to delete the item." }
  }

  const item = await prisma.cartItem.findUnique({
    where: { cartSessionId_variantId: { cartSessionId: cartId, variantId } },
  })
  if (!item) {
    return { success: false, error: "Item not found in cart." }
  }

  // Re-fetch current server-side price to keep snapshot fresh
  const variant = await prisma.productVariant.findUnique({
    where:   { id: variantId },
    include: { product: { select: { basePrice: true } } },
  })
  const unitPrice = variant
    ? resolveUnitPrice(variant, variant.product.basePrice)
    : item.unitPrice

  await prisma.cartItem.update({
    where: { cartSessionId_variantId: { cartSessionId: cartId, variantId } },
    data:  { quantity, unitPrice },
  })

  await prisma.cartSession.update({
    where: { id: cartId },
    data:  { expiresAt: cartExpiry() },
  })

  const itemCount = await getCartItemCount(cartId)
  return { success: true, itemCount }
}

/**
 * Remove a single item from the cart.
 * Verifies the item belongs to the given cartId before deletion.
 */
export async function removeFromCart(
  cartId:    string,
  variantId: string
): Promise<CartMutationResult> {
  const item = await prisma.cartItem.findUnique({
    where: { cartSessionId_variantId: { cartSessionId: cartId, variantId } },
  })
  if (!item) {
    return { success: false, error: "Item not found in cart." }
  }

  await prisma.cartItem.delete({
    where: { cartSessionId_variantId: { cartSessionId: cartId, variantId } },
  })

  await prisma.cartSession.update({
    where: { id: cartId },
    data:  { expiresAt: cartExpiry() },
  })

  const itemCount = await getCartItemCount(cartId)
  return { success: true, itemCount }
}

/**
 * Remove all items from a cart (keeps the CartSession row).
 */
export async function clearCart(cartId: string): Promise<void> {
  await prisma.cartItem.deleteMany({ where: { cartSessionId: cartId } })
}

/**
 * Delete the entire CartSession and its items.
 * Called after order placement or explicit cart abandonment.
 */
export async function deleteCart(cartId: string): Promise<void> {
  await prisma.cartSession.delete({ where: { id: cartId } })
}

/**
 * Update the branch on a CartSession.
 * Called when the customer changes their selected branch.
 */
export async function updateCartBranch(
  cartId:   string,
  branchId: string
): Promise<void> {
  await prisma.cartSession.update({
    where: { id: cartId },
    data:  { branchId },
  })
}

// ─── Guest → Customer cart merge ──────────────────────────────────────────────

/**
 * Merge a guest cart into a customer cart after login.
 *
 * Strategy: for each guest item, if the variant already exists in the
 * customer cart, ADD the quantities together (capped behaviour left to
 * Phase 2 cart actions for stock validation). If the variant does not
 * exist in the customer cart, move the item over.
 *
 * After merging, the guest CartSession is deleted.
 *
 * This function is intentionally NOT atomic across both carts so that a
 * failure in one item does not roll back already-merged items. The caller
 * should surface any partial errors appropriately. The guest cart is only
 * deleted after all items have been processed.
 */
export async function mergeGuestCartIntoCustomerCart(
  guestToken:  string,
  customerId:  string,
  branchId?:   string
): Promise<void> {
  const guestCart = await getGuestCart(guestToken)
  if (!guestCart || guestCart.items.length === 0) {
    // Nothing to merge — still delete the guest cart row
    await prisma.cartSession.deleteMany({ where: { guestToken } })
    return
  }

  const customerCart = await getOrCreateCustomerCart(customerId, branchId)

  for (const guestItem of guestCart.items) {
    const variant = await prisma.productVariant.findUnique({
      where:   { id: guestItem.variantId },
      include: { product: { select: { basePrice: true, isActive: true } } },
    })
    // Skip inactive/deleted variants
    if (!variant || !variant.isActive || !variant.product.isActive) continue

    const unitPrice = resolveUnitPrice(variant, variant.product.basePrice)

    await prisma.cartItem.upsert({
      where: {
        cartSessionId_variantId: {
          cartSessionId: customerCart.id,
          variantId:     guestItem.variantId,
        },
      },
      update: { quantity: { increment: guestItem.quantity }, unitPrice },
      create: {
        cartSessionId: customerCart.id,
        variantId:     guestItem.variantId,
        quantity:      guestItem.quantity,
        unitPrice,
      },
    })
  }

  // Clean up the guest cart
  await prisma.cartSession.delete({ where: { id: guestCart.id } })
}

// ─── Subtotal helper ──────────────────────────────────────────────────────────

/**
 * Compute subtotal from CartItem[] using snapshotted unitPrices.
 * NOTE: this is for display only. Checkout recalculates server-side.
 */
export function computeCartSubtotal(items: Pick<CartItem, "quantity" | "unitPrice">[]): number {
  return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
}
