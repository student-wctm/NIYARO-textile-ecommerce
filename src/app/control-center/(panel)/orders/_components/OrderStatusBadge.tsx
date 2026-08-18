import { STATUS_BADGE, STATUS_LABEL } from "@/lib/ordersMeta"
import type { OrderStatus } from "@/lib/ordersMeta"

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE[status]}`}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-current opacity-60" aria-hidden="true" />
      {STATUS_LABEL[status]}
    </span>
  )
}
