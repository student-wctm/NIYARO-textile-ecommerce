"use server"

import { redirect } from "next/navigation"
import { verifyPassword } from "@/lib/auth"
import { createStaffSession, invalidateStaffSession } from "@/lib/staffAuth"
import { prisma } from "@/lib/prisma"

export interface StaffAuthResult {
  success: boolean
  error?:  string
}

function sanitiseNext(next: string | null | undefined): string | null {
  if (!next) return null
  if (!next.startsWith("/") || next.startsWith("//")) return null
  if (!next.startsWith("/staff")) return null
  if (next.startsWith("/staff/login")) return null
  return next
}

export async function staffLogin(
  _prev: StaffAuthResult,
  formData: FormData
): Promise<StaffAuthResult> {
  const email    = (formData.get("email")    as string | null)?.trim().toLowerCase() ?? ""
  const password = (formData.get("password") as string | null) ?? ""
  const next     = sanitiseNext(formData.get("next") as string | null)

  if (!email || !password) {
    return { success: false, error: "Email and password are required." }
  }

  const staff  = await prisma.staffMember.findUnique({ where: { email } })
  const dummy  = "$2a$12$invalidhashinvalidhashinvalidhashXXXXXXXXXXXXXXXX"
  const hash   = staff?.passwordHash ?? dummy
  const valid  = await verifyPassword(password, hash)

  if (!staff || !valid) {
    return { success: false, error: "Invalid email or password." }
  }
  if (!staff.isActive) {
    return { success: false, error: "Invalid email or password." }
  }

  await createStaffSession(staff.id)
  redirect(next ?? "/staff")
}

export async function staffLogout(): Promise<void> {
  await invalidateStaffSession()
  redirect("/staff/login")
}
