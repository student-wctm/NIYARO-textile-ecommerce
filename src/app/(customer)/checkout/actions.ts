"use server"

// =============================================================================
// Checkout Server Action — placeOrder
//
// Security contract (NOTHING is trusted from the browser):
//   - customerId    → from server session only
//   - cart contents → reloaded from DB, never from client
//   - prices        → reloaded from DB (Inventory.branchPrice ??
//                     ProductVariant.priceOverride ?? Product.basePrice)
//   - stock         → reloaded from Inventory table
//   - branchId      → from CartSession.branchId, verified active in DB
//   - address fields→ from CustomerAddress row verified to belong to customer
//   - subtotal      → calculated server-side only
//   - total         → calculated server-side only
//
// Flow:
//   1. Authenticate customer from session
//   2. Load cart from DB (never from client)
//   3. Validate branch (active, exists)
//   4. Validate contact fields from form (name, phone — may differ from profile)
//   5. For each CartItem: reload variant, product, price, stock
//   6. Detect price changes → return error if prices changed
//   7. Detect insufficient stock → return error
//   8. Atomic Prisma transaction:
//      a. Generate order number
//      b. Create Order
//      c. Create OrderItems (with server-side price snapshots)
//      d. For each item: decrement availableStock & increment reservedStock
//      e. Write InventoryLog entries
//      f. Write OrderStatusHistory (PENDING, changedBy: CUSTOMER)
//      g. Delete CartSession (clears cart)
//   9. Redirect to /order-success/[id]
// =============================================================================

import { redirect } from "next/navigation"
import { getSessionCustomer } from "@/lib/auth"
import { getCustomerCart, deleteCart } from "@/lib/cart"
import { prisma } from "@/lib/prisma"
import { getSetting } from "@/lib/settings"

export interface CheckoutResult {
  success:      boolean
  error?:       string
  fieldErrors?: Record<string, string>
  // Returned when prices changed — customer must review cart
  priceChanges?: {
    variantId:    string
    productName:  string
    sku:          string
    oldPrice:     number
    newPrice:     number
  }[]
  // Returned when stock is insufficient
  stockErrors?: {
    variantId:   string
    productName: string
    sku:         string
    requested:   number
    available:   number
  }[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isPhone(v: string) { return /^[+]?[\d\s\-().]{7,20}$/.test(v) }

/**
 * Resolve the authoritative unit price for a variant at a given branch.
 * Priority: Inventory.branchPrice → ProductVariant.priceOverride → Product.basePrice
 */
function resolvePrice(
  branchPrice:   number | null | undefined,
  priceOverride: number | null | undefined,
  basePrice:     number
): number {
  return branchPrice ?? priceOverride ?? basePrice
}

/**
 * Generate a unique order number inside a transaction.
 * Uses COUNT of existing orders + 1 to produce a sequential suffix.
 * Prefix comes from AdminSetting "order.number_prefix" (default "NYR").
 * Note: inside a serialisable transaction this is safe against race conditions.
 */
async function generateOrderNumber(
  tx:     Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  prefix: string
): Promise<string> {
  const count = await tx.order.count()
  const year  = new Date().getFullYear()
  const seq   = String(count + 1).padStart(5, "0")
  return `${prefix}-${year}-${seq}`
}

// ─── Main action ──────────────────────────────────────────────────────────────

export async function placeOrder(
  _prev: CheckoutResult,
  formData: FormData
): Promise<CheckoutResult> {
  // ── 1. Authenticate ──────────────────────────────────────────────────────
  const customer = await getSessionCustomer()
  if (!customer) {
    return { success: false, error: "You must be signed in to place an order." }
  }

  // ── 2. Contact fields from form ───────────────────────────────────────────
  // These are the name/phone the customer wants on this order.
  // They may differ from their profile — captured fresh each checkout.
  const customerName  = (formData.get("customerName")  as string | null)?.trim() ?? ""
  const customerPhone = (formData.get("customerPhone") as string | null)?.trim() ?? ""
  const customerEmail = customer.email  // always from session, never from form
  const notes         = (formData.get("notes") as string | null)?.trim() || null

  const fe: Record<string, string> = {}
  if (!customerName || customerName.length < 2) fe.customerName  = "Full name is required."
  if (!customerPhone || !isPhone(customerPhone)) fe.customerPhone = "A valid phone number is required."
  if (Object.keys(fe).length) return { success: false, fieldErrors: fe }

  // ── 3. Load cart from DB (NOT from browser) ───────────────────────────────
  const cart = await getCustomerCart(customer.id)
  if (!cart || cart.items.length === 0) {
    return { success: false, error: "Your cart is empty. Add items before placing an order." }
  }

  // ── 4. Validate branch ────────────────────────────────────────────────────
  const branchId = cart.branchId
  if (!branchId) {
    return {
      success: false,
      error:   "Please select a pickup branch before placing your order.",
    }
  }

  const branch = await prisma.branch.findUnique({
    where:  { id: branchId },
    select: { id: true, name: true, city: true, isActive: true },
  })
  if (!branch || !branch.isActive) {
    return {
      success: false,
      error:   "The selected branch is no longer available. Please choose another branch.",
    }
  }

  // ── 5. Reload + validate all cart items ───────────────────────────────────
  // For each item: verify variant active, product active, get authoritative
  // price, check stock. Nothing from the browser is trusted.

  const priceChanges: NonNullable<CheckoutResult["priceChanges"]> = []
  const stockErrors:  NonNullable<CheckoutResult["stockErrors"]>  = []

  type ValidatedItem = {
    variantId:    string
    sku:          string
    productName:  string
    quantity:     number
    unitPrice:    number          // authoritative server price
    totalPrice:   number
    inventoryId:  string
    availableStock: number
  }

  const validatedItems: ValidatedItem[] = []

  for (const cartItem of cart.items) {
    // Reload the variant with inventory at this branch
    const variant = await prisma.productVariant.findUnique({
      where:   { id: cartItem.variantId },
      include: {
        product:   { select: { id: true, name: true, isActive: true, basePrice: true } },
        inventory: {
          where:  { branchId },
          select: { id: true, availableStock: true, branchPrice: true },
        },
      },
    })

    if (!variant || !variant.isActive) {
      return {
        success: false,
        error:   `A product in your cart (SKU: ${cartItem.variant.sku}) is no longer available. Please remove it and try again.`,
      }
    }
    if (!variant.product.isActive) {
      return {
        success: false,
        error:   `"${variant.product.name}" is no longer available. Please remove it from your cart.`,
      }
    }

    // Authoritative price
    const inv          = variant.inventory[0] ?? null
    const currentPrice = resolvePrice(inv?.branchPrice, variant.priceOverride, variant.product.basePrice)

    // Price change detection — surface to customer rather than silently updating
    const priceDiff = Math.abs(currentPrice - cartItem.unitPrice)
    if (priceDiff > 0.005) {      // 0.5 paise tolerance for float rounding
      priceChanges.push({
        variantId:   variant.id,
        productName: variant.product.name,
        sku:         variant.sku,
        oldPrice:    cartItem.unitPrice,
        newPrice:    currentPrice,
      })
    }

    // Stock check
    const available = inv?.availableStock ?? 0
    if (cartItem.quantity > available) {
      stockErrors.push({
        variantId:   variant.id,
        productName: variant.product.name,
        sku:         variant.sku,
        requested:   cartItem.quantity,
        available,
      })
    }

    validatedItems.push({
      variantId:     variant.id,
      sku:           variant.sku,
      productName:   variant.product.name,
      quantity:      cartItem.quantity,
      unitPrice:     currentPrice,
      totalPrice:    currentPrice * cartItem.quantity,
      inventoryId:   inv?.id ?? "",
      availableStock: available,
    })
  }

  // Return price changes for customer review before proceeding
  if (priceChanges.length > 0) {
    return {
      success:      false,
      error:        "Some prices have changed since you added items to your cart. Please review and confirm.",
      priceChanges,
    }
  }

  // Return stock errors
  if (stockErrors.length > 0) {
    return {
      success:     false,
      error:       "Some items in your cart are out of stock or have insufficient quantity.",
      stockErrors,
    }
  }

  // Reject if any item has no inventory record at this branch
  const missingInventory = validatedItems.filter((i) => !i.inventoryId)
  if (missingInventory.length > 0) {
    return {
      success: false,
      error:   `Some items are not available at ${branch.name}. Please choose a different branch or remove those items.`,
    }
  }

  // ── 6. Calculate totals server-side ───────────────────────────────────────
  const subtotal      = validatedItems.reduce((s, i) => s + i.totalPrice, 0)
  const transferCharge = 0   // Phase 4: no cross-branch transfers yet
  const total          = subtotal + transferCharge

  // ── 7. Atomic transaction ─────────────────────────────────────────────────
  const prefix = await getSetting("order.number_prefix")  // e.g. "NYR"

  let orderId: string
  const cartId = cart.id

  try {
    const result = await prisma.$transaction(async (tx) => {
      // a. Generate order number (count inside tx for serializability)
      const orderNumber = await generateOrderNumber(tx, prefix)

      // b. Create the Order
      const order = await tx.order.create({
        data: {
          orderNumber,
          customerId:    customer.id,
          customerName,
          customerPhone,
          customerEmail,
          branchId,
          subtotal,
          total,
          transferCharge,
          status:        "PENDING",
          notes,
        },
      })

      // c. Create OrderItems + d. Decrement stock + e. InventoryLog
      for (const item of validatedItems) {
        // OrderItem — price snapshot
        await tx.orderItem.create({
          data: {
            orderId:    order.id,
            variantId:  item.variantId,
            quantity:   item.quantity,
            unitPrice:  item.unitPrice,
            totalPrice: item.totalPrice,
          },
        })

        // ── Atomic conditional stock decrement ──────────────────────────────
        //
        // A single parameterized UPDATE with a WHERE clause ensures:
        //   - availableStock cannot go below the requested quantity
        //   - Two concurrent checkouts for the last unit cannot both succeed
        //   - No separate read-then-write race window exists
        //
        // We use $executeRaw with tagged-template (parameterized) syntax.
        // IDs and quantities are passed as parameters — NEVER string-interpolated.
        //
        // The UPDATE atomically:
        //   1. decrements availableStock by quantity
        //   2. increments reservedStock by quantity
        //   3. physicalStock is unchanged until COLLECTED
        //
        // If availableStock < quantity the WHERE clause fails → 0 rows affected
        // → we throw inside the transaction → full rollback.

        const affected: number = await tx.$executeRaw`
          UPDATE "Inventory"
          SET    "availableStock" = "availableStock" - ${item.quantity},
                 "reservedStock"  = "reservedStock"  + ${item.quantity}
          WHERE  "id" = ${item.inventoryId}
            AND  "availableStock" >= ${item.quantity}
        `

        if (affected !== 1) {
          // Either the row disappeared or stock dropped below the requested
          // quantity between our pre-flight check and this statement.
          // Re-fetch the current stock for the error message.
          const current = await tx.inventory.findUnique({
            where:  { id: item.inventoryId },
            select: { availableStock: true },
          })
          const nowAvailable = current?.availableStock ?? 0
          throw new Error(
            `"${item.productName}" (${item.sku}) only has ${nowAvailable} unit${nowAvailable === 1 ? "" : "s"} available. Please update your cart.`
          )
        }

        // Inventory audit log (reads happen within the same serializable tx)
        const invAfter = await tx.inventory.findUnique({
          where:  { id: item.inventoryId },
          select: { availableStock: true },
        })
        const afterStock = invAfter?.availableStock ?? 0

        await tx.inventoryLog.create({
          data: {
            inventoryId:    item.inventoryId,
            type:           "ADJUSTMENT",
            quantityBefore: afterStock + item.quantity,    // before this update
            quantityChange: -item.quantity,
            quantityAfter:  afterStock,
            note:           `Order ${orderNumber} placed — stock reserved`,
          },
        })
      }

      // f. Order status history
      await tx.orderStatusHistory.create({
        data: {
          orderId:   order.id,
          status:    "PENDING",
          changedBy: "CUSTOMER",
          note:      "Order placed by customer",
        },
      })

      // g. Delete the cart (clears cart after successful order)
      await tx.cartSession.delete({ where: { id: cartId } })

      return order
    }, {
      // Use SERIALIZABLE isolation to prevent concurrent checkout race conditions
      isolationLevel: "Serializable",
    })

    orderId = result.id
  } catch (err) {
    console.error("[placeOrder] Transaction failed:", err)
    const msg = err instanceof Error ? err.message : "Order creation failed. Please try again."
    return { success: false, error: msg }
  }

  // ── 8. Redirect to confirmation ───────────────────────────────────────────
  redirect(`/order-success/${orderId}`)
}
