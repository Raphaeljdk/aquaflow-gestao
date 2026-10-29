-- Migração aditiva: os pedidos existentes continuam como contratação anual.
-- Pedir teste gratuito nunca ativa usuário, banco operacional ou cobrança.
ALTER TABLE "SolicitacaoEmpresa"
  ADD COLUMN "modalidadeCadastro" TEXT NOT NULL DEFAULT 'CONTRATACAO',
  ADD COLUMN "testeIniciadoEm" TIMESTAMP(3),
  ADD COLUMN "testeExpiraEm" TIMESTAMP(3);

ALTER TABLE "SolicitacaoEmpresa"
  ADD CONSTRAINT "SolicitacaoEmpresa_teste_prazo_check"
  CHECK (("testeIniciadoEm" IS NULL AND "testeExpiraEm" IS NULL) OR
         ("testeIniciadoEm" IS NOT NULL AND "testeExpiraEm" > "testeIniciadoEm"));

ALTER TABLE "SolicitacaoEmpresa"
  ADD CONSTRAINT "SolicitacaoEmpresa_modalidade_check"
  CHECK ("modalidadeCadastro" IN ('CONTRATACAO', 'TESTE_7_DIAS'));
