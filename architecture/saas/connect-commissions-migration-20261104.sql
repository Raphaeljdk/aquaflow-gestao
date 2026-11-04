-- Controle central: lançamento contábil lógico de comissões operacionais Connect.
-- Migração aditiva. Aplicar só no banco central após backup e QA.
-- Nenhuma operação financeira ocorre pela existência desta tabela.
CREATE TABLE IF NOT EXISTS platform_connect_accounts (
  tenant_id uuid PRIMARY KEY REFERENCES platform_tenants(id) ON DELETE RESTRICT,
  stripe_account_id text NOT NULL UNIQUE CHECK (stripe_account_id ~ '^acct_[A-Za-z0-9]+$'),
  onboarding_status text NOT NULL DEFAULT 'PENDING'
    CHECK (onboarding_status IN ('PENDING','RESTRICTED','READY','DISCONNECTED')),
  terms_accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS platform_connect_fee_ledger (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES platform_tenants(id) ON DELETE RESTRICT,
  stripe_account_id text NOT NULL,
  stripe_payment_id text NOT NULL,
  stripe_application_fee_id text UNIQUE,
  fee_kind text NOT NULL CHECK (fee_kind IN ('AVULSA','ASSINATURA_LAVARAPIDO')),
  fee_cents integer NOT NULL CHECK (fee_cents IN (100,200)),
  currency text NOT NULL DEFAULT 'brl' CHECK (currency='brl'),
  status text NOT NULL CHECK (status IN ('PENDING','COLLECTED','PARTIALLY_REVERSED','REVERSED','DISPUTED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT connect_fee_exact_amount CHECK (
    (fee_kind='AVULSA' AND fee_cents=100) OR
    (fee_kind='ASSINATURA_LAVARAPIDO' AND fee_cents=200)
  ),
  CONSTRAINT connect_fee_unique_payment UNIQUE (tenant_id,stripe_account_id,stripe_payment_id)
);
CREATE INDEX IF NOT EXISTS platform_connect_fee_ledger_tenant_created
 ON platform_connect_fee_ledger(tenant_id,created_at DESC);
