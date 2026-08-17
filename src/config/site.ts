// =============================================================================
// Site / Business Configuration
// This is the single source of truth for branding and domain settings.
//
// To rename the brand in future, update the values here only.
// No other file should hard-code the brand name, domain, or tagline.
// =============================================================================

export const siteConfig = {
  // ── Brand identity ──────────────────────────────────────────────────────
  name: "NIYARO",

  // Short tagline used in meta descriptions and sub-headings
  tagline: "Quality Textiles & Fabrics",

  // One-liner for SEO meta description and footer blurbs
  description:
    "Browse our complete textile catalogue online and reserve items for pickup at the branch nearest to you.",

  // ── Domain ──────────────────────────────────────────────────────────────
  // Planned production domain — not yet live.
  // Keep this decoupled from the brand name so they can diverge.
  domain: "niyaro.com",

  // Full canonical URL (used for OG tags, sitemaps, etc. once needed)
  url: "https://niyaro.com",

  // ── Visual identity ─────────────────────────────────────────────────────
  // Decorative logo prefix shown in header/footer (emoji or SVG icon stub)
  logoIcon: "🪡",

  // ── Panels ──────────────────────────────────────────────────────────────
  // Labels used in the staff and admin panel headers
  staffPanelLabel: "Staff Panel",
  adminPanelLabel: "Control Center",
} as const

export type SiteConfig = typeof siteConfig
