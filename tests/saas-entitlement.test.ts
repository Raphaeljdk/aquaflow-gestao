import { test } from "node:test";
import assert from "node:assert/strict";
import {
 startTrial,effectiveState,authorizeOperationalAccess,assertSettlementMatchesCharge,
 TRIAL_DURATION_MS,LicenseAccessError,type Entitlement,
} from "../src/lib/saas/entitlement";

const pending: Entitlement = {state:"PENDING",trialStartedAt:null,trialEndsAt:null,paidThrough:null,graceEndsAt:null};
const now = new Date("2026-11-01T15:00:00Z");

test("teste inicia exclusivamente após READY e termina em exatamente 168 horas",()=>{
  assert.throws(()=>startTrial(pending,"PROVISIONING",now),/não provisionado/);
  const l=startTrial(pending,"READY",now);
  assert.equal(l.trialEndsAt!.getTime()-l.trialStartedAt!.getTime(),TRIAL_DURATION_MS);
  assert.equal(effectiveState(l,new Date(l.trialEndsAt!.getTime()-1)),"TRIAL");
  assert.equal(effectiveState(l,l.trialEndsAt!),"EXPIRED");
  assert.throws(()=>startTrial(l,"READY",now),/já usado/);
});
test("isolamento e licença impedem ler banco de outra empresa",()=>{
  const trial=startTrial(pending,"READY",now);
  const tenant={id:"empresa-A",state:"READY" as const};
  assert.doesNotThrow(()=>authorizeOperationalAccess(tenant,{tenantId:"empresa-A",enabled:true},trial,now));
  for (const member of [null,{tenantId:"empresa-B",enabled:true},{tenantId:"empresa-A",enabled:false}]) {
    assert.throws(()=>authorizeOperationalAccess(tenant,member,trial,now),(e:unknown)=>e instanceof LicenseAccessError && e.status===403);
  }
  assert.throws(()=>authorizeOperationalAccess(tenant,{tenantId:"empresa-A",enabled:true},trial,trial.trialEndsAt!),
    (e:unknown)=>e instanceof LicenseAccessError && e.status===423);
  assert.throws(()=>authorizeOperationalAccess({...tenant,state:"PROVISIONING"},{tenantId:"empresa-A",enabled:true},trial,now),
    (e:unknown)=>e instanceof LicenseAccessError && e.status===503);
});
test("licença paga vence, tolerância acaba e suspensão manual não é burlada",()=>{
  const active: Entitlement={...pending,state:"ACTIVE",paidThrough:new Date("2026-11-02T00:00:00Z"),graceEndsAt:new Date("2026-11-04T00:00:00Z")};
  assert.equal(effectiveState(active,now),"ACTIVE");
  assert.equal(effectiveState(active,new Date("2026-11-03T00:00:00Z")),"GRACE");
  assert.equal(effectiveState(active,new Date("2026-11-04T00:00:00Z")),"EXPIRED");
  assert.equal(effectiveState({...active,state:"SUSPENDED"},now),"SUSPENDED");
});
test("pagamento exige valor exato, referencia, liquidacao real e id nao vazio",()=>{
 const charge={provider:"STRIPE",externalReference:"checkout-001",expectedCents:79000,status:"PENDING"};
 const valid={provider:"STRIPE" as const,externalReference:"checkout-001",paymentId:"pi_paid_real",receivedCents:79000,settledAt:now,verifiedWithProvider:true as const};
 assert.doesNotThrow(()=>assertSettlementMatchesCharge(charge,valid));
 assert.throws(()=>assertSettlementMatchesCharge(charge,{...valid,receivedCents:8000}),/não conciliado/);
 assert.throws(()=>assertSettlementMatchesCharge(charge,{...valid,externalReference:"tx-outra"}),/não conciliado/);
 assert.throws(()=>assertSettlementMatchesCharge(charge,{...valid,verifiedWithProvider:false as true}),/não conciliado/);
});
