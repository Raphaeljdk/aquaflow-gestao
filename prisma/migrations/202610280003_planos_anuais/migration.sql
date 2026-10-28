-- Novos contratos possuem valor anual fechado, número de parcelas e forma prevista.
-- Todas as colunas são opcionais para preservar solicitações anteriores.
-- Sem geração ou cobrança bancária e sem mudanças nas comandas dos lava-rápidos.
ALTER TABLE "SolicitacaoEmpresa"
  ADD COLUMN "planoPagamento" TEXT,
  ADD COLUMN "totalContratoCentavos" INTEGER,
  ADD COLUMN "quantidadeParcelas" INTEGER;
