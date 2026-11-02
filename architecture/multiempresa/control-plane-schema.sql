-- PROPOSTA / NÃO EXECUTAR NO BANCO EXISTENTE.
-- Este esquema pertence a um novo projeto Neon "Ducha Elitte Control Plane".
-- Não contém clientes, veículos, comandas, vistorias, fotos ou vendas operacionais.
-- A aplicação só poderá receber tráfego multiempresa após a migração do roteamento.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE plataforma_tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  nome_fantasia TEXT NOT NULL,
  razao_social TEXT NOT NULL DEFAULT '',
  cnpj TEXT UNIQUE,
  endereco TEXT NOT NULL DEFAULT '',
  responsavel_email TEXT NOT NULL,
  responsavel_whatsapp TEXT NOT NULL,
  provisioning TEXT NOT NULL DEFAULT 'PENDENTE'
    CHECK (provisioning IN ('PENDENTE','PROVISIONANDO','MIGRANDO','PRONTO','FALHA')),
  license TEXT NOT NULL DEFAULT 'PENDENTE'
    CHECK (license IN ('PENDENTE','ATIVA','SUSPENSA','CANCELADA')),
  neon_project_id TEXT UNIQUE,
  database_secret_ref TEXT UNIQUE,
  migration_version TEXT,
  provision_key TEXT NOT NULL UNIQUE,
  last_provision_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (provisioning <> 'PRONTO' OR
         (neon_project_id IS NOT NULL AND database_secret_ref IS NOT NULL))
);

-- Identidades/autenticação pertencem à plataforma e não aos bancos operacionais.
CREATE TABLE plataforma_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  nome TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ
);
CREATE TABLE plataforma_memberships (
  tenant_id UUID NOT NULL REFERENCES plataforma_tenants(id) ON DELETE RESTRICT,
  identity_id UUID NOT NULL REFERENCES plataforma_identities(id) ON DELETE RESTRICT,
  role TEXT NOT NULL CHECK (role IN ('PROPRIETARIO','GERENTE','CAIXA','FUNCIONARIO')),
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, identity_id)
);
CREATE INDEX plataforma_memberships_identity_idx ON plataforma_memberships(identity_id);

-- Uma assinatura gerenciada centralmente por estabelecimento;
-- cobrança operacional de lavagens é exclusiva do banco/conta do estabelecimento.
CREATE TABLE plataforma_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES plataforma_tenants(id) ON DELETE RESTRICT,
  plan_code TEXT NOT NULL,
  total_cents INTEGER NOT NULL CHECK (total_cents > 0),
  billing_status TEXT NOT NULL DEFAULT 'PENDENTE'
    CHECK (billing_status IN ('PENDENTE','ATIVA','ATRASADA','SUSPENSA','CANCELADA')),
  paid_until TIMESTAMPTZ,
  grace_until TIMESTAMPTZ,
  provider_customer_ref TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Confirmação de pagamento e provisionamento precisam resistir a callbacks duplicados.
CREATE TABLE plataforma_idempotency (
  provider TEXT NOT NULL,
  external_event_id TEXT NOT NULL,
  tenant_id UUID REFERENCES plataforma_tenants(id),
  operation TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, external_event_id)
);
CREATE TABLE plataforma_provision_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES plataforma_tenants(id) ON DELETE RESTRICT,
  idempotency_key TEXT NOT NULL UNIQUE,
  state TEXT NOT NULL DEFAULT 'PENDENTE'
    CHECK (state IN ('PENDENTE','EXECUTANDO','CONCLUIDO','FALHA')),
  attempts INTEGER NOT NULL DEFAULT 0,
  next_retry_at TIMESTAMPTZ,
  last_error TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE plataforma_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID,
  tenant_id UUID REFERENCES plataforma_tenants(id),
  action TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX plataforma_audit_tenant_date_idx ON plataforma_audit(tenant_id, created_at DESC);
