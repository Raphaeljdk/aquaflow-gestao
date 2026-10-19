-- Guarda a forma de pagamento prevista e a ciência comercial do interessado.
-- Não cria cobranças bancárias nem define valores.
ALTER TABLE "SolicitacaoEmpresa"
  ADD COLUMN "formaPagamentoPrevista" TEXT NOT NULL DEFAULT 'PIX_INTER',
  ADD COLUMN "cienciaCondicoesComerciaisEm" TIMESTAMP(3);
