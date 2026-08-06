// Server-only module — never import this in Client Components.
// All branch DB access goes through these helpers so query logic
// is centralised and easy to change.

import { prisma } from "@/lib/prisma"
import type { Branch } from "@/generated/prisma/client"

export type { Branch }

// Lightweight projection used in the customer-facing branch picker
// and for writing the cookie (matches the SelectedBranch type).
export type BranchSummary = Pick<
  Branch,
  "id" | "name" | "slug" | "city" | "state" | "address" | "pincode" | "phone" | "isActive"
>

// ─── Admin queries ────────────────────────────────────────────────────────────

/** All branches ordered alphabetically by city, then name. */
export async function getAllBranches(): Promise<Branch[]> {
  return prisma.branch.findMany({
    orderBy: [{ city: "asc" }, { name: "asc" }],
  })
}

/** Single branch by id — returns null if not found. */
export async function getBranchById(id: string): Promise<Branch | null> {
  return prisma.branch.findUnique({ where: { id } })
}

// ─── Customer queries ─────────────────────────────────────────────────────────

/** Only active branches, lightweight projection for the picker. */
export async function getActiveBranches(): Promise<BranchSummary[]> {
  return prisma.branch.findMany({
    where: { isActive: true },
    orderBy: [{ city: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      city: true,
      state: true,
      address: true,
      pincode: true,
      phone: true,
      isActive: true,
    },
  })
}

// ─── Slug helpers ─────────────────────────────────────────────────────────────

/**
 * Generates a URL-safe slug from a branch name.
 * Deduplicates against existing slugs by appending a numeric suffix.
 * e.g. "Delhi - Connaught Place" → "delhi-connaught-place"
 *      (if taken) → "delhi-connaught-place-2"
 */
export async function generateUniqueSlug(
  name: string,
  excludeId?: string
): Promise<string> {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")

  // Check if base slug is already taken (by a different record)
  const existing = await prisma.branch.findUnique({ where: { slug: base } })
  if (!existing || existing.id === excludeId) return base

  // Find the highest existing suffix
  const similar = await prisma.branch.findMany({
    where: {
      slug: { startsWith: base },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { slug: true },
  })

  const suffixes = similar
    .map((b) => {
      const match = b.slug.match(new RegExp(`^${base}-(\\d+)$`))
      return match ? parseInt(match[1], 10) : 0
    })
    .filter((n) => n > 0)

  const next = suffixes.length > 0 ? Math.max(...suffixes) + 1 : 2
  return `${base}-${next}`
}
