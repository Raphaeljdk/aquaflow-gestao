-- Campo opcional e imutável pelo fluxo público, preservando solicitações existentes.
ALTER TABLE "SolicitacaoEmpresa" ADD COLUMN IF NOT EXISTS "parceiroIndicador" TEXT;
CREATE INDEX IF NOT EXISTS "SolicitacaoEmpresa_parceiroIndicador_createdAt_idx"
  ON "SolicitacaoEmpresa"("parceiroIndicador","createdAt");
