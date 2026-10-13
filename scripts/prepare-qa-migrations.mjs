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
  const migrationState = await prisma.$queryRawUnsafe(
    "SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='Comanda' AND column_name='telefoneCliente') AS ready"
  );
  if (!migrationState[0]?.ready) {
    console.log("[qa-migrations] Aplicando migration aditiva de operações sem cadastro.");
    await prisma.$disconnect();
    execFileSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], {
      stdio: "inherit", env: process.env,
    });
  } else {
    console.log("[qa-migrations] Operações sem cadastro já preparadas, sem novo bloqueio do banco.");
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
