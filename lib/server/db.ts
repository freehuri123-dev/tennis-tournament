import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { attachDatabasePool } from "@vercel/functions/db-connections";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaPool?: Pool;
  prismaPoolAttached?: boolean;
  prismaPoolErrorHandlerAttached?: boolean;
};

function createDatabasePool() {
  const databaseUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DIRECT_URL or DATABASE_URL is required to initialize PrismaClient.");
  }

  return new Pool({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 5_000,
    max: 1
  });
}

const pool = globalForPrisma.prismaPool ?? createDatabasePool();

if (!globalForPrisma.prismaPoolErrorHandlerAttached) {
  pool.on("error", (error) => {
    console.error("[database-pool] Idle PostgreSQL connection error", {
      code: "code" in error ? error.code : undefined,
      message: error.message
    });
  });
  globalForPrisma.prismaPoolErrorHandlerAttached = true;
}

if (process.env.VERCEL && !globalForPrisma.prismaPoolAttached) {
  attachDatabasePool(pool);
  globalForPrisma.prismaPoolAttached = true;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg(pool)
  });

globalForPrisma.prismaPool = pool;
globalForPrisma.prisma = prisma;
