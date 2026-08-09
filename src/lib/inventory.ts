// Server-only module — never import from Client Components.
// All inventory Prisma queries live here.

import { prisma } from "@/lib/prisma"
import type { Inventory, InventoryLog, Branch, ProductVariant, Product, Category } from "@/generated/prisma/client"

export type { InventoryLog }

// ─── Rich row type for the inventory table ────────────────────────────────────

export type InventoryRow = Inventory & {
  branch: Pick<Branch, "id" | "name" | "city">
  variant: ProductVariant & {
    product: Product & {
      category: Pick<Category, "id" | "name">
    }
  }
}

export type StockStatus = "OUT_OF_STOCK" | "LOW_STOCK" | "IN_STOCK"

export function getStockStatus(row: Inventory): StockStatus {
  if (row.availableStock <= 0)                      return "OUT_OF_STOCK"
  if (row.availableStock <= row.lowStockThreshold)  return "LOW_STOCK"
  return "IN_STOCK"
}

// ─── Filter / pagination args ─────────────────────────────────────────────────

export interface InventoryFilters {
  branchId?:    string
  categoryId?:  string
  status?:      StockStatus | "ALL"
  search?:      string   // matches sku, product name, variant colour/size
  page?:        number
  pageSize?:    number
}

// ─── Paginated inventory list ─────────────────────────────────────────────────

const DEFAULT_PAGE_SIZE = 20

export async function getInventoryList(filters: InventoryFilters = {}): Promise<{
  rows: InventoryRow[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}> {
  const page     = Math.max(1, filters.page ?? 1)
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE
  const skip     = (page - 1) * pageSize

  // Build where conditions
  const where: Record<string, unknown> = {}

  if (filters.branchId)   where.branchId = filters.branchId
  if (filters.categoryId) {
    where.variant = { product: { categoryId: filters.categoryId } }
  }

  if (filters.status === "OUT_OF_STOCK") {
    where.availableStock = { lte: 0 }
  } else if (filters.status === "LOW_STOCK") {
    // availableStock > 0 AND availableStock <= lowStockThreshold
    // Prisma can't compare two columns, so we use a JS filter post-fetch
    // for pagination purposes we over-fetch slightly and trim
  }

  if (filters.search) {
    const s = filters.search.trim()
    where.OR = [
      { variant: { sku: { contains: s, mode: "insensitive" } } },
      { variant: { product: { name: { contains: s, mode: "insensitive" } } } },
      { variant: { color: { contains: s, mode: "insensitive" } } },
      { variant: { size:  { contains: s, mode: "insensitive" } } },
    ]
  }

  const include = {
    branch:  { select: { id: true, name: true, city: true } },
    variant: {
      include: {
        product: {
          include: {
            category: { select: { id: true, name: true } },
          },
        },
      },
    },
  } as const

  // LOW_STOCK needs post-filter (column comparison not supported in Prisma where)
  if (filters.status === "LOW_STOCK") {
    const all = await prisma.inventory.findMany({
      where,
      include,
      orderBy: [{ availableStock: "asc" }, { branch: { name: "asc" } }],
    })
    const filtered = all.filter(
      (r) => r.availableStock > 0 && r.availableStock <= r.lowStockThreshold
    )
    const rows = filtered.slice(skip, skip + pageSize) as unknown as InventoryRow[]
    return { rows, total: filtered.length, page, pageSize, totalPages: Math.ceil(filtered.length / pageSize) }
  }

  const [rows, total] = await Promise.all([
    prisma.inventory.findMany({
      where,
      include,
      orderBy: [{ availableStock: "asc" }, { branch: { name: "asc" } }],
      skip,
      take: pageSize,
    }),
    prisma.inventory.count({ where }),
  ])

  return {
    rows: rows as unknown as InventoryRow[],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

// ─── Single inventory record ──────────────────────────────────────────────────

export async function getInventoryById(id: string): Promise<InventoryRow | null> {
  return prisma.inventory.findUnique({
    where: { id },
    include: {
      branch:  { select: { id: true, name: true, city: true } },
      variant: { include: { product: { include: { category: { select: { id: true, name: true } } } } } },
    },
  }) as Promise<InventoryRow | null>
}

// ─── Inventory log for a record ───────────────────────────────────────────────

export async function getInventoryLog(inventoryId: string, take = 50): Promise<InventoryLog[]> {
  return prisma.inventoryLog.findMany({
    where: { inventoryId },
    orderBy: { createdAt: "desc" },
    take,
  })
}

// ─── Summary stats for KPI cards ─────────────────────────────────────────────

export interface InventoryStats {
  totalSKUs:   number
  outOfStock:  number
  lowStock:    number
  inStock:     number
}

export async function getInventoryStats(): Promise<InventoryStats> {
  const rows = await prisma.inventory.findMany({
    select: { availableStock: true, lowStockThreshold: true },
  })
  let outOfStock = 0, lowStock = 0, inStock = 0
  for (const r of rows) {
    if (r.availableStock <= 0)                        outOfStock++
    else if (r.availableStock <= r.lowStockThreshold) lowStock++
    else                                              inStock++
  }
  return { totalSKUs: rows.length, outOfStock, lowStock, inStock }
}

// ─── All active branches (for filter dropdown) ────────────────────────────────

export async function getActiveBranchOptions(): Promise<{ id: string; name: string; city: string }[]> {
  return prisma.branch.findMany({
    where: { isActive: true },
    orderBy: [{ city: "asc" }, { name: "asc" }],
    select: { id: true, name: true, city: true },
  })
}

// ─── All active categories (for filter dropdown) ─────────────────────────────

export async function getActiveCategoryOptions(): Promise<{ id: string; name: string }[]> {
  return prisma.category.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  })
}

// ─── CSV export data ──────────────────────────────────────────────────────────

export interface InventoryExportRow {
  branch:     string
  product:    string
  category:   string
  sku:        string
  color:      string
  size:       string
  physical:   number
  reserved:   number
  available:  number
  threshold:  number
  status:     string
}

export async function getInventoryForExport(filters: Omit<InventoryFilters, "page" | "pageSize">): Promise<InventoryExportRow[]> {
  const { rows } = await getInventoryList({ ...filters, page: 1, pageSize: 9999 })
  return rows.map((r) => ({
    branch:    r.branch.name,
    product:   r.variant.product.name,
    category:  r.variant.product.category.name,
    sku:       r.variant.sku,
    color:     r.variant.color ?? "",
    size:      r.variant.size  ?? "",
    physical:  r.physicalStock,
    reserved:  r.reservedStock,
    available: r.availableStock,
    threshold: r.lowStockThreshold,
    status:    getStockStatus(r),
  }))
}
