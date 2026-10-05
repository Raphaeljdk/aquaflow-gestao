import { randomUUID } from "node:crypto";

const databaseUrl =
  process.env.DATABASE_URL ??
  process.env.POSTGRES_PRISMA_URL ??
  process.env.POSTGRES_URL ??
  process.env.NEON_DATABASE_URL;

if (process.env.VERCEL_ENV !== "production") {
  console.log("[production-migrations] ambiente não produtivo: ignorado");
  process.exit(0);
}

if (!databaseUrl) {
  throw new Error("[production-migrations] URL do PostgreSQL não configurada.");
}

if (!process.env.DATABASE_URL) process.env.DATABASE_URL = databaseUrl;

const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient({
  datasources: { db: { url: databaseUrl } },
  log: ["error"],
});

const migrations = [
  {
    name: "202609210001_initial",
    checksum: "91342a81063fe4f3b1fc0aaa1e02d64e82d3645167d8bca33c1ee885849ab449",
  },
  {
    name: "202609240001_estoque",
    checksum: "1281b2668465fc5c3f2e27732b08fae6fec11ebaba05a05f53091a8a27f2ce17",
  },
  {
    name: "202609280001_vistoria_comanda",
    checksum: "0e292da671fedeb1094882375e0080b7fa7dd4827bd9757450225024738a32ef",
  },
  {
    name: "202609280002_hierarquia_pagamentos",
    checksum: "026a1641f600353bd25e2e7924f63794e7374c292d23e72cdce0dd6536d0e5ea",
  },
  {
    name: "202609280003_funcionario_defaults",
    checksum: "ad425906d8f7b32a02ad0f5094e6f1f6842b985152c0ad1b93651ec6e5b93462",
  },
];

async function ensureMigrationTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id" VARCHAR(36) PRIMARY KEY NOT NULL,
      "checksum" VARCHAR(64) NOT NULL,
      "finished_at" TIMESTAMPTZ,
      "migration_name" VARCHAR(255) NOT NULL,
      "logs" TEXT,
      "rolled_back_at" TIMESTAMPTZ,
      "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "applied_steps_count" INTEGER NOT NULL DEFAULT 0
    )
  `);
}

async function findMigration(name) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT "id", "finished_at", "rolled_back_at"
       FROM "_prisma_migrations"
      WHERE "migration_name" = $1
      ORDER BY "started_at" DESC
      LIMIT 1`,
    name,
  );
  return rows[0] ?? null;
}

async function markApplied({ name, checksum }) {
  const existing = await findMigration(name);
  if (existing) {
    await prisma.$executeRawUnsafe(
      `UPDATE "_prisma_migrations"
          SET "checksum" = $1,
              "finished_at" = now(),
              "rolled_back_at" = NULL,
              "logs" = NULL,
              "applied_steps_count" = GREATEST("applied_steps_count", 1)
        WHERE "id" = $2`,
      checksum,
      existing.id,
    );
    return;
  }

  await prisma.$executeRawUnsafe(
    `INSERT INTO "_prisma_migrations"
      ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count")
      VALUES ($1, $2, now(), $3, NULL, NULL, now(), 1)`,
    randomUUID(),
    checksum,
    name,
  );
}

async function ensureInitialBaseline() {
  const requiredTables = [
    "User",
    "Cliente",
    "Veiculo",
    "Servico",
    "Funcionario",
    "Comanda",
    "ItemComanda",
    "Agendamento",
    "AgendamentoServico",
    "Configuracao",
    "LoginAttempt",
  ];

  for (const table of requiredTables) {
    const rows = await prisma.$queryRawUnsafe(
      "SELECT to_regclass($1)::text AS name",
      `"${table}"`,
    );
    if (!rows[0]?.name) {
      throw new Error(
        `[production-migrations] schema inicial incompleto: ${table} ausente.`,
      );
    }
  }

  await markApplied(migrations[0]);
}

async function ensureStock() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Material" (
      "id" TEXT NOT NULL,
      "nome" TEXT NOT NULL,
      "unidade" TEXT NOT NULL,
      "quantidade" DECIMAL(15,3) NOT NULL DEFAULT 0,
      "minimo" DECIMAL(15,3) NOT NULL DEFAULT 0,
      "custoUnitario" DECIMAL(12,2) NOT NULL DEFAULT 0,
      "ativo" BOOLEAN NOT NULL DEFAULT true,
      CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(
    'CREATE UNIQUE INDEX IF NOT EXISTS "Material_nome_key" ON "Material"("nome")',
  );

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "MovimentoEstoque" (
      "id" TEXT NOT NULL,
      "materialId" TEXT NOT NULL,
      "tipo" TEXT NOT NULL,
      "quantidade" DECIMAL(15,3) NOT NULL,
      "observacao" TEXT NOT NULL DEFAULT '',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "MovimentoEstoque_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS "MovimentoEstoque_materialId_createdAt_idx" ON "MovimentoEstoque"("materialId", "createdAt")',
  );
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'MovimentoEstoque_materialId_fkey'
      ) THEN
        ALTER TABLE "MovimentoEstoque"
          ADD CONSTRAINT "MovimentoEstoque_materialId_fkey"
          FOREIGN KEY ("materialId")
          REFERENCES "Material"("id")
          ON DELETE RESTRICT
          ON UPDATE CASCADE;
      END IF;
    END $$;
  `);

  await markApplied(migrations[1]);
}

async function ensureInspection() {
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "Comanda" ADD COLUMN IF NOT EXISTS "vistoria" JSONB',
  );
  await prisma.$executeRawUnsafe(`
    UPDATE "Configuracao"
       SET "nome" = 'Ducha Elitte'
     WHERE "id" = 'empresa'
       AND "nome" IN ('AquaFlow', 'AquaFlow Lava Rápido')
  `);
  await markApplied(migrations[2]);
}

async function ensureHierarchyPayments() {
  await prisma.$executeRawUnsafe(
    'ALTER TYPE "Role" ADD VALUE IF NOT EXISTS \'FUNCIONARIO\'',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "Comanda" ADD COLUMN IF NOT EXISTS "pagoEm" TIMESTAMP(3)',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "Configuracao" ADD COLUMN IF NOT EXISTS "pixChave" TEXT NOT NULL DEFAULT \'\'',
  );
  await markApplied(migrations[3]);
}

async function ensureDefaults() {
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT \'FUNCIONARIO\'',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "Funcionario" ALTER COLUMN "cargo" SET DEFAULT \'FUNCIONARIO\'',
  );
  await markApplied(migrations[4]);
}

try {
  await prisma.$queryRawUnsafe("SELECT 1");
  await ensureMigrationTable();

  const appliedNow = [];

  for (const migration of migrations) {
    const existing = await findMigration(migration.name);

    if (existing?.finished_at && !existing.rolled_back_at) {
      await markApplied(migration);
      continue;
    }

    if (migration.name === "202609210001_initial") {
      await ensureInitialBaseline();
    } else if (migration.name === "202609240001_estoque") {
      await ensureStock();
    } else if (migration.name === "202609280001_vistoria_comanda") {
      await ensureInspection();
    } else if (migration.name === "202609280002_hierarquia_pagamentos") {
      await ensureHierarchyPayments();
    } else if (migration.name === "202609280003_funcionario_defaults") {
      await ensureDefaults();
    }

    appliedNow.push(migration.name);
  }

  const rows = await prisma.$queryRawUnsafe(
    'SELECT "migration_name", "finished_at", "rolled_back_at" FROM "_prisma_migrations"',
  );
  const completed = new Set(
    rows
      .filter((row) => row.finished_at && !row.rolled_back_at)
      .map((row) => row.migration_name),
  );
  const missing = migrations
    .map((migration) => migration.name)
    .filter((name) => !completed.has(name));

  if (missing.length) {
    throw new Error(
      "[production-migrations] migrations ainda faltando: " + missing.join(", "),
    );
  }

  console.log(
    "[production-migrations] concluído",
    JSON.stringify({ appliedNow, missing }),
  );
} finally {
  await prisma.$disconnect();
}
