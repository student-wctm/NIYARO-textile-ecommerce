// =============================================================================
// Admin — Settings
// SECURITY TODO: No authentication yet. Protect before production.
//
// Architecture:
//   - Server Component: loads all settings from DB in one parallel pass
//   - Each section is a separate client-side form with its own Server Action
//   - Saving one section never affects another
//   - All values persist in AdminSetting table (key-value, Neon PostgreSQL)
// =============================================================================

import type { Metadata } from "next"
import { getAllSettings } from "@/lib/settings"
import { SettingsSection }          from "./_components/SettingsSection"
import { StoreInfoForm }            from "./_components/StoreInfoForm"
import { OrderSettingsForm }        from "./_components/OrderSettingsForm"
import { InventorySettingsForm }    from "./_components/InventorySettingsForm"
import { CustomerSettingsForm }     from "./_components/CustomerSettingsForm"

export const metadata: Metadata = { title: "Settings" }
export const dynamic = "force-dynamic"

export default async function AdminSettingsPage() {
  const settings = await getAllSettings()

  return (
    <div className="max-w-3xl space-y-6 pb-10">

      {/* ── Page header ── */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Global configuration for the NIYARO platform. Changes persist immediately to the database.
        </p>
      </div>

      {/* ── 1. Store / Business Information ── */}
      <SettingsSection
        icon="🏪"
        title="Store Information"
        description="Your business name, contact details, and description shown to customers."
      >
        <StoreInfoForm defaults={{
          "store.name":        settings["store.name"],
          "store.tagline":     settings["store.tagline"],
          "store.description": settings["store.description"],
          "store.phone":       settings["store.phone"],
          "store.email":       settings["store.email"],
          "store.address":     settings["store.address"],
        }} />
      </SettingsSection>

      {/* ── 2. Order Settings ── */}
      <SettingsSection
        icon="📋"
        title="Order Settings"
        description="Order numbering, transfer charges, and cancellation policy."
      >
        <OrderSettingsForm defaults={{
          "order.number_prefix":             settings["order.number_prefix"],
          "order.default_transfer_charge":   settings["order.default_transfer_charge"],
          "order.cancellation_enabled":      settings["order.cancellation_enabled"],
          "order.cancellation_window_hours": settings["order.cancellation_window_hours"],
        }} />
      </SettingsSection>

      {/* ── 3. Inventory Settings ── */}
      <SettingsSection
        icon="📦"
        title="Inventory Settings"
        description="Default threshold for low-stock alerts and out-of-stock display behaviour."
      >
        <InventorySettingsForm defaults={{
          "inventory.default_low_stock_threshold": settings["inventory.default_low_stock_threshold"],
          "inventory.out_of_stock_behaviour":      settings["inventory.out_of_stock_behaviour"],
        }} />
      </SettingsSection>

      {/* ── 4. Store / Customer Settings ── */}
      <SettingsSection
        icon="🛍️"
        title="Store & Reservation Settings"
        description="Control store visibility and the customer reservation experience."
      >
        <CustomerSettingsForm defaults={{
          "store.is_active":           settings["store.is_active"],
          "store.reservation_enabled": settings["store.reservation_enabled"],
          "store.pickup_only_message": settings["store.pickup_only_message"],
        }} />
      </SettingsSection>

      {/* ── Info footer ── */}
      <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 px-5 py-4 text-xs text-slate-400 dark:text-slate-500 space-y-1">
        <p>
          <strong className="text-slate-600 dark:text-slate-300">Branch-specific transfer charges</strong> are
          managed per route in{" "}
          <a href="/admin/branches" className="underline hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
            Admin → Branches
          </a>.
          The default transfer charge above applies when no route-specific charge is configured.
        </p>
        <p>
          <strong className="text-slate-600 dark:text-slate-300">Per-branch low-stock thresholds</strong> are
          set individually in{" "}
          <a href="/admin/inventory" className="underline hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
            Admin → Inventory
          </a>.
          The default above applies to new inventory records only.
        </p>
      </div>
    </div>
  )
}
