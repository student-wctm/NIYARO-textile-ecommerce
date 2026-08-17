"use server"

// =============================================================================
// Customer Order Actions
//
// Security contract:
//   - customerId is NEVER read from the browser.
//     It comes exclusively from getSessionCustomer() (server-side session).
//   - orderId is an untrusted URL/form parameter until the ownership check
//     confirms order.customerId === session.id on the server.
//   - inventoryId, variantId, quantity, branchId, status — all reloaded
//     from the database inside the transaction. Nothing from the browser.
//   - A non-existent or unowned order returns the same error as a wrong
//     customer to prevent order ID enumeration.
// =============================================================================

import { revalidatePath } from "next/cache"
import { getSessionCustomer } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export interface CancelResult {
  success: boolean
  error?:  string
}

// ─── cancelOrder ─────────────────────────────────────────────────────────────

/**
 * Customer-initiated order cancellation.
 *
 * Rules enforced server-side:
 *   1. Customer must be authenticated (getSessionCustomer).
 *   2. Order must exist AND belong to this customer.
 *      (Returns the same generic error for missing vs unowned orders — no enumeration.)
 *   3. Only PENDING orders may be cancelled by the customer.
 *      Branch staff/admin handle cancellations from other states.
 *   4. Entire cancellation is ONE Prisma transaction (Serializable):
 *      - Verify order is still PENDING inside the tx (prevents double-cancel race)
 *      - For each OrderItem: release reserved stock with atomic conditional SQL
 *      - Write InventoryLog entries
 *      - Update Order status → CANCELLED
 *      - Append OrderStatusHistory (changedBy: "CUSTOMER")
 *   5. If any step fails → full rollback, order remains unchanged.
 *
 * Inventory invariant maintained:
 *   availableStock = physicalStock − reservedStock
 *   On cancellation: reservedStock -= qty, availableStock += qty, physicalStock unchanged
 */
export async function cancelOrder(orderId: string): Promise<CancelResult> {
  // ── 1. Authenticate ────────────────────────────────────────────────────────
  const customer = await getSessionCustomer()
  if (!customer) {
    return { success: false, error: "You must be signed in to cancel an order." }
  }

  if (!orderId?.trim()) {
    return { success: false, error: "Invalid request." }
  }

  // ── 2. Load + verify ownership (pre-flight, outside transaction) ────────────
  // We do this before entering the transaction to give a clear early error.
  // Inside the transaction we re-verify status to prevent race conditions.
  const orderCheck = await prisma.order.findUnique({
    where:  { id: orderId },
    select: { customerId: true, status: true, orderNumber: true },
  })

  // Return the same error whether the order doesn't exist or belongs to
  // a different customer — prevents order ID enumeration.
  if (!orderCheck || orderCheck.customerId !== customer.id) {
    return { success: false, error: "Order not found." }
  }

  // Only PENDING orders can be cancelled by the customer.
  // Other states require branch staff action.
  if (orderCheck.status !== "PENDING") {
    const label: Record<string, string> = {
      CONFIRMED:        "confirmed by the branch",
      PACKING:          "already being packed",
      READY_FOR_PICKUP: "ready for pickup",
      COLLECTED:        "already collected",
      CANCELLED:        "already cancelled",
    }
    const reason = label[orderCheck.status] ?? "in progress"
    return {
      success: false,
      error:   `This order cannot be cancelled because it has been ${reason}. Please contact the branch directly.`,
    }
  }

  // ── 3. Atomic transaction ──────────────────────────────────────────────────
  try {
    await prisma.$transaction(async (tx) => {
      // Re-verify order ownership + status inside the transaction.
      // This prevents a concurrent request from cancelling the same order twice
      // or from a status change slipping in between the check above and here.
      const order = await tx.order.findUnique({
        where:  { id: orderId },
        select: {
          id:          true,
          customerId:  true,
          status:      true,
          orderNumber: true,
          branchId:    true,
          items: {
            select: { variantId: true, quantity: true },
          },
        },
      })

      // Double-check ownership inside transaction (second line of defence)
      if (!order || order.customerId !== customer.id) {
        throw new Error("Order not found.")
      }

      // Status must still be PENDING — another request may have changed it
      if (order.status !== "PENDING") {
        throw new Error("This order can no longer be cancelled. Please refresh the page.")
      }

      // ── Release inventory for each item ────────────────────────────────────
      for (const item of order.items) {
        // Atomic conditional SQL update — single statement, no read-check-write gap.
        //
        // Releases exactly `item.quantity` from reservedStock back to availableStock.
        // The WHERE clause prevents reservedStock from going negative:
        //   WHERE reservedStock >= item.quantity
        //
        // If the clause fails (0 rows) it means the inventory record is in an
        // unexpected state — we throw to rollback the entire transaction rather
        // than leaving the order/inventory in a partial state.
        //
        // All values are parameterized — never string-interpolated.

        const affected: number = await tx.$executeRaw`
          UPDATE "Inventory"
          SET    "availableStock" = "availableStock" + ${item.quantity},
                 "reservedStock"  = "reservedStock"  - ${item.quantity}
          WHERE  "branchId"  = ${order.branchId}
            AND  "variantId" = ${item.variantId}
            AND  "reservedStock" >= ${item.quantity}
        `

        if (affected !== 1) {
          // Inventory row may not exist (variant no longer stocked at this branch)
          // or reservedStock was already less than the quantity (data inconsistency).
          // In either case, do NOT proceed — throw to trigger full rollback.
          throw new Error(
            `Unable to release stock for a variant in order ${order.orderNumber}. ` +
            "Please contact support if this problem persists."
          )
        }

        // Read the updated values for the audit log (within same tx)
        const invAfter = await tx.inventory.findFirst({
          where:  { branchId: order.branchId, variantId: item.variantId },
          select: { id: true, availableStock: true },
        })

        if (invAfter) {
          await tx.inventoryLog.create({
            data: {
              inventoryId:    invAfter.id,
              type:           "ADJUSTMENT",
              quantityBefore: invAfter.availableStock - item.quantity,   // state before this update
              quantityChange: +item.quantity,                            // positive: stock returned
              quantityAfter:  invAfter.availableStock,
              note:           `Order ${order.orderNumber} cancelled by customer — reservation released`,
            },
          })
        }
      }

      // ── Update order status → CANCELLED ────────────────────────────────────
      await tx.order.update({
        where: { id: orderId },
        data:  { status: "CANCELLED" },
      })

      // ── Append status history ───────────────────────────────────────────────
      await tx.orderStatusHistory.create({
        data: {
          orderId,
          status:    "CANCELLED",
          changedBy: "CUSTOMER",
          note:      "Order cancelled by customer request.",
        },
      })
    }, {
      isolationLevel: "Serializable",
    })
  } catch (err) {
    console.error("[cancelOrder]", err)
    return {
      success: false,
      error:   err instanceof Error
        ? err.message
        : "Cancellation failed. Please try again or contact support.",
    }
  }

  // Revalidate affected pages so the updated status renders immediately
  revalidatePath("/account/orders")
  revalidatePath(`/account/orders/${orderId}`)

  return { success: true }
}
