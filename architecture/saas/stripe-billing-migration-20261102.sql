-- Aplicar exclusivamente no banco CENTRAL QA após backup e conferência de schema.
-- Não altera bancos de lavagens, clientes, caixa ou estoque dos tenants.
ALTER TABLE platform_billing_charges
 ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
CREATE INDEX IF NOT EXISTS platform_stripe_subscription_idx
 ON platform_billing_charges(stripe_subscription_id,status);
