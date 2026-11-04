-- Additive indexes in the LEGACY registration database; does not touch users or operations.
-- The new central registry separately serializes and rejects duplicate contacts.
CREATE UNIQUE INDEX IF NOT EXISTS solicitacao_empresa_whatsapp_digits_unique
 ON "SolicitacaoEmpresa" (regexp_replace("whatsapp",'[^0-9]','','g'));
CREATE UNIQUE INDEX IF NOT EXISTS solicitacao_empresa_cnpj_digits_unique
 ON "SolicitacaoEmpresa" (regexp_replace("cnpj",'[^0-9]','','g'))
 WHERE "cnpj" IS NOT NULL AND regexp_replace("cnpj",'[^0-9]','','g')<>'';
