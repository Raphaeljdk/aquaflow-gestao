// Primeira configuração de produção. Idempotente: nunca apaga nem sobrescreve usuários existentes.
import { execFileSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { hash, compare } from "bcryptjs";

if (process.env.VERCEL_ENV !== "production") {
  console.log("[production-init] Ignorado fora de produção.");
  process.exit(0);
}
if (!process.env.DATABASE_URL) throw new Error("[production-init] DATABASE_URL ausente.");

const adminEmail = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
const adminPassword = process.env.SEED_ADMIN_PASSWORD;
const employeeEmail = process.env.SEED_EMPLOYEE_EMAIL?.trim().toLowerCase();
const employeePassword = process.env.SEED_EMPLOYEE_PASSWORD;
if (!adminEmail || !employeeEmail || adminEmail === employeeEmail) {
  throw new Error("[production-init] E-mails de ADMIN/FUNCIONARIO ausentes ou duplicados.");
}
if (!adminPassword || adminPassword.length < 12 || !employeePassword || employeePassword.length < 12) {
  throw new Error("[production-init] Senhas de produção devem ter pelo menos 12 caracteres.");
}

const prisma = new PrismaClient();

// Evita disputar o advisory lock do Prisma entre deploys simultâneos quando
// todas as migrations versionadas já estão aplicadas neste banco.
const { readdirSync } = await import("node:fs");
const migrationFolders = readdirSync(new URL("../prisma/migrations/", import.meta.url), {
  withFileTypes: true,
}).filter((x) => x.isDirectory()).map((x) => x.name);
let needsMigration = true;
const relation = await prisma.$queryRawUnsafe(
  `SELECT to_regclass('public."_prisma_migrations"')::text AS name`,
);
if (relation[0]?.name) {
  const rows = await prisma.$queryRawUnsafe(
    'SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations"',
  );
  const applied = new Set(rows
    .filter((m) => m.finished_at && !m.rolled_back_at)
    .map((m) => m.migration_name));
  needsMigration = migrationFolders.some((name) => !applied.has(name));
}
if (needsMigration) {
  console.log("[production-init] Aplicando migrations oficiais pendentes.");
  await prisma.$disconnect();
  execFileSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], {
    stdio: "inherit",
    env: process.env,
  });
} else {
  console.log("[production-init] Migrations já aplicadas; evitando lock concorrente.");
}
try {
  await prisma.$transaction(async (tx) => {
    await tx.configuracao.upsert({
      where: { id: "empresa" },
      create: { id: "empresa", nome: "Ducha Elitte", timezone: "America/Sao_Paulo" },
      update: {},
    });
    await tx.funcionario.upsert({
      where: { id: "ducha-inicial-funcionario" },
      create: {
        id: "ducha-inicial-funcionario",
        nome: "Funcionário Ducha Elitte",
        email: employeeEmail,
        cargo: "FUNCIONARIO",
        ativo: true,
      },
      update: {},
    });
    await tx.user.upsert({
      where: { email: adminEmail },
      create: {
        name: "Administrador Ducha Elitte",
        email: adminEmail,
        password: await hash(adminPassword, 12),
        role: "ADMIN",
        ativo: true,
      },
      update: {},
    });
    await tx.user.upsert({
      where: { email: employeeEmail },
      create: {
        name: "Funcionário Ducha Elitte",
        email: employeeEmail,
        password: await hash(employeePassword, 12),
        role: "FUNCIONARIO",
        ativo: true,
        funcionarioId: "ducha-inicial-funcionario",
      },
      update: {},
    });
  }, { timeout: 30000 });

  const [admin, employee] = await Promise.all([
    prisma.user.findUnique({ where: { email: adminEmail } }),
    prisma.user.findUnique({ where: { email: employeeEmail } }),
  ]);
  if (!admin?.ativo || admin.role !== "ADMIN" || !(await compare(adminPassword, admin.password))) {
    throw new Error("[production-init] Credencial ADMIN inválida após inicialização.");
  }
  if (!employee?.ativo || employee.role !== "FUNCIONARIO" || !employee.funcionarioId ||
      !(await compare(employeePassword, employee.password))) {
    throw new Error("[production-init] Credencial FUNCIONARIO inválida após inicialização.");
  }
  console.log("[production-init] Configuração e credenciais iniciais verificadas; registros preservados.");
} finally {
  await prisma.$disconnect();
}
