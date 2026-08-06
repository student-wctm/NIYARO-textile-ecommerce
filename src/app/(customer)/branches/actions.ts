"use server"

import { revalidatePath } from "next/cache"
import { setSelectedBranchCookie } from "@/lib/branch-cookie"
import type { SelectedBranch } from "@/types/branch"

/**
 * Persists the customer's chosen branch to the cookie.
 * Called from BranchPickerModal when a customer clicks a branch.
 */
export async function selectBranch(branch: SelectedBranch): Promise<void> {
  await setSelectedBranchCookie(branch)
  // Revalidate layouts that read the cookie so the header updates immediately
  revalidatePath("/", "layout")
}
