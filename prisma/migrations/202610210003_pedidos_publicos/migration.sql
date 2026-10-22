CREATE TYPE "StatusPedidoAgendamento" AS ENUM ('PENDENTE','CONFIRMADO','RECUSADO');
CREATE TABLE "PedidoAgendamentoPublico" (
  "id" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "telefone" TEXT NOT NULL,
  "tipo" "TipoVeiculo" NOT NULL,
  "placa" TEXT NOT NULL,
  "descricaoVeiculo" TEXT NOT NULL,
  "servicoId" TEXT NOT NULL,
  "dataHora" TIMESTAMPTZ(3) NOT NULL,
  "observacoes" TEXT NOT NULL DEFAULT '',
  "status" "StatusPedidoAgendamento" NOT NULL DEFAULT 'PENDENTE',
  "origemHash" TEXT NOT NULL,
  "agendamentoId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PedidoAgendamentoPublico_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PedidoAgendamentoPublico_agendamentoId_key" ON "PedidoAgendamentoPublico"("agendamentoId");
CREATE INDEX "PedidoAgendamentoPublico_status_createdAt_idx" ON "PedidoAgendamentoPublico"("status","createdAt");
CREATE INDEX "PedidoAgendamentoPublico_origemHash_createdAt_idx" ON "PedidoAgendamentoPublico"("origemHash","createdAt");
