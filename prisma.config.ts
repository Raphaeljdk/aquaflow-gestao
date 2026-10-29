import { defineConfig } from "prisma/config";

/**
 * Configuração do Prisma CLI compatível com Prisma 6.19.3.
 * A DATABASE_URL continua declarada no schema.prisma desta versão.
 * Não executa seed, migrate ou altera dados automaticamente.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node --env-file=.env --import tsx prisma/seed.ts",
  },
});
