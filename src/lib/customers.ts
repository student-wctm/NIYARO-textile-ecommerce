// Server-only. Never import from Client Components.
// All customer DB queries live here.

import { prisma } from "@/lib/prisma"
import type { Customer, CustomerAddress } from "@/generated/prisma/client"

export type { Customer, CustomerAddress }

// ─── Customer lookup ──────────────────────────────────────────────────────────

export async function getCustomerByEmail(email: string): Promise<Customer | null> {
  return prisma.customer.findUnique({ where: { email: email.toLowerCase().trim() } })
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  return prisma.customer.findUnique({ where: { id } })
}

// ─── Registration ─────────────────────────────────────────────────────────────

export interface RegisterInput {
  name:         string
  email:        string
  phone:        string
  passwordHash: string
}

export async function createCustomer(input: RegisterInput): Promise<Customer> {
  return prisma.customer.create({
    data: {
      name:         input.name.trim(),
      email:        input.email.toLowerCase().trim(),
      phone:        input.phone.trim() || null,
      passwordHash: input.passwordHash,
      isActive:     true,
      emailVerified: false,
    },
  })
}

// ─── Profile update ───────────────────────────────────────────────────────────

export async function updateCustomerProfile(
  id: string,
  data: { name?: string; phone?: string; email?: string }
): Promise<Customer> {
  return prisma.customer.update({
    where: { id },
    data:  {
      ...(data.name  ? { name:  data.name.trim() }                     : {}),
      ...(data.phone !== undefined ? { phone: data.phone.trim() || null } : {}),
      ...(data.email ? { email: data.email.toLowerCase().trim() }      : {}),
    },
  })
}

// ─── Orders for account page ──────────────────────────────────────────────────

export interface CustomerOrderSummary {
  id:          string
  orderNumber: string
  total:       number
  status:      string
  itemCount:   number
  createdAt:   Date
  branchName:  string
}

export async function getCustomerOrders(customerId: string): Promise<CustomerOrderSummary[]> {
  const rows = await prisma.order.findMany({
    where:   { customerId },
    orderBy: { createdAt: "desc" },
    take:    50,
    select:  {
      id: true, orderNumber: true, total: true, status: true, createdAt: true,
      branch:  { select: { name: true } },
      _count:  { select: { items: true } },
    },
  })

  return rows.map((r) => ({
    id:          r.id,
    orderNumber: r.orderNumber,
    total:       r.total,
    status:      r.status,
    itemCount:   r._count.items,
    createdAt:   r.createdAt,
    branchName:  r.branch.name,
  }))
}

// ─── Addresses ────────────────────────────────────────────────────────────────

export async function getCustomerAddresses(customerId: string): Promise<CustomerAddress[]> {
  return prisma.customerAddress.findMany({
    where:   { customerId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  })
}

export async function getAddressById(
  id: string,
  customerId: string
): Promise<CustomerAddress | null> {
  return prisma.customerAddress.findFirst({ where: { id, customerId } })
}

export interface AddressInput {
  label?:    string
  fullName:  string
  phone:     string
  line1:     string
  line2?:    string
  city:      string
  state:     string
  pincode:   string
  landmark?: string
  isDefault: boolean
}

export async function createAddress(
  customerId: string,
  input: AddressInput
): Promise<CustomerAddress> {
  // If new address is default, unset others first
  if (input.isDefault) {
    await prisma.customerAddress.updateMany({
      where: { customerId, isDefault: true },
      data:  { isDefault: false },
    })
  }
  return prisma.customerAddress.create({
    data: { customerId, ...input, label: input.label || null, line2: input.line2 || null, landmark: input.landmark || null },
  })
}

export async function updateAddress(
  id: string,
  customerId: string,
  input: AddressInput
): Promise<CustomerAddress> {
  if (input.isDefault) {
    await prisma.customerAddress.updateMany({
      where: { customerId, isDefault: true, id: { not: id } },
      data:  { isDefault: false },
    })
  }
  return prisma.customerAddress.update({
    where: { id },
    data:  { ...input, label: input.label || null, line2: input.line2 || null, landmark: input.landmark || null },
  })
}

export async function deleteAddress(id: string, customerId: string): Promise<void> {
  const addr = await prisma.customerAddress.findFirst({ where: { id, customerId } })
  if (!addr) return
  await prisma.customerAddress.delete({ where: { id } })
  // If we deleted the default, promote the oldest remaining
  if (addr.isDefault) {
    const next = await prisma.customerAddress.findFirst({
      where:   { customerId },
      orderBy: { createdAt: "asc" },
    })
    if (next) await prisma.customerAddress.update({ where: { id: next.id }, data: { isDefault: true } })
  }
}

export async function setDefaultAddress(id: string, customerId: string): Promise<void> {
  await prisma.$transaction([
    prisma.customerAddress.updateMany({ where: { customerId, isDefault: true }, data: { isDefault: false } }),
    prisma.customerAddress.update({ where: { id }, data: { isDefault: true } }),
  ])
}
