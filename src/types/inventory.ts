// Inventory-related types used across the application.

// A lightweight inventory summary used when checking cross-branch availability.
export interface BranchStock {
  branchId: string
  branchName: string
  branchCity: string
  branchSlug: string
  availableStock: number
  // Distance from selected branch (populated when geo feature is enabled)
  distanceKm?: number
}

// Result returned when checking stock for a variant across all branches.
export interface VariantAvailability {
  variantId: string
  selectedBranchStock: number
  nearbyBranchesWithStock: BranchStock[]
  isAvailableAnywhere: boolean
}
