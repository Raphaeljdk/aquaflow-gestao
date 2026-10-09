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

console.log("[production-init] Aplicando exclusivamente migrations oficiais pendentes.");
execFileSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], {
  stdio: "inherit",
  env: process.env,
});

const prisma = new PrismaClient();
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
