// General-purpose utility functions.

/**
 * Formats a number as Indian Rupees.
 * e.g. formatPrice(1299) → "₹1,299"
 * e.g. formatPrice(1299.5) → "₹1,299.50"
 */
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Generates a human-readable order number.
 * Format: TXL-YYYY-NNNNN
 * The sequence number is provided by the caller (e.g. from a DB counter).
 */
export function generateOrderNumber(sequence: number): string {
  const year = new Date().getFullYear()
  const padded = String(sequence).padStart(5, "0")
  return `TXL-${year}-${padded}`
}

/**
 * Converts a string to a URL-safe slug.
 * e.g. "Black Silk Saree" → "black-silk-saree"
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/**
 * Clamps a number between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Returns initials from a full name.
 * e.g. "Akhil Sharma" → "AS"
 */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("")
}
