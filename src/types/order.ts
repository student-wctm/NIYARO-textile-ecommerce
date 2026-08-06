// Re-export the OrderStatus enum shape for use in UI layers.
// The actual enum lives in the Prisma-generated client; this file
// provides a plain TypeScript mirror so UI code does not need to
// import from the generated directory directly.

export type OrderStatusValue =
  | "PENDING"
  | "CONFIRMED"
  | "PACKING"
  | "READY_FOR_PICKUP"
  | "COLLECTED"
  | "CANCELLED"

export interface OrderStatusMeta {
  label: string
  description: string
  // Tailwind colour classes for badges — update when design tokens are finalised
  badgeClass: string
}

export const ORDER_STATUS_META: Record<OrderStatusValue, OrderStatusMeta> = {
  PENDING: {
    label: "Pending",
    description: "Order placed, awaiting branch confirmation.",
    badgeClass: "bg-yellow-100 text-yellow-800",
  },
  CONFIRMED: {
    label: "Confirmed",
    description: "Branch has confirmed your order.",
    badgeClass: "bg-blue-100 text-blue-800",
  },
  PACKING: {
    label: "Packing",
    description: "Staff is preparing your order.",
    badgeClass: "bg-indigo-100 text-indigo-800",
  },
  READY_FOR_PICKUP: {
    label: "Ready for Pickup",
    description: "Your order is ready. Please visit the branch.",
    badgeClass: "bg-green-100 text-green-800",
  },
  COLLECTED: {
    label: "Collected",
    description: "Order collected. Thank you!",
    badgeClass: "bg-gray-100 text-gray-700",
  },
  CANCELLED: {
    label: "Cancelled",
    description: "This order has been cancelled.",
    badgeClass: "bg-red-100 text-red-800",
  },
}
