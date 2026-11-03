-- Central control database ONLY, never an operational lava-rápido database.
CREATE TABLE IF NOT EXISTS platform_password_resets (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 token_hash TEXT NOT NULL UNIQUE,
 email_hash TEXT NOT NULL,
 origin_hash TEXT NOT NULL,
 account_kind TEXT NOT NULL CHECK (account_kind IN ('LEGACY','SAAS')),
 account_id TEXT NOT NULL,
 state TEXT NOT NULL DEFAULT 'PENDING' CHECK (state IN ('PENDING','USED')),
 expires_at TIMESTAMPTZ NOT NULL,
 used_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS platform_password_resets_email_window
 ON platform_password_resets(email_hash,created_at DESC);
CREATE INDEX IF NOT EXISTS platform_password_resets_origin_window
 ON platform_password_resets(origin_hash,created_at DESC);
