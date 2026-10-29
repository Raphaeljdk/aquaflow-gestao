-- Adiciona dados comerciais aos parceiros, sem remover ou modificar cadastros anteriores.
ALTER TABLE "ParceiroLavaRapido"
  ADD COLUMN "responsavel" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "endereco" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "cnpj" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "email" TEXT NOT NULL DEFAULT '';
CREATE INDEX "ParceiroLavaRapido_cnpj_idx" ON "ParceiroLavaRapido"("cnpj");
