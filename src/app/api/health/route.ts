import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const expectedMigrations = [
  "202609210001_initial",
  "202609240001_estoque",
  "202609280001_vistoria_comanda",
  "202609280002_hierarquia_pagamentos",
  "202609280003_funcionario_defaults",
];

export async function GET() {
  const databaseEnv = process.env.DATABASE_URL
    ? "DATABASE_URL"
    : process.env.POSTGRES_PRISMA_URL
      ? "POSTGRES_PRISMA_URL"
      : process.env.POSTGRES_URL
        ? "POSTGRES_URL"
        : process.env.NEON_DATABASE_URL
          ? "NEON_DATABASE_URL"
          : null;

  const checks = {
    databaseEnv,
    database: false,
    schema: false,
    authSecret: Boolean(process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET),
    authUrl: Boolean(
      process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? process.env.VERCEL_URL,
    ),
    demo: process.env.NEXT_PUBLIC_DEMO === "true",
    activeAdmins: 0,
    activeEmployees: 0,
    pixQrConfigured: false,
    pendingMigrations: -1,
    missingMigrations: [] as string[],
  };

  let error = "";
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    checks.database = true;

    const [config, admins, employees, migrationRows] = await Promise.all([
      prisma.configuracao.findUnique({ where: { id: "empresa" } }),
      prisma.user.count({ where: { role: "ADMIN", ativo: true } }),
      prisma.user.count({ where: { role: "FUNCIONARIO", ativo: true } }),
      prisma.$queryRawUnsafe<
        { migration_name: string; finished_at: Date | null; rolled_back_at: Date | null }[]
      >(
        'SELECT "migration_name", "finished_at", "rolled_back_at" FROM "_prisma_migrations"',
      ),
      prisma.material.count(),
      prisma.movimentoEstoque.count(),
      prisma.comanda.count(),
      prisma.agendamento.count(),
    ]);

    checks.activeAdmins = admins;
    checks.activeEmployees = employees;
    checks.pixQrConfigured = Boolean(config?.pixChave?.startsWith("data:image/"));
    checks.pendingMigrations = migrationRows.filter(
      (row) => !row.finished_at && !row.rolled_back_at,
    ).length;
    const applied = new Set(
      migrationRows
        .filter((row) => row.finished_at && !row.rolled_back_at)
        .map((row) => row.migration_name),
    );
    checks.missingMigrations = expectedMigrations.filter(
      (name) => !applied.has(name),
    );
    checks.schema = true;
  } catch (e) {
    error = e instanceof Error ? e.name : "UnknownError";
  }

  return NextResponse.json(
    {
      ok:
        Boolean(checks.databaseEnv) &&
        checks.database &&
        checks.schema &&
        checks.authSecret &&
        checks.pendingMigrations === 0 &&
        checks.missingMigrations.length === 0,
      checks,
      error: error || undefined,
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ?? null,
    },
    {
      status:
        checks.database &&
        checks.schema &&
        checks.pendingMigrations === 0 &&
        checks.missingMigrations.length === 0
          ? 200
          : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
