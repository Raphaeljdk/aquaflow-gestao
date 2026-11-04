-- Non-destructive registry hardening. Central control database ONLY.
-- Historical duplicate phones are retained as evidence and never copied to other tenants.
ALTER TABLE platform_tenants ADD COLUMN IF NOT EXISTS owner_cnpj TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS platform_tenants_email_lower_unique
 ON platform_tenants (lower(owner_email));
CREATE UNIQUE INDEX IF NOT EXISTS platform_tenants_cnpj_unique
 ON platform_tenants (owner_cnpj) WHERE owner_cnpj IS NOT NULL;
CREATE INDEX IF NOT EXISTS platform_tenants_owner_phone_idx
 ON platform_tenants (owner_whatsapp) WHERE owner_whatsapp IS NOT NULL;
-- The phone uniqueness check is transactionally serialized in signup.ts because
-- historical production records already share the same phone. Never delete these records.
