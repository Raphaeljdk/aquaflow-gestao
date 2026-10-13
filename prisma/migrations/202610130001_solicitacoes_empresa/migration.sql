-- Cadastro de interessados na plataforma, separado de clientes operacionais.
CREATE TYPE "StatusSolicitacaoEmpresa" AS ENUM ('PENDENTE','EM_ANALISE','APROVADO','REJEITADO');

CREATE TABLE "SolicitacaoEmpresa" (
  "id" TEXT NOT NULL,
  "nomeEmpresa" TEXT NOT NULL,
  "nomeResponsavel" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "whatsapp" TEXT NOT NULL,
  "cidade" TEXT NOT NULL,
  "mensagem" TEXT NOT NULL DEFAULT '',
  "status" "StatusSolicitacaoEmpresa" NOT NULL DEFAULT 'PENDENTE',
  "origemHash" TEXT NOT NULL,
  "consentimentoEm" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "revisadoEm" TIMESTAMP(3),
  "revisadoPor" TEXT,
  "observacoesInternas" TEXT NOT NULL DEFAULT '',
  CONSTRAINT "SolicitacaoEmpresa_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SolicitacaoEmpresa_email_key" ON "SolicitacaoEmpresa"("email");
CREATE INDEX "SolicitacaoEmpresa_status_createdAt_idx" ON "SolicitacaoEmpresa"("status", "createdAt");
CREATE INDEX "SolicitacaoEmpresa_origemHash_createdAt_idx" ON "SolicitacaoEmpresa"("origemHash", "createdAt");
