// Server-only module — never import this in Client Components.
// All product, category, and variant DB queries go through here.

import { prisma } from "@/lib/prisma"
import type {
  Category,
  Product,
  ProductVariant,
  ProductImage,
} from "@/generated/prisma/client"
import { slugify } from "@/lib/utils"

export type { Category, Product, ProductVariant, ProductImage }

// ─── Composite types used across admin and customer ──────────────────────────

/** Product with its primary image and category — used in list views. */
export type ProductSummary = Product & {
  category: Pick<Category, "id" | "name" | "slug">
  images: Pick<ProductImage, "id" | "imageUrl" | "altText" | "isPrimary">[]
  _count: { variants: number }
}

/** Full product with all relations — used in detail / edit views. */
export type ProductWithRelations = Product & {
  category: Category
  images: ProductImage[]
  variants: ProductVariant[]
}

// ─── Category helpers ─────────────────────────────────────────────────────────

export async function getAllCategories(): Promise<Category[]> {
  return prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  })
}

export async function getActiveCategories(): Promise<Category[]> {
  return prisma.category.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  })
}

export async function getCategoryById(id: string): Promise<Category | null> {
  return prisma.category.findUnique({ where: { id } })
}

export async function generateUniqueCategorySlug(
  name: string,
  excludeId?: string
): Promise<string> {
  const base = slugify(name)
  const existing = await prisma.category.findUnique({ where: { slug: base } })
  if (!existing || existing.id === excludeId) return base

  const similar = await prisma.category.findMany({
    where: {
      slug: { startsWith: base },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { slug: true },
  })
  const suffixes = similar
    .map((c) => {
      const m = c.slug.match(new RegExp(`^${base}-(\\d+)$`))
      return m ? parseInt(m[1], 10) : 0
    })
    .filter((n) => n > 0)
  const next = suffixes.length > 0 ? Math.max(...suffixes) + 1 : 2
  return `${base}-${next}`
}

// ─── Product helpers ──────────────────────────────────────────────────────────

/** Admin: all products with category + primary image + variant count. */
export async function getAllProducts(): Promise<ProductSummary[]> {
  return prisma.product.findMany({
    orderBy: [{ createdAt: "desc" }],
    include: {
      category: { select: { id: true, name: true, slug: true } },
      images: {
        select: { id: true, imageUrl: true, altText: true, isPrimary: true },
        orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
        take: 1,
      },
      _count: { select: { variants: true } },
    },
  }) as Promise<ProductSummary[]>
}

/** Customer: active products only, with category + images. */
export async function getActiveProducts(opts?: {
  categorySlug?: string
  search?: string
  take?: number
  skip?: number
}): Promise<{ products: ProductSummary[]; total: number }> {
  const where = {
    isActive: true,
    ...(opts?.categorySlug
      ? { category: { slug: opts.categorySlug } }
      : {}),
    ...(opts?.search
      ? {
          OR: [
            { name: { contains: opts.search, mode: "insensitive" as const } },
            { description: { contains: opts.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      take: opts?.take ?? 40,
      skip: opts?.skip ?? 0,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        images: {
          select: { id: true, imageUrl: true, altText: true, isPrimary: true },
          orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
          take: 1,
        },
        _count: { select: { variants: true } },
      },
    }),
    prisma.product.count({ where }),
  ])

  return { products: products as ProductSummary[], total }
}

/** Full product by id — for admin edit. */
export async function getProductById(
  id: string
): Promise<ProductWithRelations | null> {
  return prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] },
      variants: { orderBy: [{ createdAt: "asc" }] },
    },
  }) as Promise<ProductWithRelations | null>
}

/** Full product by slug — for customer detail page. */
export async function getProductBySlug(
  slug: string
): Promise<ProductWithRelations | null> {
  return prisma.product.findUnique({
    where: { slug },
    include: {
      category: true,
      images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] },
      variants: {
        where: { isActive: true },
        orderBy: [{ createdAt: "asc" }],
      },
    },
  }) as Promise<ProductWithRelations | null>
}

export async function generateUniqueProductSlug(
  name: string,
  excludeId?: string
): Promise<string> {
  const base = slugify(name)
  const existing = await prisma.product.findUnique({ where: { slug: base } })
  if (!existing || existing.id === excludeId) return base

  const similar = await prisma.product.findMany({
    where: {
      slug: { startsWith: base },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { slug: true },
  })
  const suffixes = similar
    .map((p) => {
      const m = p.slug.match(new RegExp(`^${base}-(\\d+)$`))
      return m ? parseInt(m[1], 10) : 0
    })
    .filter((n) => n > 0)
  const next = suffixes.length > 0 ? Math.max(...suffixes) + 1 : 2
  return `${base}-${next}`
}

// ─── Variant helpers ──────────────────────────────────────────────────────────

export async function getVariantById(
  id: string
): Promise<ProductVariant | null> {
  return prisma.productVariant.findUnique({ where: { id } })
}

/** Check if SKU is taken — used in form validation. */
export async function isSkuTaken(
  sku: string,
  excludeId?: string
): Promise<boolean> {
  const existing = await prisma.productVariant.findUnique({ where: { sku } })
  if (!existing) return false
  if (excludeId && existing.id === excludeId) return false
  return true
}
