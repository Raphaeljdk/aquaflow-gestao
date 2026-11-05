-- Nunca copiar valores de pixChave (legado e potencialmente conta de assinaturas).
-- Cada administrador deve cadastrar explicitamente seu próprio Pix operacional.
ALTER TABLE "Configuracao"
  ADD COLUMN "pixRecebimentoChave" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "pixRecebimentoAtivo" BOOLEAN NOT NULL DEFAULT false;
