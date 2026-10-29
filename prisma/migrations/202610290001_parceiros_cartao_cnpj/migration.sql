-- Só adiciona colunas, sem remover cadastros, usuários ou histórico.
ALTER TABLE "ParceiroLavaRapido"
  ADD COLUMN "cnpj" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "razaoSocial" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "responsavel" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "endereco" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "cep" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "bairro" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "uf" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "email" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "telefoneComercial" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "situacaoCadastral" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "atividadePrincipal" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "naturezaJuridica" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "porte" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "dataAbertura" TEXT NOT NULL DEFAULT '';
CREATE INDEX "ParceiroLavaRapido_cnpj_idx" ON "ParceiroLavaRapido"("cnpj");
-- Bancos existentes podem conter diversos parceiros sem CNPJ.
-- Apenas números válidos preenchidos passam a ser únicos.
CREATE UNIQUE INDEX "ParceiroLavaRapido_cnpj_not_empty_key"
ON "ParceiroLavaRapido" ("cnpj") WHERE "cnpj" <> '';
