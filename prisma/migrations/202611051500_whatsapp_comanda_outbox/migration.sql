-- Outbox local e consentimento explícito por comanda. Aditiva, sem envio automático por padrão.
ALTER TABLE "Comanda"
  ADD COLUMN "whatsappAutorizadoEm" TIMESTAMP(3),
  ADD COLUMN "whatsappAutorizacaoPor" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Configuracao"
  ADD COLUMN "whatsappEnvioAutomatico" BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE "WhatsAppEnvio" (
  "id" TEXT NOT NULL,
  "comandaId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "tentativas" INTEGER NOT NULL DEFAULT 0,
  "providerMessageId" TEXT,
  "erroCodigo" TEXT NOT NULL DEFAULT '',
  "solicitadoPorId" TEXT NOT NULL DEFAULT '',
  "ultimaTentativaEm" TIMESTAMP(3),
  "enviadoEm" TIMESTAMP(3),
  "entregueEm" TIMESTAMP(3),
  "lidoEm" TIMESTAMP(3),
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WhatsAppEnvio_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WhatsAppEnvio_comandaId_key" ON "WhatsAppEnvio"("comandaId");
CREATE UNIQUE INDEX "WhatsAppEnvio_providerMessageId_key" ON "WhatsAppEnvio"("providerMessageId");
CREATE INDEX "WhatsAppEnvio_status_criadoEm_idx" ON "WhatsAppEnvio"("status", "criadoEm");
ALTER TABLE "WhatsAppEnvio" ADD CONSTRAINT "WhatsAppEnvio_comandaId_fkey"
  FOREIGN KEY ("comandaId") REFERENCES "Comanda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "WhatsAppAutorizacaoEvento" (
  "id" TEXT NOT NULL,
  "comandaId" TEXT NOT NULL,
  "registradoPorId" TEXT NOT NULL,
  "acao" TEXT NOT NULL,
  "origem" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WhatsAppAutorizacaoEvento_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "WhatsAppAutorizacaoEvento_comandaId_createdAt_idx"
  ON "WhatsAppAutorizacaoEvento"("comandaId", "createdAt");
ALTER TABLE "WhatsAppAutorizacaoEvento" ADD CONSTRAINT "WhatsAppAutorizacaoEvento_comandaId_fkey"
  FOREIGN KEY ("comandaId") REFERENCES "Comanda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
