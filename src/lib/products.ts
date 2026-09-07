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
  similarFrom: Array<{
    id: string
    sortOrder: number
    similarProduct: Pick<Product, "id" | "name" | "slug" | "basePrice" | "comparePrice"> & {
      images: Pick<ProductImage, "id" | "imageUrl" | "altText" | "isPrimary">[]
    }
  }>
  reviews: Array<{ rating: number; isApproved: boolean }>
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

/**
 * Returns only id, name, slug — plain strings, fully JSON-serialisable.
 * Use this when passing categories across a Server → Client Component boundary
 * (e.g. into ProductForm). The full Category type contains Date fields which
 * cannot be serialised by Next.js App Router's prop passing mechanism.
 */
export type CategoryOption = {
  id: string
  name: string
  slug: string
}

export async function getActiveCategoryOptions(): Promise<CategoryOption[]> {
  return prisma.category.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true },
  })
}

/**
 * Returns id, name, slug, imageUrl for active categories.
 * Used ONLY on the Home Page "Shop by Category" section.
 * imageUrl is included here but NOT in getActiveCategoryOptions — keeping the
 * Products page category filter text-only and its type unchanged.
 */
export type CategoryCard = {
  id:       string
  name:     string
  slug:     string
  imageUrl: string | null
}

export async function getActiveCategoriesForHome(): Promise<CategoryCard[]> {
  return prisma.category.findMany({
    where:   { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select:  { id: true, name: true, slug: true, imageUrl: true },
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
      similarFrom: {
        orderBy: { sortOrder: "asc" },
        include: {
          similarProduct: {
            select: {
              id: true, name: true, slug: true, basePrice: true, comparePrice: true,
              images: {
                where: { isPrimary: true },
                select: { id: true, imageUrl: true, altText: true, isPrimary: true },
                take: 1,
              },
            },
          },
        },
      },
      reviews: { select: { rating: true, isApproved: true } },
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
      similarFrom: {
        orderBy: { sortOrder: "asc" },
        include: {
          similarProduct: {
            select: {
              id: true, name: true, slug: true, basePrice: true, comparePrice: true,
              images: {
                where: { isPrimary: true },
                select: { id: true, imageUrl: true, altText: true, isPrimary: true },
                take: 1,
              },
            },
          },
        },
      },
      reviews: { select: { rating: true, isApproved: true } },
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

// ─── Rating summary helper ─────────────────────────────────────────────────────

export type RatingSummary = {
  averageRating: number  // 0 if no reviews
  totalRatings:  number
  totalReviews:  number  // reviews with a body
}

/** Compute rating summary from approved reviews already loaded on the product. */
export function computeRatingSummary(
  reviews: Array<{ rating: number; isApproved: boolean }>
): RatingSummary {
  const approved = reviews.filter((r) => r.isApproved)
  if (approved.length === 0) return { averageRating: 0, totalRatings: 0, totalReviews: 0 }
  const sum = approved.reduce((acc, r) => acc + r.rating, 0)
  return {
    averageRating: Math.round((sum / approved.length) * 10) / 10,
    totalRatings:  approved.length,
    totalReviews:  approved.length,  // all approved ratings count as reviews
  }
}

// ─── Similar products search ───────────────────────────────────────────────────

/** Search active products by name (for admin similar-products picker). Excludes currentProductId. */
export async function searchProductsForSimilar(
  query: string,
  excludeId: string
): Promise<Array<{ id: string; name: string; slug: string; basePrice: number }>> {
  if (!query.trim()) return []
  return prisma.product.findMany({
    where: {
      isActive: true,
      id: { not: excludeId },
      name: { contains: query.trim(), mode: "insensitive" },
    },
    select: { id: true, name: true, slug: true, basePrice: true },
    take: 10,
    orderBy: { name: "asc" },
  })
}

/** Set the complete list of similar products for a product (replace all). */
export async function setSimilarProducts(
  productId: string,
  similarIds: string[]
): Promise<void> {
  await prisma.$transaction([
    prisma.productSimilar.deleteMany({ where: { productId } }),
    ...(similarIds.length > 0
      ? [prisma.productSimilar.createMany({
          data: similarIds.map((similarProductId, i) => ({
            productId,
            similarProductId,
            sortOrder: i,
          })),
          skipDuplicates: true,
        })]
      : []),
  ])
}
