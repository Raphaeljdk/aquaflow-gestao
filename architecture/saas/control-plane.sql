-- Ducha Elitte / controle central: criar SOMENTE em projeto Neon exclusivo.
-- Instalado em QA: cool-hall-38102617 (2026-11-01).
-- Não utilizar o banco legado nem os bancos operacionais de lava-rápidos.
CREATE TABLE IF NOT EXISTS platform_tenants (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 slug TEXT NOT NULL UNIQUE CHECK(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 display_name TEXT NOT NULL,
 owner_email TEXT NOT NULL,
 owner_whatsapp TEXT,
 neon_project_id TEXT UNIQUE,
 encrypted_database_url TEXT,
 state TEXT NOT NULL DEFAULT 'PENDING'
   CHECK (state IN ('PENDING','PROVISIONING','READY','SUSPENDED','ERROR')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK(state <> 'READY' OR (neon_project_id IS NOT NULL AND encrypted_database_url IS NOT NULL))
);
CREATE TABLE IF NOT EXISTS platform_identities (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
 full_name TEXT NOT NULL, enabled BOOLEAN NOT NULL DEFAULT true,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS platform_memberships (
 tenant_id UUID NOT NULL REFERENCES platform_tenants(id) ON DELETE RESTRICT,
 identity_id UUID NOT NULL REFERENCES platform_identities(id) ON DELETE RESTRICT,
 role TEXT NOT NULL CHECK (role IN ('OWNER','MANAGER','EMPLOYEE')),
 enabled BOOLEAN NOT NULL DEFAULT true,
 PRIMARY KEY(tenant_id,identity_id)
);
CREATE TABLE IF NOT EXISTS platform_entitlements (
 tenant_id UUID PRIMARY KEY REFERENCES platform_tenants(id) ON DELETE RESTRICT,
 state TEXT NOT NULL DEFAULT 'PENDING'
   CHECK(state IN ('PENDING','TRIAL','ACTIVE','GRACE','SUSPENDED','EXPIRED')),
 trial_started_at TIMESTAMPTZ, trial_ends_at TIMESTAMPTZ,
 paid_through TIMESTAMPTZ, grace_ends_at TIMESTAMPTZ,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK (trial_started_at IS NULL OR trial_ends_at > trial_started_at)
);
CREATE TABLE IF NOT EXISTS platform_billing_charges (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id UUID NOT NULL REFERENCES platform_tenants(id) ON DELETE RESTRICT,
 provider TEXT NOT NULL, external_reference TEXT NOT NULL,
 expected_cents INTEGER NOT NULL CHECK(expected_cents > 0),
 plan_code TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'PENDING'
   CHECK(status IN ('PENDING','PAID','EXPIRED','CANCELED','REFUNDED')),
 paid_at TIMESTAMPTZ, provider_payment_id TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(provider,external_reference)
);
CREATE TABLE IF NOT EXISTS platform_billing_events (
 provider TEXT NOT NULL, external_event_id TEXT NOT NULL,
 event_hash TEXT NOT NULL,
 received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 processed_at TIMESTAMPTZ,
 PRIMARY KEY(provider,external_event_id)
);
CREATE TABLE IF NOT EXISTS platform_provisioning_jobs (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id UUID NOT NULL REFERENCES platform_tenants(id) ON DELETE RESTRICT,
 idempotency_key TEXT NOT NULL UNIQUE,
 state TEXT NOT NULL DEFAULT 'PENDING'
   CHECK(state IN ('PENDING','RUNNING','DONE','ERROR')),
 attempts INTEGER NOT NULL DEFAULT 0, next_attempt_at TIMESTAMPTZ,
 last_error TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS platform_provision_job_one_per_tenant_idx ON platform_provisioning_jobs(tenant_id);
CREATE TABLE IF NOT EXISTS platform_notification_outbox (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id UUID REFERENCES platform_tenants(id) ON DELETE RESTRICT,
 channel TEXT NOT NULL CHECK(channel IN ('EMAIL','WHATSAPP')),
 recipient TEXT NOT NULL, template_key TEXT NOT NULL,
 payload JSONB NOT NULL DEFAULT '{}'::jsonb,
 dedupe_key TEXT NOT NULL UNIQUE,
 state TEXT NOT NULL DEFAULT 'PENDING' CHECK(state IN ('PENDING','SENT','ERROR')),
 attempts INTEGER NOT NULL DEFAULT 0,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 delivered_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS platform_notification_claims (
 outbox_id UUID PRIMARY KEY REFERENCES platform_notification_outbox(id) ON DELETE RESTRICT,
 claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 provider_message_id TEXT
);
CREATE TABLE IF NOT EXISTS platform_audit_events (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 actor_identity_id UUID,
 tenant_id UUID REFERENCES platform_tenants(id) ON DELETE RESTRICT,
 action TEXT NOT NULL, metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS platform_memberships_identity_idx ON platform_memberships(identity_id);
CREATE INDEX IF NOT EXISTS platform_entitlements_state_idx ON platform_entitlements(state,trial_ends_at,paid_through);
CREATE INDEX IF NOT EXISTS platform_notification_outbox_state_idx ON platform_notification_outbox(state,created_at);
