"use client"

import { useActionState, useEffect, useRef } from "react"
import { saveOrderSettings } from "@/app/admin/settings/actions"
import type { SettingsActionResult } from "./SettingsForm"
import { inputCls, errorInputCls, selectCls } from "./SettingsForm"
import { Feedback, Field, SaveButton } from "./StoreInfoForm"

interface Props {
  defaults: {
    "order.number_prefix":             string
    "order.default_transfer_charge":   string
    "order.cancellation_enabled":      string
    "order.cancellation_window_hours": string
  }
}

const init: SettingsActionResult = { success: false }

export function OrderSettingsForm({ defaults }: Props) {
  const [state, action, isPending] = useActionState(saveOrderSettings, init)
  const ref = useRef<HTMLFormElement>(null)
  const fe  = state.fieldErrors ?? {}

  useEffect(() => {
    if (state.fieldErrors) ref.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
  }, [state])

  const cancellationEnabled = defaults["order.cancellation_enabled"] === "true"

  return (
    <form ref={ref} action={action} noValidate className="space-y-4">
      <Feedback state={state} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Order Number Prefix" name="order.number_prefix"
          required error={fe["order.number_prefix"]}
          hint="Prefix for all order numbers. E.g. NYR → NYR-2026-00001">
          <input name="order.number_prefix" type="text"
            defaultValue={defaults["order.number_prefix"]}
            placeholder="NYR" maxLength={8}
            className={fe["order.number_prefix"] ? errorInputCls : inputCls} />
        </Field>

        <Field label="Default Transfer Charge (₹)" name="order.default_transfer_charge"
          required error={fe["order.default_transfer_charge"]}
          hint="Applied when a customer selects a different pickup branch.">
          <input name="order.default_transfer_charge" type="number"
            min={0} step="0.01"
            defaultValue={defaults["order.default_transfer_charge"]}
            placeholder="50"
            className={fe["order.default_transfer_charge"] ? errorInputCls : inputCls} />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Cancellations" name="order.cancellation_enabled"
          hint="Allow customers to cancel pending orders.">
          <select name="order.cancellation_enabled"
            defaultValue={cancellationEnabled ? "true" : "false"}
            className={selectCls}>
            <option value="true">Enabled</option>
            <option value="false">Disabled</option>
          </select>
        </Field>

        <Field label="Cancellation Window (hours)" name="order.cancellation_window_hours"
          required error={fe["order.cancellation_window_hours"]}
          hint="Maximum hours after placing order that a customer can cancel. 0 = no limit.">
          <input name="order.cancellation_window_hours" type="number"
            min={0} step={1}
            defaultValue={defaults["order.cancellation_window_hours"]}
            placeholder="24"
            className={fe["order.cancellation_window_hours"] ? errorInputCls : inputCls} />
        </Field>
      </div>

      <SaveButton isPending={isPending} />
    </form>
  )
}
