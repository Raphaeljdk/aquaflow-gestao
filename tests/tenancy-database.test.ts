import { test } from "node:test";
import assert from "node:assert/strict";
import { authorizeTenantAccess } from "../src/lib/tenancy/boundary";
import { withTenantDatabase } from "../src/lib/tenancy/tenant-database";

const access = authorizeTenantAccess(
  "usuario-a",
  {
    id: "empresa-a", slug: "lava-rapido-a", provisioning: "PRONTO",
    license: "ATIVA", neonProjectId: "proj-a",
    databaseSecretRef: "cofre/empresa-a/pooled",
  },
  { userId: "usuario-a", tenantId: "empresa-a", role: "PROPRIETARIO", active: true },
);

test("cliente Prisma é criado apenas após consultar segredo autorizado", async () => {
  const calls: string[] = [];
  const result = await withTenantDatabase(access, {
    readConnectionSecret: async (ref) => {
      calls.push("read:" + ref);
      return "postgresql://user:pass@tenant-a.neon.tech/banco_a?sslmode=require";
    },
    createClient: (url) => {
      calls.push("connect:" + new URL(url).hostname);
      return { $disconnect: async () => { calls.push("disconnect"); } };
    },
    legacyConnectionUrl: "postgresql://legacy:pass@legacy.neon.tech/principal",
  }, async () => { calls.push("operation"); return 123; });
  assert.equal(result, 123);
  assert.deepEqual(calls, [
    "read:cofre/empresa-a/pooled",
    "connect:tenant-a.neon.tech",
    "operation",
    "disconnect",
  ]);
});

test("banco legado nunca é usado como tenant, mesmo se mudarem a database", async () => {
  let invoked = false;
  await assert.rejects(() => withTenantDatabase(access, {
    readConnectionSecret: async () => "postgresql://user:pass@legacy.neon.tech/outra_database",
    createClient: () => { invoked = true; return { $disconnect: async () => {} }; },
    legacyConnectionUrl: "postgresql://legacy:pass@legacy.neon.tech/production",
  }, async () => "ok"), /Conexão não isolada/);
  assert.equal(invoked, false);
});

test("segredo inválido nunca aparece na mensagem de erro", async () => {
  const secret = "postgresql://senha-super-secreta";
  await assert.rejects(() => withTenantDatabase(access, {
    readConnectionSecret: async () => secret,
    createClient: () => { throw new Error("Não deve abrir conexão"); },
  }, async () => "ok"), (e: unknown) =>
    e instanceof Error && !e.message.includes("senha-super-secreta") &&
    e.message.includes("Configuração privada"));
});

test("desconecta a conexão quando ocorre erro na operação", async () => {
  let disconnected = false;
  await assert.rejects(() => withTenantDatabase(access, {
    readConnectionSecret: async () => "postgresql://user:pass@tenant-a.neon.tech/loja_a",
    createClient: () => ({ $disconnect: async () => { disconnected = true; } }),
    legacyConnectionUrl: "postgresql://legacy:pass@legacy.neon.tech/production",
  }, async () => { throw new Error("Falha simulada"); }), /Falha simulada/);
  assert.equal(disconnected, true);
});

test("objeto forjado de JSON não permite conexão, mesmo com tenantId e secretRef válidos", async () => {
  const fake = JSON.parse(JSON.stringify(access));
  let consulted = false;
  await assert.rejects(() => withTenantDatabase(fake, {
    readConnectionSecret: async () => { consulted = true; return "postgresql://a:b@tenant.neon.tech/db"; },
    createClient: () => ({ $disconnect: async () => {} }),
  }, async () => true), /não provisionado/);
  assert.equal(consulted, false);
});
