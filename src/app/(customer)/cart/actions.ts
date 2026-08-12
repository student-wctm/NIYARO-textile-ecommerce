"use server"

// =============================================================================
// Cart Server Actions — Phase 2
//
// Security contract:
//   - customerId is NEVER read from the browser. It comes exclusively from
//     the server-side session (getSessionCustomer()).
//   - guestToken comes from the niyaro_cart cookie, which is set by the
//     server and read server-side. It is not HttpOnly (guests need to read
//     it to send it), but it is never treated as authoritative — it is just
//     a lookup key for a DB row that is independently validated.
//   - Price and stock are never trusted from the client. All prices are
//     resolved server-side via addToCart / updateCartItemQuantity in cart.ts.
//   - Branch is validated against the DB before being assigned.
//   - Cart ownership is enforced by resolveCartId() which matches the cart
//     to either the authenticated customer or the guest token, never an
//     arbitrary ID from the client.
// =============================================================================

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { getSessionCustomer } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  CART_COOKIE,
  getGuestCart,
  getOrCreateGuestCart,
  getOrCreateCustomerCart,
  addToCart        as dbAddToCart,
  updateCartItemQuantity,
  removeFromCart   as dbRemoveFromCart,
  clearCart        as dbClearCart,
  updateCartBranch,
  mergeGuestCartIntoCustomerCart,
} from "@/lib/cart"

export interface CartActionResult {
  success:    boolean
  error?:     string
  itemCount?: number
}

// ─── Internal: resolve the cartId for the current request ────────────────────
//
// For logged-in customers  → get-or-create their customer CartSession.
// For guests               → get-or-create a guest CartSession, set cookie.
//
// Returns { cartId, isGuest } or throws if something unexpected happens.
// The returned cartId is always owned by the caller (session or guest token).

async function resolveCart(branchId?: string): Promise<{
  cartId:  string
  isGuest: boolean
}> {
  const cookieStore = await cookies()

  // ── Logged-in customer ────────────────────────────────────────────────────
  const customer = await getSessionCustomer()
  if (customer) {
    const cart = await getOrCreateCustomerCart(customer.id, branchId)
    return { cartId: cart.id, isGuest: false }
  }

  // ── Guest ─────────────────────────────────────────────────────────────────
  const existingToken = cookieStore.get(CART_COOKIE)?.value ?? null
  const { cart, token, created } = await getOrCreateGuestCart(existingToken, branchId)

  if (created) {
    // New guest cart — set the token cookie so subsequent requests can find it
    cookieStore.set(CART_COOKIE, token, {
      httpOnly: false,        // needs to be readable by client for future cart page
      sameSite: "lax",
      secure:   process.env.NODE_ENV === "production",
      path:     "/",
      maxAge:   30 * 24 * 60 * 60,
    })
  }

  return { cartId: cart.id, isGuest: true }
}

// ─── Action: addToCart ────────────────────────────────────────────────────────

/**
 * Add a variant to the current visitor's cart.
 * - variantId and quantity are validated server-side.
 * - Price is fetched server-side; client-provided price is ignored.
 * - Works for both guest and logged-in users.
 */
export async function addToCart(
  variantId: string,
  quantity:  number
): Promise<CartActionResult> {
  if (!variantId?.trim()) {
    return { success: false, error: "Variant ID is required." }
  }
  if (!Number.isInteger(quantity) || quantity < 1) {
    return { success: false, error: "Quantity must be a positive integer." }
  }

  try {
    const { cartId } = await resolveCart()
    const result = await dbAddToCart(cartId, variantId, quantity)
    if (!result.success) return result

    revalidatePath("/cart")
    return result
  } catch (err) {
    console.error("[addToCart action]", err)
    return { success: false, error: "Failed to add item to cart." }
  }
}

// ─── Action: updateCartQuantity ───────────────────────────────────────────────

/**
 * Set the quantity of an existing cart item.
 * Quantity must be >= 1. To remove, use removeFromCart.
 */
export async function updateCartQuantity(
  variantId: string,
  quantity:  number
): Promise<CartActionResult> {
  if (!variantId?.trim()) {
    return { success: false, error: "Variant ID is required." }
  }
  if (!Number.isInteger(quantity) || quantity < 1) {
    return { success: false, error: "Quantity must be at least 1." }
  }

  try {
    const { cartId } = await resolveCart()
    const result = await updateCartItemQuantity(cartId, variantId, quantity)
    if (!result.success) return result

    revalidatePath("/cart")
    return result
  } catch (err) {
    console.error("[updateCartQuantity action]", err)
    return { success: false, error: "Failed to update quantity." }
  }
}

// ─── Action: removeFromCart ───────────────────────────────────────────────────

/**
 * Remove a single variant from the cart.
 */
export async function removeFromCart(variantId: string): Promise<CartActionResult> {
  if (!variantId?.trim()) {
    return { success: false, error: "Variant ID is required." }
  }

  try {
    const { cartId } = await resolveCart()
    const result = await dbRemoveFromCart(cartId, variantId)
    if (!result.success) return result

    revalidatePath("/cart")
    return result
  } catch (err) {
    console.error("[removeFromCart action]", err)
    return { success: false, error: "Failed to remove item from cart." }
  }
}

// ─── Action: clearCart ────────────────────────────────────────────────────────

/**
 * Remove all items from the cart (keeps the CartSession row).
 */
export async function clearCart(): Promise<CartActionResult> {
  try {
    const { cartId } = await resolveCart()
    await dbClearCart(cartId)

    revalidatePath("/cart")
    return { success: true, itemCount: 0 }
  } catch (err) {
    console.error("[clearCart action]", err)
    return { success: false, error: "Failed to clear cart." }
  }
}

// ─── Action: setCartBranch ────────────────────────────────────────────────────

/**
 * Assign a pickup branch to the current cart.
 * Branch existence and isActive status are verified server-side.
 * branchId from the client is treated as untrusted input until verified.
 */
export async function setCartBranch(branchId: string): Promise<CartActionResult> {
  if (!branchId?.trim()) {
    return { success: false, error: "Branch ID is required." }
  }

  // Verify the branch exists and is active
  const branch = await prisma.branch.findUnique({
    where:  { id: branchId },
    select: { id: true, isActive: true },
  })

  if (!branch) {
    return { success: false, error: "Branch not found." }
  }
  if (!branch.isActive) {
    return { success: false, error: "This branch is not currently active." }
  }

  try {
    const { cartId } = await resolveCart(branchId)
    await updateCartBranch(cartId, branchId)

    revalidatePath("/cart")
    return { success: true }
  } catch (err) {
    console.error("[setCartBranch action]", err)
    return { success: false, error: "Failed to set branch." }
  }
}

// ─── Action: mergeGuestCart ───────────────────────────────────────────────────

/**
 * Merge the current guest cart into the authenticated customer's cart.
 * Called from login/register actions after a session is established.
 *
 * - Reads the niyaro_cart cookie server-side.
 * - Calls mergeGuestCartIntoCustomerCart from cart.ts.
 * - Clears the niyaro_cart cookie after a successful merge.
 * - If no guest cart exists, returns success silently.
 *
 * NOTE: This action should only be called from other server-side code
 * (e.g. login/register actions), never directly from client UI.
 */
export async function mergeGuestCart(
  customerId:  string,
  branchId?:   string
): Promise<void> {
  const cookieStore = await cookies()
  const guestToken  = cookieStore.get(CART_COOKIE)?.value

  if (!guestToken) return  // no guest cart — nothing to merge

  try {
    await mergeGuestCartIntoCustomerCart(guestToken, customerId, branchId)
    // Clear the guest cart cookie after successful merge
    cookieStore.set(CART_COOKIE, "", { maxAge: 0, path: "/" })
  } catch (err) {
    // Log but don't fail — cart merge failure must not block login
    console.error("[mergeGuestCart action]", err)
  }
}
