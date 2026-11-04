-- Control database only: one-time, email-verified links for owner-initiated payments.
-- No Stripe payment or tenant is created by this migration.
CREATE TABLE IF NOT EXISTS platform_checkout_access_tokens (
 token_hash TEXT PRIMARY KEY,
 tenant_id UUID NOT NULL REFERENCES platform_tenants(id),
 email_hash TEXT NOT NULL,
 requester_hash TEXT NOT NULL,
 state TEXT NOT NULL DEFAULT 'PENDING' CHECK(state IN ('PENDING','USED')),
 expires_at TIMESTAMPTZ NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 used_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS platform_checkout_access_email_recent
 ON platform_checkout_access_tokens(email_hash,created_at DESC);
CREATE INDEX IF NOT EXISTS platform_checkout_access_requester_recent
 ON platform_checkout_access_tokens(requester_hash,created_at DESC);
CREATE INDEX IF NOT EXISTS platform_checkout_access_tenant_recent
 ON platform_checkout_access_tokens(tenant_id,created_at DESC);
ALTER TABLE platform_billing_charges ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS platform_billing_checkout_session_unique
 ON platform_billing_charges(stripe_checkout_session_id)
 WHERE stripe_checkout_session_id IS NOT NULL;
