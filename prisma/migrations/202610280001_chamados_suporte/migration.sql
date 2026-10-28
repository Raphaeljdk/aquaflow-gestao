-- Chamados de suporte são independentes de clientes, comandas e agendamentos.
-- Mantém registros antigos inalterados.
CREATE TYPE "StatusChamado" AS ENUM ('ABERTO','EM_ATENDIMENTO','AGUARDANDO_CLIENTE','RESOLVIDO','FECHADO');
CREATE TYPE "CategoriaChamado" AS ENUM ('ERRO','DUVIDA','MELHORIA','FINANCEIRO','OUTRO');
CREATE TYPE "PrioridadeChamado" AS ENUM ('NORMAL','ALTA');
CREATE TYPE "AutorMensagemChamado" AS ENUM ('SOLICITANTE','SUPORTE');

CREATE TABLE "ChamadoSuporte" (
  "id" TEXT NOT NULL,
  "empresaNome" TEXT NOT NULL,
  "empresaCnpj" TEXT NOT NULL DEFAULT '',
  "criadoPorId" TEXT NOT NULL,
  "criadoPorNome" TEXT NOT NULL,
  "criadoPorEmail" TEXT NOT NULL,
  "titulo" TEXT NOT NULL,
  "categoria" "CategoriaChamado" NOT NULL,
  "prioridade" "PrioridadeChamado" NOT NULL DEFAULT 'NORMAL',
  "status" "StatusChamado" NOT NULL DEFAULT 'ABERTO',
  "ultimaRespostaEm" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ChamadoSuporte_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "MensagemChamado" (
  "id" TEXT NOT NULL,
  "chamadoId" TEXT NOT NULL,
  "autorTipo" "AutorMensagemChamado" NOT NULL,
  "autorId" TEXT NOT NULL,
  "autorNome" TEXT NOT NULL,
  "texto" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MensagemChamado_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ChamadoSuporte_status_createdAt_idx" ON "ChamadoSuporte"("status","createdAt");
CREATE INDEX "ChamadoSuporte_criadoPorId_createdAt_idx" ON "ChamadoSuporte"("criadoPorId","createdAt");
CREATE INDEX "MensagemChamado_chamadoId_createdAt_idx" ON "MensagemChamado"("chamadoId","createdAt");
ALTER TABLE "MensagemChamado" ADD CONSTRAINT "MensagemChamado_chamadoId_fkey" FOREIGN KEY ("chamadoId") REFERENCES "ChamadoSuporte"("id") ON DELETE CASCADE ON UPDATE CASCADE;
