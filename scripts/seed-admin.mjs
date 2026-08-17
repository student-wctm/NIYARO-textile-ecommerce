// =============================================================================
// seed-admin.mjs — First admin seed script
//
// Run ONCE to create the initial admin account.
// Not exposed as an HTTP route — must be run manually on the server/CLI.
//
// Usage:
//   node -r dotenv/config scripts/seed-admin.mjs
//
// Required env vars (add to .env or set in shell):
//   ADMIN_EMAIL=admin@niyaro.com
//   ADMIN_PASSWORD=yourSecurePassword
//   ADMIN_NAME="Super Admin"       (optional, defaults to "Admin")
//
// The script is safe to run multiple times — it refuses to overwrite an
// existing account with the same email.
//
// Never prints the password to stdout.
// =============================================================================

import { createHash, randomBytes } from "node:crypto"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)
const bcrypt  = require("bcryptjs")

// ─── Validate env vars ────────────────────────────────────────────────────────

const email    = process.env.ADMIN_EMAIL?.trim().toLowerCase()
const password = process.env.ADMIN_PASSWORD
const name     = process.env.ADMIN_NAME?.trim() || "Admin"

if (!email) {
  console.error("❌  ADMIN_EMAIL is required.")
  process.exit(1)
}
if (!password || password.length < 8) {
  console.error("❌  ADMIN_PASSWORD is required and must be at least 8 characters.")
  process.exit(1)
}
if (!email.includes("@")) {
  console.error("❌  ADMIN_EMAIL does not appear to be a valid email address.")
  process.exit(1)
}

// ─── Import Prisma (uses DATABASE_URL from dotenv) ────────────────────────────

// We import the generated Prisma client. dotenv/config is loaded via -r flag.
// The adapter requires pg which uses DATABASE_URL from the environment.
const { PrismaClient } = await import("../src/generated/prisma/client.js")
const { PrismaPg }     = await import("@prisma/adapter-pg")

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma  = new PrismaClient({ adapter })

// ─── Check for existing account ───────────────────────────────────────────────

console.log(`Checking for existing admin with email: ${email}`)

try {
  const existing = await prisma.adminMember.findUnique({ where: { email } })

  if (existing) {
    console.warn(`⚠️   An admin with email "${email}" already exists.`)
    console.warn("     To reset the password, update the passwordHash directly in the database.")
    await prisma.$disconnect()
    process.exit(0)
  }

  // ─── Hash password ─────────────────────────────────────────────────────────
  console.log("Hashing password (bcrypt rounds=12)…")
  const passwordHash = await bcrypt.hash(password, 12)

  // ─── Create admin ──────────────────────────────────────────────────────────
  const admin = await prisma.adminMember.create({
    data: { email, passwordHash, name, isActive: true },
  })

  console.log("✅  Admin created successfully.")
  console.log(`    ID:    ${admin.id}`)
  console.log(`    Email: ${admin.email}`)
  console.log(`    Name:  ${admin.name}`)
  console.log("    Password: [not printed]")
  console.log("")
  console.log("You can now sign in at /control-center/login")
} catch (err) {
  console.error("❌  Failed to create admin:", err?.message ?? err)
  process.exit(1)
} finally {
  await prisma.$disconnect()
}
