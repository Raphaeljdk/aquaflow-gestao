-- Aditiva: preserva empresas e solicitações anteriores.
ALTER TABLE "Configuracao"
  ADD COLUMN "manualVideoUrl" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "manualPdfUrl" TEXT NOT NULL DEFAULT '';
ALTER TABLE "SolicitacaoEmpresa"
  ADD COLUMN "cnpj" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "razaoSocial" TEXT NOT NULL DEFAULT '';
