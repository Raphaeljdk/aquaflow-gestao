-- Apenas CONTROL_DATABASE_URL (controle central), nunca base de clientes.
CREATE TABLE IF NOT EXISTS platform_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES platform_tenants(id) ON DELETE RESTRICT,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('OWNER','MANAGER','EMPLOYEE')),
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS platform_invitations_tenant_idx
  ON platform_invitations(tenant_id,created_at DESC);
-- Tokens são gerados com CSPRNG, hash SHA-256 no banco e apenas uma utilização.
