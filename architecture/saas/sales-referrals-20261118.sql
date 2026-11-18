-- Controle central exclusivo da Ducha Elitte (nunca no banco operacional).
-- Indicação identifica origem comercial; não concede permissão nem altera teste/licença.
CREATE TABLE IF NOT EXISTS platform_sales_partners (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 name TEXT NOT NULL,
 code TEXT NOT NULL UNIQUE CHECK (code ~ '^ind-[0-9a-f]{12}$'),
 active BOOLEAN NOT NULL DEFAULT true,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS platform_sales_referrals (
 tenant_id UUID PRIMARY KEY REFERENCES platform_tenants(id) ON DELETE RESTRICT,
 partner_id UUID NOT NULL REFERENCES platform_sales_partners(id) ON DELETE RESTRICT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS platform_sales_referrals_partner_idx
 ON platform_sales_referrals(partner_id,created_at DESC);
