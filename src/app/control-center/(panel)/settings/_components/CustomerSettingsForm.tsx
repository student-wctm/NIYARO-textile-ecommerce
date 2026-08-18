"use client"

import { useActionState, useEffect, useRef } from "react"
import { saveCustomerSettings } from "@/app/control-center/(panel)/settings/actions"
import type { SettingsActionResult } from "./SettingsForm"
import { inputCls, selectCls } from "./SettingsForm"
import { Feedback, Field, SaveButton } from "./StoreInfoForm"

interface Props {
  defaults: {
    "store.is_active":           string
    "store.reservation_enabled": string
    "store.pickup_only_message": string
  }
}

const init: SettingsActionResult = { success: false }

export function CustomerSettingsForm({ defaults }: Props) {
  const [state, action, isPending] = useActionState(saveCustomerSettings, init)
  const ref = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.fieldErrors) ref.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
  }, [state])

  return (
    <form ref={ref} action={action} noValidate className="space-y-4">
      <Feedback state={state} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Store Visibility" name="store.is_active"
          hint="Hides the storefront from customers when set to Inactive.">
          <select name="store.is_active"
            defaultValue={defaults["store.is_active"] === "true" ? "true" : "false"}
            className={selectCls}>
            <option value="true">Active — open to customers</option>
            <option value="false">Inactive — store hidden</option>
          </select>
        </Field>

        <Field label="Reservations" name="store.reservation_enabled"
          hint="Allow customers to reserve items for pickup.">
          <select name="store.reservation_enabled"
            defaultValue={defaults["store.reservation_enabled"] === "true" ? "true" : "false"}
            className={selectCls}>
            <option value="true">Enabled</option>
            <option value="false">Disabled</option>
          </select>
        </Field>
      </div>

      <Field label="Pickup Message" name="store.pickup_only_message"
        hint="Shown to customers in the header and product pages.">
        <input name="store.pickup_only_message" type="text"
          defaultValue={defaults["store.pickup_only_message"]}
          placeholder="Reserve online. Pick up from your nearest branch."
          className={inputCls} />
      </Field>

      <SaveButton isPending={isPending} />
    </form>
  )
}
