"use server"

// =============================================================================
// Admin Order Server Actions
//
// SECURITY TODO: No authentication yet. Protect before production.
//
// Inventory integration:
//   COLLECTED  → physicalStock  -= qty, reservedStock -= qty  (item actually gone)
//   CANCELLED  → if was PENDING/CONFIRMED/PACKING/READY_FOR_PICKUP:
//                reservedStock -= qty, availableStock += qty  (release reservation)
// =============================================================================

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { STATUS_TRANSITIONS } from "@/lib/ordersMeta"
import type { OrderStatus } from "@/generated/prisma/client"

export interface ActionResult {
  success: boolean
  error?:  string
}

// ─── Change order status ──────────────────────────────────────────────────────

export async function changeOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  staffNote?: string
): Promise<ActionResult> {
  if (!orderId) return { success: false, error: "Order ID required." }

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Fetch current order + items
      const order = await tx.order.findUniqueOrThrow({
        where: { id: orderId },
        include: {
          items: {
            select: {
              variantId: true,
              quantity:  true,
            },
          },
        },
      })

      // 2. Validate the transition is legal
      const allowed = STATUS_TRANSITIONS[order.status]
      if (!allowed.includes(newStatus)) {
        throw new Error(
          `Cannot transition from ${order.status} to ${newStatus}.`
        )
      }

      // 3. Inventory side-effects
      if (newStatus === "COLLECTED") {
        // Items physically left the branch
        for (const item of order.items) {
          const inv = await tx.inventory.findUnique({
            where: {
              branchId_variantId: {
                branchId:  order.branchId,
                variantId: item.variantId,
              },
            },
          })
          if (!inv) continue

          const newPhysical  = Math.max(0, inv.physicalStock  - item.quantity)
          const newReserved  = Math.max(0, inv.reservedStock  - item.quantity)
          // availableStock unchanged (was already reduced when order was placed)
          await tx.inventory.update({
            where: { id: inv.id },
            data:  { physicalStock: newPhysical, reservedStock: newReserved },
          })

          await tx.inventoryLog.create({
            data: {
              inventoryId:    inv.id,
              type:           "REMOVE",
              quantityBefore: inv.physicalStock,
              quantityChange: -item.quantity,
              quantityAfter:  newPhysical,
              note:           `Order ${order.orderNumber} collected`,
            },
          })
        }
      } else if (newStatus === "CANCELLED") {
        // Release reservations (only if order was not already terminal)
        const wasReserved: OrderStatus[] = ["PENDING", "CONFIRMED", "PACKING", "READY_FOR_PICKUP"]
        if (wasReserved.includes(order.status)) {
          for (const item of order.items) {
            const inv = await tx.inventory.findUnique({
              where: {
                branchId_variantId: {
                  branchId:  order.branchId,
                  variantId: item.variantId,
                },
              },
            })
            if (!inv) continue

            const newReserved   = Math.max(0, inv.reservedStock  - item.quantity)
            const newAvailable  = inv.physicalStock - newReserved

            await tx.inventory.update({
              where: { id: inv.id },
              data:  { reservedStock: newReserved, availableStock: newAvailable },
            })

            await tx.inventoryLog.create({
              data: {
                inventoryId:    inv.id,
                type:           "ADJUSTMENT",
                quantityBefore: inv.availableStock,
                quantityChange: item.quantity,   // positive: stock returned to available
                quantityAfter:  newAvailable,
                note:           `Order ${order.orderNumber} cancelled — reservation released`,
              },
            })
          }
        }
      }

      // 4. Update the order status
      await tx.order.update({
        where: { id: orderId },
        data:  {
          status:     newStatus,
          staffNotes: staffNote ?? order.staffNotes,
        },
      })

      // 5. Append to audit trail
      await tx.orderStatusHistory.create({
        data: {
          orderId,
          status:    newStatus,
          changedBy: "STAFF",
          note:      staffNote ?? null,
        },
      })
    })
  } catch (err) {
    console.error("[changeOrderStatus]", err)
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update order status.",
    }
  }

  revalidatePath("/admin/orders")
  revalidatePath(`/admin/orders/${orderId}`)
  revalidatePath("/admin")
  revalidatePath("/admin/inventory")
  return { success: true }
}

// ─── Update staff notes ───────────────────────────────────────────────────────

export async function updateStaffNotes(
  orderId: string,
  notes: string
): Promise<ActionResult> {
  try {
    await prisma.order.update({
      where: { id: orderId },
      data:  { staffNotes: notes.trim() || null },
    })
  } catch (err) {
    return { success: false, error: "Failed to save notes." }
  }
  revalidatePath(`/admin/orders/${orderId}`)
  revalidatePath("/admin/orders")
  return { success: true }
}
