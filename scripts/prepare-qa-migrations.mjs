import { execFileSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

// Nunca executa alterações no banco de produção a partir de um Preview.
if (process.env.VERCEL_ENV !== "preview" || !process.env.QA_EXPECTED_WHATSAPP) {
  console.log("[qa-migrations] Ignorado fora da branch isolada de QA.");
  process.exit(0);
}
const prisma = new PrismaClient();
try {
  const c = await prisma.configuracao.findUnique({ where: { id: "empresa" }, select: { telefone: true } });
  if (!c || c.telefone.replace(/[^0-9]/g, "") !== process.env.QA_EXPECTED_WHATSAPP) {
    throw new Error("[qa-migrations] Banco incorreto: telefone de segurança não corresponde ao QA.");
  }
  console.log("[qa-migrations] Banco isolado confirmado.");
  // Aplica somente migrations pendentes, depois de confirmar o banco isolado de QA.
  const { readdirSync } = await import("node:fs");
  const folders = readdirSync(new URL("../prisma/migrations/", import.meta.url), {
    withFileTypes: true,
  }).filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  const migrationTable = await prisma.$queryRawUnsafe(
    `SELECT to_regclass('public."_prisma_migrations"')::text AS name`,
  );
  let applied = new Set();
  if (migrationTable[0]?.name) {
    const rows = await prisma.$queryRawUnsafe(
      'SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations"',
    );
    applied = new Set(rows
      .filter((row) => row.finished_at && !row.rolled_back_at)
      .map((row) => row.migration_name));
  }
  if (folders.some((name) => !applied.has(name))) {
    console.log("[qa-migrations] Aplicando migrations pendentes no QA isolado.");
    await prisma.$disconnect();
    execFileSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], {
      stdio: "inherit", env: process.env,
    });
  } else {
    console.log("[qa-migrations] Nenhuma migration pendente.");
  }
} finally {
  await prisma.$disconnect();
}
// Conta central exclusiva de QA, nunca criada a partir de uma solicitação pública.
const { hash, compare } = await import("bcryptjs");
const adminEmail = process.env.PLATFORM_ADMIN_EMAIL?.trim().toLowerCase();
const adminPassword = process.env.PLATFORM_ADMIN_PASSWORD;
if (!adminEmail || !adminPassword || adminPassword.length < 16)
  throw new Error("[qa-migrations] Credenciais de administração central ausentes ou inseguras.");
const db = new PrismaClient();
try {
  const existing = await db.user.findUnique({ where: { email: adminEmail } });
  if (!existing) {
    await db.user.create({
      data: {
        name: "Administrador da Plataforma",
        email: adminEmail, password: await hash(adminPassword, 12),
        role: "ADMIN", ativo: true,
      },
    });
  } else if (existing.role !== "ADMIN" || !existing.ativo || !(await compare(adminPassword, existing.password))) {
    throw new Error("[qa-migrations] Conta central divergente, ajuste necessário.");
  }
  console.log("[qa-migrations] Administrador central QA validado.");
} finally {
  await db.$disconnect();
}
