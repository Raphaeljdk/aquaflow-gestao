import test from "node:test";
import assert from "node:assert/strict";
import {
  distributionChannels, listDistributionChannels, releaseReadiness,
} from "../src/lib/integrations/catalog";
import {
  UnavailablePosAdapter, validateVerifiedPosCharge,
  type VerifiedPosCharge,
} from "../src/lib/integrations/pos-contract";

test("catálogo mantém ids únicos e URLs oficiais HTTPS", () => {
  const ids = distributionChannels.map((channel) => channel.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const channel of distributionChannels) {
    if (channel.documentationUrl) {
      assert.equal(new URL(channel.documentationUrl).protocol, "https:");
    }
  }
});

test("catálogo é somente leitura e as credenciais não aparecem na resposta", () => {
  const channels = listDistributionChannels();
  assert.equal(channels.some((c) => c.id === "mercado_pago"), true);
  channels[0].name = "FALSIFICADO";
  assert.notEqual(listDistributionChannels()[0].name, "FALSIFICADO");
  assert.equal(JSON.stringify(channels).includes("databaseUrl"), false);
  assert.equal(JSON.stringify(channels).includes("secretKey"), false);
});

test("canais e cobrança nunca aparecem como publicados antes da homologação", () => {
  const readiness = releaseReadiness();
  assert.equal(readiness.smartposPaymentEnabled, false);
  assert.equal(readiness.googlePlayPublished, false);
  assert.equal(readiness.appStorePublished, false);
  assert.equal(readiness.physicalTerminalCertified, false);
});

const valid: VerifiedPosCharge = {
  provider: "mercado_pago",
  merchant: { tenantId: "tenant-1", actorId: "actor-1", merchantAccountRef: "merchant-1" },
  comandaId: "comanda-1234",
  amountCents: 8000,
  idempotencyKey: "tenant-1:comanda-1234:1",
};

test("validação de pagamento rejeita valores inválidos e ausência do recebedor", () => {
  assert.doesNotThrow(() => validateVerifiedPosCharge(valid));
  assert.throws(() => validateVerifiedPosCharge({ ...valid, amountCents: 0 }));
  assert.throws(() => validateVerifiedPosCharge({ ...valid, amountCents: 1.5 }));
  assert.throws(() => validateVerifiedPosCharge({ ...valid, merchant: { ...valid.merchant, merchantAccountRef: "" } }));
  assert.throws(() => validateVerifiedPosCharge({ ...valid, idempotencyKey: "short" }));
});

test("adaptador sem SDK falha fechado, sem confirmar pagamento", async () => {
  const adapter = new UnavailablePosAdapter("mercado_pago");
  await assert.rejects(adapter.charge(valid), /indisponível/);
  await assert.rejects(adapter.getTransaction(), /indisponível/);
});
