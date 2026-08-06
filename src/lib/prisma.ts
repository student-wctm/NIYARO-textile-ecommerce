// Prisma 7 client singleton for use in Server Components and Server Actions.
//
// Prisma 7 requires an explicit database adapter — it no longer reads
// DATABASE_URL implicitly from the environment. We use @prisma/adapter-pg
// which wraps the `pg` driver (standard PostgreSQL).
//
// Hot-reload safety: In Next.js development mode, module instances are
// recreated on every file save, which would exhaust the DB connection pool.
// We prevent this by attaching the client to Node.js global so it survives
// hot-reloads. In production, a fresh instance is used per process.

import { PrismaClient } from "@/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL environment variable is not set. " +
        "Copy .env.example to .env.local and configure your database connection."
    )
  }

  const adapter = new PrismaPg({ connectionString })

  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  })
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}
