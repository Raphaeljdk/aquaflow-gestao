-- Cadastro explícito de parceiros, separado das solicitações comerciais e dos dados operacionais.
-- Novos parceiros começam INATIVOS: nada é publicado sem aprovação do gestor.
CREATE TABLE "ParceiroLavaRapido" (
  "id" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "cidade" TEXT NOT NULL DEFAULT '',
  "whatsapp" TEXT NOT NULL,
  "ativo" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ParceiroLavaRapido_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ParceiroLavaRapido_ativo_nome_idx" ON "ParceiroLavaRapido"("ativo","nome");
