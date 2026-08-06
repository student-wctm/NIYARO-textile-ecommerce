// Image URL utilities.
//
// All image references in the application should go through these helpers
// rather than constructing paths inline. This makes the future migration
// from local /public images to Cloudinary or S3 a single-file change.
//
// Current behaviour: returns paths from the Next.js /public directory.
// Future: swap getProductImageUrl() to return a Cloudinary transformation URL
// or a signed S3 URL without touching any component.

const PLACEHOLDER_PRODUCT = "/images/placeholders/product.svg"
const PLACEHOLDER_CATEGORY = "/images/placeholders/category.svg"

/**
 * Returns the URL for a product image.
 * Falls back to the placeholder if no imageUrl is provided.
 */
export function getProductImageUrl(imageUrl?: string | null): string {
  if (!imageUrl) return PLACEHOLDER_PRODUCT
  // During development, imageUrl values from the DB are relative paths
  // like "/images/products/black-shirt.jpg". Return them as-is.
  // When migrating to Cloudinary, replace this logic with:
  //   return `https://res.cloudinary.com/<cloud>/image/upload/.../${imageUrl}`
  return imageUrl
}

/**
 * Returns the URL for a category image.
 */
export function getCategoryImageUrl(imageUrl?: string | null): string {
  if (!imageUrl) return PLACEHOLDER_CATEGORY
  return imageUrl
}
