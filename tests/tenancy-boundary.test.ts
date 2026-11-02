import { test } from "node:test";
import assert from "node:assert/strict";
import {
  authorizeTenantAccess,
  normalizeTenantSlug,
  resolveTenantAccess,
  TenantBoundaryError,
  type PlatformTenant,
  type VerifiedMember,
} from "../src/lib/tenancy/boundary";

const empresaA: PlatformTenant = {
  id: "empresa-A", slug: "lava-rapido-a",
  provisioning: "PRONTO", license: "ATIVA",
  neonProjectId: "neon-projeto-a", databaseSecretRef: "secrets/empresas/a/pooled",
};
const empresaB: PlatformTenant = {
  id: "empresa-B", slug: "lava-rapido-b",
  provisioning: "PRONTO", license: "ATIVA",
  neonProjectId: "neon-projeto-b", databaseSecretRef: "secrets/empresas/b/pooled",
};
const donoA: VerifiedMember = { userId: "usuario-A", tenantId: empresaA.id, role: "PROPRIETARIO", active: true };
const donoB: VerifiedMember = { userId: "usuario-B", tenantId: empresaB.id, role: "PROPRIETARIO", active: true };

function errorStatus(action: () => unknown, code: number) {
  assert.throws(action, (e: unknown) => e instanceof TenantBoundaryError && e.status === code);
}
test("somente usuário com vínculo ativo abre o banco EXCLUSIVO de sua empresa", () => {
  const a = authorizeTenantAccess("usuario-A", empresaA, donoA);
  const b = authorizeTenantAccess("usuario-B", empresaB, donoB);
  assert.equal(a.neonProjectId, "neon-projeto-a");
  assert.equal(b.neonProjectId, "neon-projeto-b");
  assert.notEqual(a.databaseSecretRef, b.databaseSecretRef);
  assert.equal(Object.isFrozen(a), true);
  errorStatus(() => authorizeTenantAccess("usuario-A", empresaB, donoA), 403);
  errorStatus(() => authorizeTenantAccess("usuario-A", empresaB, donoB), 403);
  errorStatus(() => authorizeTenantAccess("usuario-A", empresaB, null), 403);
});
test("membro desativado, perfis insuficientes e sessão ausente falham fechados", () => {
  errorStatus(() => authorizeTenantAccess(null, empresaA, donoA), 401);
  errorStatus(() => authorizeTenantAccess("usuario-A", null, donoA), 404);
  errorStatus(() => authorizeTenantAccess("usuario-A", empresaA, {...donoA, active:false}), 403);
  errorStatus(() => authorizeTenantAccess("usuario-A", empresaA, {...donoA, role:"FUNCIONARIO"}, ["PROPRIETARIO"]), 403);
});
test("licença não paga ou banco não provisionado NUNCA cai no banco global", () => {
  for (const license of ["PENDENTE", "SUSPENSA", "CANCELADA"] as const) {
    errorStatus(() => authorizeTenantAccess("usuario-A", {...empresaA,license}, donoA), 423);
  }
  errorStatus(() => authorizeTenantAccess("usuario-A", {...empresaA,provisioning:"MIGRANDO"}, donoA), 503);
  errorStatus(() => authorizeTenantAccess("usuario-A", {...empresaA,databaseSecretRef:null}, donoA), 503);
  errorStatus(() => authorizeTenantAccess("usuario-A", {...empresaA,neonProjectId:null}, donoA), 503);
});
test("slug público não aceita path traversal, domínio arbitrário ou query", () => {
  assert.equal(normalizeTenantSlug(" Lava-Rapido-A "), "lava-rapido-a");
  for (const slug of ["../../empresa-b", "a", "lava/b", "empresa?tenant=b", "empresa.b", "empresa_b", ""]) {
    errorStatus(() => normalizeTenantSlug(slug), 400);
  }
});
test("resolução consulta somente o controle central e exige vínculo do usuário", async () => {
  const accesses: string[] = [];
  const control = {
    async findBySlug(slug: string) {
      accesses.push("tenant:" + slug);
      return slug === empresaA.slug ? empresaA : slug === empresaB.slug ? empresaB : null;
    },
    async findMembership(tenantId: string, userId: string) {
      accesses.push("member:" + tenantId + ":" + userId);
      return tenantId === empresaA.id && userId === donoA.userId ? donoA : null;
    },
  };
  assert.equal((await resolveTenantAccess("usuario-A", empresaA.slug, control)).tenantId, empresaA.id);
  await assert.rejects(() => resolveTenantAccess("usuario-A", empresaB.slug, control), (e: unknown) =>
    e instanceof TenantBoundaryError && e.status === 403);
  assert.deepEqual(accesses, [
    "tenant:lava-rapido-a", "member:empresa-A:usuario-A",
    "tenant:lava-rapido-b", "member:empresa-B:usuario-A",
  ]);
  await assert.rejects(() => resolveTenantAccess(null, empresaA.slug, control), (e: unknown) =>
    e instanceof TenantBoundaryError && e.status === 401);
});
