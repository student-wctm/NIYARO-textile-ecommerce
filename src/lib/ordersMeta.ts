// UI-only constants for order status display.
// No Prisma or server imports — safe to use in Client Components.
// Keep in sync with the OrderStatus enum in prisma/schema.prisma.

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PACKING"
  | "READY_FOR_PICKUP"
  | "COLLECTED"
  | "CANCELLED"

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING:          "Pending",
  CONFIRMED:        "Confirmed",
  PACKING:          "Packing",
  READY_FOR_PICKUP: "Ready for Pickup",
  COLLECTED:        "Collected",
  CANCELLED:        "Cancelled",
}

export const STATUS_BADGE: Record<OrderStatus, string> = {
  PENDING:          "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  CONFIRMED:        "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  PACKING:          "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  READY_FOR_PICKUP: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  COLLECTED:        "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400",
  CANCELLED:        "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400",
}

export const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING:          ["CONFIRMED", "CANCELLED"],
  CONFIRMED:        ["PACKING", "CANCELLED"],
  PACKING:          ["READY_FOR_PICKUP", "CANCELLED"],
  READY_FOR_PICKUP: ["COLLECTED", "CANCELLED"],
  COLLECTED:        [],
  CANCELLED:        [],
}

export const ALL_ORDER_STATUSES: OrderStatus[] = [
  "PENDING", "CONFIRMED", "PACKING", "READY_FOR_PICKUP", "COLLECTED", "CANCELLED",
]

// ─── Plain interface — safe in client components ──────────────────────────────
// OrderStats contains only primitives so it can live here without server deps.

export interface OrderStats {
  total:        number
  pending:      number
  packing:      number
  ready:        number
  cancelled:    number
  todayRevenue: number
}
