import { PrismaClient } from "@prisma/client";
import { catalogoInicial, deveCriarCatalogoInicial } from "../src/lib/catalogo-inicial.ts";

// Inicialização conservadora: nunca altera preço, status ou nome de serviços
// já cadastrados pelo proprietário e não inclui dados fictícios de clientes.
const env = process.env.VERCEL_ENV;
if (env !== "preview" && env !== "production") {
  console.log("[catalogo] Ignorado fora da Vercel; nenhum dado alterado.");
  process.exit(0);
}
if (!process.env.DATABASE_URL) throw new Error("[catalogo] DATABASE_URL ausente.");
const prisma = new PrismaClient();
try {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(642019)`;
    if (env === "preview") {
      if (!process.env.QA_EXPECTED_WHATSAPP) {
        throw new Error("[catalogo] Bloqueado: banco QA sem identificação.");
      }
      const conf = await tx.configuracao.findUnique({
        where: { id: "empresa" }, select: { telefone: true },
      });
      if (!conf || conf.telefone.replace(/\D/g, "") !== process.env.QA_EXPECTED_WHATSAPP) {
        throw new Error("[catalogo] Identificação do banco QA não confere.");
      }
    }
    const count = await tx.servico.count();
    if (!deveCriarCatalogoInicial(count)) {
      console.log("[catalogo] Catálogo existente preservado (" + count + " serviços).");
      return;
    }
    await tx.servico.createMany({
      data: catalogoInicial.map(({ id, nome, descricao, preco, duracaoMin, ativo }) => ({
        id, nome, descricao, preco, duracaoMin, ativo,
      })),
    });
    console.log("[catalogo] Catálogo provisório criado: " + catalogoInicial.length + " serviços editáveis.");
  });
} finally {
  await prisma.$disconnect();
}
