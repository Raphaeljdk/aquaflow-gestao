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
  console.log("[qa-migrations] Banco isolado confirmado. Aplicando somente migrations pendentes.");
} finally {
  await prisma.$disconnect();
}
execFileSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], {
  stdio: "inherit",
  env: process.env,
});
