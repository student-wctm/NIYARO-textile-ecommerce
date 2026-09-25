// =============================================================================
// notifications.ts — Server-only. Never import from Client Components.
//
// Admin notification service for new orders.
//
// Architecture:
//   notifyAdminNewOrder(order)
//     ├── sendTelegramNotification()   ← implemented now
//     └── sendWhatsAppNotification()   ← stub (add provider later)
//
// CRITICAL: notification failures must NEVER cancel a successfully placed order
//   or surface an error to the customer. Call with fire-and-forget pattern:
//
//     notifyAdminNewOrder(order).catch((err) =>
//       console.error("[notify] non-fatal:", err)
//     )
//
// Deduplication:
//   The caller passes the order object immediately after DB creation.
//   One call to placeOrder → one call to notifyAdminNewOrder.
//   No retry logic here — retries would cause duplicate notifications.
// =============================================================================

export interface OrderNotificationPayload {
  orderId:       string
  orderNumber:   string
  customerName:  string
  customerPhone: string
  customerEmail: string | null | undefined
  branchName:    string
  items: Array<{
    productName: string
    sku:         string
    size:        string | null | undefined
    color:       string | null | undefined
    length:      string | null | undefined
    quantity:    number
    unitPrice:   number
    totalPrice:  number
  }>
  subtotal:      number
  total:         number
  notes:         string | null | undefined
  createdAt:     Date
}

// ─── Public entry point ───────────────────────────────────────────────────────

/**
 * Fire-and-forget admin notification.
 * Returns a Promise that always resolves — failures are logged, not thrown.
 * Call with .catch(() => {}) or void if you want fully silent fire-and-forget.
 */
export async function notifyAdminNewOrder(
  order: OrderNotificationPayload
): Promise<void> {
  const results = await Promise.allSettled([
    sendTelegramNotification(order),
    // sendWhatsAppNotification(order),  // TODO: add provider when configured
  ])

  for (const r of results) {
    if (r.status === "rejected") {
      // Log the error but never throw — order is already committed
      console.error("[notify] Admin notification failed:", r.reason)
    }
  }
}

// ─── Telegram ─────────────────────────────────────────────────────────────────

async function sendTelegramNotification(
  order: OrderNotificationPayload
): Promise<void> {
  const token  = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID

  // Silently skip if not configured — don't throw (feature is optional)
  if (!token || !chatId) {
    console.warn(
      "[notify/telegram] TELEGRAM_BOT_TOKEN or TELEGRAM_ADMIN_CHAT_ID is not set. " +
      "Skipping Telegram notification."
    )
    return
  }

  const text = buildTelegramMessage(order)

  const url = `https://api.telegram.org/bot${token}/sendMessage`

  const res = await fetch(url, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id:    chatId,
      text,
      parse_mode: "HTML",
      // Disable link previews so the control-center URL doesn't expand
      disable_web_page_preview: true,
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => "(no body)")
    // Never log the token — only log the status and sanitised response
    throw new Error(
      `Telegram API returned ${res.status}: ${body.slice(0, 200)}`
    )
  }

  const json = await res.json().catch(() => null)
  if (json && json.ok === false) {
    throw new Error(
      `Telegram API error ${json.error_code}: ${json.description}`
    )
  }
}

// ─── Message builder ──────────────────────────────────────────────────────────

function buildTelegramMessage(order: OrderNotificationPayload): string {
  const dt = new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone:  "Asia/Kolkata",
  }).format(order.createdAt)

  const itemLines = order.items.map((item) => {
    const attrs = [item.size, item.color, item.length]
      .filter(Boolean)
      .join(", ")
    const attrStr = attrs ? ` (${attrs})` : ""
    const price   = formatINR(item.unitPrice)
    const qty     = item.quantity > 1 ? ` × ${item.quantity}` : ""
    const total   = item.quantity > 1 ? ` = ${formatINR(item.totalPrice)}` : ""
    return `  • ${escHtml(item.productName)}${escHtml(attrStr)}${qty}  <b>${price}</b>${total}`
  })

  // Build the admin order URL — only include if APP_URL is configured
  const appUrl  = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? ""
  const orderUrl = appUrl
    ? `${appUrl.replace(/\/$/, "")}/control-center/orders/${order.orderId}`
    : ""

  const lines: string[] = [
    `🛍️ <b>NEW ORDER — NIYARO</b>`,
    ``,
    `📋 Order: <code>${escHtml(order.orderNumber)}</code>`,
    ``,
    `👤 <b>CUSTOMER</b>`,
    `  Name:   ${escHtml(order.customerName)}`,
    `  Phone:  ${escHtml(order.customerPhone)}`,
  ]

  if (order.customerEmail) {
    lines.push(`  Email:  ${escHtml(order.customerEmail)}`)
  }

  lines.push(``)
  lines.push(`🏬 Branch: ${escHtml(order.branchName)}`)
  lines.push(``)
  lines.push(`📦 <b>ITEMS</b>`)
  lines.push(...itemLines)
  lines.push(``)
  lines.push(`💰 <b>Total: ${formatINR(order.total)}</b>`)

  if (order.subtotal !== order.total) {
    lines.push(`   Subtotal: ${formatINR(order.subtotal)}`)
  }

  if (order.notes) {
    lines.push(``)
    lines.push(`📝 Note: ${escHtml(order.notes)}`)
  }

  lines.push(``)
  lines.push(`📅 ${escHtml(dt)} IST`)
  lines.push(``)
  lines.push(`🔔 Status: <b>NEW ORDER — Awaiting Confirmation</b>`)

  if (orderUrl) {
    lines.push(``)
    lines.push(`🔗 <a href="${escHtml(orderUrl)}">View in Control Center</a>`)
  }

  return lines.join("\n")
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style:                 "currency",
    currency:              "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

/** Escape HTML special chars for Telegram HTML parse_mode. */
function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

// ─── WhatsApp stub (future) ───────────────────────────────────────────────────
//
// When you want to add WhatsApp, implement this function:
//
// async function sendWhatsAppNotification(
//   order: OrderNotificationPayload
// ): Promise<void> {
//   const token    = process.env.WHATSAPP_API_TOKEN
//   const phone    = process.env.WHATSAPP_ADMIN_PHONE
//   const provider = process.env.WHATSAPP_PROVIDER   // "meta" | "twilio" | ...
//   if (!token || !phone) {
//     console.warn("[notify/whatsapp] Not configured — skipping.")
//     return
//   }
//   // implement provider-specific API call here
//   throw new Error("WhatsApp provider not yet implemented")
// }
