-- Aplicar somente no CONTROL_DATABASE_URL, nunca nas bases operacionais.
-- Separação de gestor global; vínculo como proprietário de um tenant NÃO confere administração global.
CREATE TABLE IF NOT EXISTS platform_operators (
  identity_id UUID PRIMARY KEY REFERENCES platform_identities(id) ON DELETE RESTRICT,
  enabled BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Senhas continuam como bcrypt em platform_identities, não neste registro.
CREATE TABLE IF NOT EXISTS platform_login_attempts (
  key TEXT PRIMARY KEY, attempts INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS platform_login_attempts_expire_idx ON platform_login_attempts(expires_at);
-- O operador inicial deve ser criado exclusivamente por fluxo bootstrap
-- com senha forte em ambiente protegido; NÃO incluir senha nem hash em git.
