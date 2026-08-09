import { PrismaClient } from "@prisma/client";

// In dev, Next.js hot-reloads modules on every save, which would
// normally create a brand new PrismaClient (and a new DB connection)
// each time. Stashing it on globalThis survives the reload so we
// reuse the same client instead of leaking connections.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}