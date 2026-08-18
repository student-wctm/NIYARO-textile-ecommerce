"use server"

// =============================================================================
// Control Center — Inventory Server Actions
// PROTECTED: every action requires an active admin session.
// =============================================================================

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getInventoryForExport } from "@/lib/inventory"
import type { InventoryFilters } from "@/lib/inventory"
import type { InventoryLogType } from "@/generated/prisma/client"
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

// ─── Internal helper — write to DB inside a transaction ───────────────────────

async function applyStockChange(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  inventoryId: string,
  delta: number,          // positive = add, negative = remove
  type: InventoryLogType,
  note: string
): Promise<void> {
  const inv = await tx.inventory.findUniqueOrThrow({ where: { id: inventoryId } })

  const newPhysical   = inv.physicalStock   + delta
  const newAvailable  = inv.availableStock  + delta  // reservedStock unchanged

  if (newPhysical < 0)  throw new Error("Physical stock cannot go below zero.")
  if (newAvailable < 0) throw new Error("Available stock cannot go below zero.")

  await tx.inventory.update({
    where: { id: inventoryId },
    data: { physicalStock: newPhysical, availableStock: newAvailable },
  })

  await tx.inventoryLog.create({
    data: {
      inventoryId,
      type,
      quantityBefore: inv.physicalStock,
      quantityChange: delta,
      quantityAfter:  newPhysical,
      note,
    },
  })
}

// ─── Upsert (create or update) a single inventory record ─────────────────────

export async function upsertInventory(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  try { await requireAdmin() } catch { return { success: false, error: "Unauthorized." } }
  const branchId  = (formData.get("branchId")  as string | null)?.trim() ?? ""
  const variantId = (formData.get("variantId") as string | null)?.trim() ?? ""
  const physicalRaw = formData.get("physicalStock") as string | null
  const threshRaw   = formData.get("lowStockThreshold") as string | null

  const fe: Record<string, string> = {}
  if (!branchId)  fe.branchId  = "Branch is required."
  if (!variantId) fe.variantId = "Variant is required."

  const physical  = parseInt(physicalRaw ?? "", 10)
  const threshold = parseInt(threshRaw   ?? "5", 10)
  if (isNaN(physical) || physical < 0)   fe.physicalStock = "Enter a non-negative integer."
  if (isNaN(threshold) || threshold < 0) fe.lowStockThreshold = "Enter a non-negative integer."

  if (Object.keys(fe).length) return { success: false, fieldErrors: fe }

  try {
    const existing = await prisma.inventory.findUnique({
      where: { branchId_variantId: { branchId, variantId } },
    })

    if (existing) {
      const delta = physical - existing.physicalStock
      await prisma.$transaction(async (tx) => {
        if (delta !== 0) {
          const type: InventoryLogType = delta > 0 ? "ADJUSTMENT" : "ADJUSTMENT"
          await applyStockChange(tx, existing.id, delta, type, "Manual adjustment via admin")
        }
        await tx.inventory.update({
          where: { id: existing.id },
          data:  { lowStockThreshold: threshold },
        })
      })
    } else {
      const inv = await prisma.inventory.create({
        data: {
          branchId, variantId,
          physicalStock: physical, availableStock: physical,
          reservedStock: 0, lowStockThreshold: threshold,
        },
      })
      await prisma.inventoryLog.create({
        data: {
          inventoryId: inv.id, type: "INITIAL",
          quantityBefore: 0, quantityChange: physical, quantityAfter: physical,
          note: "Initial stock entry",
        },
      })
    }
  } catch (err) {
    console.error("[upsertInventory]", err)
    const msg = err instanceof Error ? err.message : "Failed to save inventory."
    return { success: false, error: msg }
  }

  revalidatePath("/control-center/inventory")
  revalidatePath("/control-center")
  return { success: true }
}

// ─── Add stock ────────────────────────────────────────────────────────────────

export async function addStock(
  inventoryId: string,
  quantity: number,
  note: string
): Promise<ActionResult> {
  try { await requireAdmin() } catch { return { success: false, error: "Unauthorized." } }
  if (quantity <= 0) return { success: false, error: "Quantity must be greater than zero." }
  try {
    await prisma.$transaction((tx) =>
      applyStockChange(tx, inventoryId, quantity, "ADD", note || "Stock added by admin")
    )
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to add stock." }
  }
  revalidatePath("/control-center/inventory")
  revalidatePath("/control-center")
  return { success: true }
}

// ─── Remove stock ─────────────────────────────────────────────────────────────

export async function removeStock(
  inventoryId: string,
  quantity: number,
  note: string
): Promise<ActionResult> {
  try { await requireAdmin() } catch { return { success: false, error: "Unauthorized." } }
  if (quantity <= 0) return { success: false, error: "Quantity must be greater than zero." }
  try {
    await prisma.$transaction((tx) =>
      applyStockChange(tx, inventoryId, -quantity, "REMOVE", note || "Stock removed by admin")
    )
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to remove stock." }
  }
  revalidatePath("/control-center/inventory")
  revalidatePath("/control-center")
  return { success: true }
}

// ─── Transfer stock between branches ─────────────────────────────────────────

export async function transferStock(
  fromInventoryId: string,
  toInventoryId: string,
  quantity: number,
  note: string
): Promise<ActionResult> {
  try { await requireAdmin() } catch { return { success: false, error: "Unauthorized." } }
  if (quantity <= 0) return { success: false, error: "Quantity must be greater than zero." }
  try {
    await prisma.$transaction(async (tx) => {
      const transferNote = note || `Transfer ×${quantity}`
      await applyStockChange(tx, fromInventoryId, -quantity, "TRANSFER_OUT", `${transferNote} (out)`)
      await applyStockChange(tx, toInventoryId,   +quantity, "TRANSFER_IN",  `${transferNote} (in)`)
    })
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Transfer failed." }
  }
  revalidatePath("/control-center/inventory")
  revalidatePath("/control-center")
  return { success: true }
}

// ─── Bulk update threshold only (no stock change) ────────────────────────────

export async function bulkUpdateThreshold(
  ids: string[],
  threshold: number
): Promise<ActionResult> {
  try { await requireAdmin() } catch { return { success: false, error: "Unauthorized." } }
  if (!ids.length) return { success: false, error: "No items selected." }
  if (threshold < 0) return { success: false, error: "Threshold must be >= 0." }
  try {
    await prisma.inventory.updateMany({
      where: { id: { in: ids } },
      data:  { lowStockThreshold: threshold },
    })
  } catch (err) {
    return { success: false, error: "Bulk update failed." }
  }
  revalidatePath("/control-center/inventory")
  return { success: true }
}

// ─── Bulk stock set ───────────────────────────────────────────────────────────

export interface BulkStockItem { inventoryId: string; quantity: number }

export async function bulkSetStock(items: BulkStockItem[], note: string): Promise<ActionResult> {
  try { await requireAdmin() } catch { return { success: false, error: "Unauthorized." } }
  if (!items.length) return { success: false, error: "No items provided." }
  try {
    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        const inv = await tx.inventory.findUniqueOrThrow({ where: { id: item.inventoryId } })
        const delta = item.quantity - inv.physicalStock
        if (delta === 0) continue
        await applyStockChange(tx, inv.id, delta, "BULK_UPDATE", note || "Bulk stock update")
      }
    })
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Bulk update failed." }
  }
  revalidatePath("/control-center/inventory")
  revalidatePath("/control-center")
  return { success: true }
}

// ─── Update threshold on a single record ─────────────────────────────────────

export async function updateThreshold(
  inventoryId: string,
  threshold: number
): Promise<ActionResult> {
  try { await requireAdmin() } catch { return { success: false, error: "Unauthorized." } }
  if (threshold < 0) return { success: false, error: "Threshold must be >= 0." }
  try {
    await prisma.inventory.update({
      where: { id: inventoryId },
      data:  { lowStockThreshold: threshold },
    })
  } catch (err) {
    return { success: false, error: "Failed to update threshold." }
  }
  revalidatePath("/control-center/inventory")
  return { success: true }
}

// ─── CSV export (returns CSV string) ─────────────────────────────────────────

export async function exportInventoryCSV(filters: InventoryFilters): Promise<{ csv: string }> {
  await requireAdmin()  // throws → bubbles as Unauthorized to caller
  const rows = await getInventoryForExport(filters)
  const header = "Branch,Product,Category,SKU,Color,Size,Physical,Reserved,Available,Threshold,Status"
  const lines = rows.map((r) =>
    [
      `"${r.branch}"`, `"${r.product}"`, `"${r.category}"`,
      `"${r.sku}"`, `"${r.color}"`, `"${r.size}"`,
      r.physical, r.reserved, r.available, r.threshold, r.status,
    ].join(",")
  )
  return { csv: [header, ...lines].join("\n") }
}
