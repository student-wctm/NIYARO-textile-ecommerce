// Server-only module. Never import from Client Components.
// All settings DB access lives here.
//
// Architecture:
//   Settings are stored as flat key-value pairs in the AdminSetting table.
//   This file defines every valid key, its type, default, label, and
//   validation rule. The DB stores all values as strings; this module
//   handles casting.

import { prisma } from "@/lib/prisma"

// ─── Setting key definitions ──────────────────────────────────────────────────

export type SettingKey =
  // Store / Business Information
  | "store.name"
  | "store.tagline"
  | "store.description"
  | "store.phone"
  | "store.email"
  | "store.address"
  // Order Settings
  | "order.number_prefix"
  | "order.default_transfer_charge"
  | "order.cancellation_enabled"
  | "order.cancellation_window_hours"
  // Inventory Settings
  | "inventory.default_low_stock_threshold"
  | "inventory.out_of_stock_behaviour"
  // Store / Customer Settings
  | "store.is_active"
  | "store.reservation_enabled"
  | "store.pickup_only_message"

// ─── Defaults ─────────────────────────────────────────────────────────────────
// All values stored/returned as strings. The settings page casts as needed.

export const SETTING_DEFAULTS: Record<SettingKey, string> = {
  "store.name":                          "NIYARO",
  "store.tagline":                       "Quality Textiles & Fabrics",
  "store.description":                   "Browse our complete textile catalogue online and reserve items for pickup at the branch nearest to you.",
  "store.phone":                         "",
  "store.email":                         "",
  "store.address":                       "",
  "order.number_prefix":                 "NYR",
  "order.default_transfer_charge":       "50",
  "order.cancellation_enabled":          "true",
  "order.cancellation_window_hours":     "24",
  "inventory.default_low_stock_threshold": "5",
  "inventory.out_of_stock_behaviour":    "hide",   // "hide" | "show_unavailable"
  "store.is_active":                     "true",
  "store.reservation_enabled":           "true",
  "store.pickup_only_message":           "Reserve online. Pick up from your nearest branch.",
}

export type AllSettings = Record<SettingKey, string>

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Load all settings from the DB.
 * Any key missing from the DB falls back to SETTING_DEFAULTS.
 */
export async function getAllSettings(): Promise<AllSettings> {
  const rows = await prisma.adminSetting.findMany()
  const map  = Object.fromEntries(rows.map((r) => [r.key, r.value]))

  const result = {} as AllSettings
  for (const key of Object.keys(SETTING_DEFAULTS) as SettingKey[]) {
    result[key] = (map[key] as string | undefined) ?? SETTING_DEFAULTS[key]
  }
  return result
}

/**
 * Fetch a single setting value.
 * Returns the default if the key has never been saved.
 */
export async function getSetting(key: SettingKey): Promise<string> {
  const row = await prisma.adminSetting.findUnique({ where: { key } })
  return row?.value ?? SETTING_DEFAULTS[key]
}

/**
 * Upsert a batch of settings in a single transaction.
 * All values must be pre-validated by the caller (Server Action).
 */
export async function upsertSettings(
  settings: Partial<AllSettings>
): Promise<void> {
  const entries = Object.entries(settings) as [SettingKey, string][]
  if (!entries.length) return

  await prisma.$transaction(
    entries.map(([key, value]) =>
      prisma.adminSetting.upsert({
        where:  { key },
        update: { value },
        create: { key, value },
      })
    )
  )
}
