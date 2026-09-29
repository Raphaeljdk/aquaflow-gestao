import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const databaseUrl =
  process.env.DATABASE_URL ??
  process.env.POSTGRES_PRISMA_URL ??
  process.env.POSTGRES_URL ??
  process.env.NEON_DATABASE_URL;

if (!process.env.DATABASE_URL && databaseUrl)
  process.env.DATABASE_URL = databaseUrl;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error"],
    ...(databaseUrl
      ? { datasources: { db: { url: databaseUrl } } }
      : {}),
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
