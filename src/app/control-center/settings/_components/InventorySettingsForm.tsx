"use client"

import { useActionState, useEffect, useRef } from "react"
import { saveInventorySettings } from "@/app/control-center/settings/actions"
import type { SettingsActionResult } from "./SettingsForm"
import { inputCls, errorInputCls, selectCls } from "./SettingsForm"
import { Feedback, Field, SaveButton } from "./StoreInfoForm"

interface Props {
  defaults: {
    "inventory.default_low_stock_threshold": string
    "inventory.out_of_stock_behaviour":      string
  }
}

const init: SettingsActionResult = { success: false }

export function InventorySettingsForm({ defaults }: Props) {
  const [state, action, isPending] = useActionState(saveInventorySettings, init)
  const ref = useRef<HTMLFormElement>(null)
  const fe  = state.fieldErrors ?? {}

  useEffect(() => {
    if (state.fieldErrors) ref.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
  }, [state])

  return (
    <form ref={ref} action={action} noValidate className="space-y-4">
      <Feedback state={state} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Default Low Stock Threshold" name="inventory.default_low_stock_threshold"
          required error={fe["inventory.default_low_stock_threshold"]}
          hint="New inventory records will use this threshold. Existing records are not changed.">
          <input name="inventory.default_low_stock_threshold" type="number"
            min={0} step={1}
            defaultValue={defaults["inventory.default_low_stock_threshold"]}
            placeholder="5"
            className={fe["inventory.default_low_stock_threshold"] ? errorInputCls : inputCls} />
        </Field>

        <Field label="Out-of-Stock Behaviour" name="inventory.out_of_stock_behaviour"
          error={fe["inventory.out_of_stock_behaviour"]}
          hint="How out-of-stock products are displayed to customers.">
          <select name="inventory.out_of_stock_behaviour"
            defaultValue={defaults["inventory.out_of_stock_behaviour"]}
            className={selectCls}>
            <option value="hide">Hide from catalogue</option>
            <option value="show_unavailable">Show as unavailable</option>
          </select>
        </Field>
      </div>

      <SaveButton isPending={isPending} />
    </form>
  )
}
