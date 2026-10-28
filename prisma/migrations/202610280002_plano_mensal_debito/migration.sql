-- Preserva as solicitações anteriores sem inventar um preço retroativo.
-- Novos cadastros passam a registrar 8000 centavos e cartão de débito.
-- Não cria transações bancárias, assinaturas ativas ou meios de pagamento.
ALTER TABLE "SolicitacaoEmpresa"
  ADD COLUMN "mensalidadeCentavos" INTEGER;
ALTER TABLE "SolicitacaoEmpresa"
  ALTER COLUMN "formaPagamentoPrevista" SET DEFAULT 'CARTAO_DEBITO';
