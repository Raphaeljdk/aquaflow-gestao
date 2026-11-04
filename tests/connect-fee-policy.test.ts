import {test} from "node:test";
import assert from "node:assert/strict";
import {assessConnectFee,connectFeeLedgerKey} from "../src/lib/saas/connect-fee-policy";
const paid = {amountCents:10000,currency:"brl" as const,paymentStatus:"paid" as const,
  processedViaConnect:true,connectedAccountReady:true};
test("venda avulsa gera somente R$ 1",()=>{
 const fee=assessConnectFee({...paid,kind:"AVULSA"});
 assert.equal(fee.feeCents,100);assert.equal(fee.eligible,true);
});
test("cada fatura mensal paga de assinatura gera R$ 2",()=>{
 const fee=assessConnectFee({...paid,kind:"ASSINATURA_LAVARAPIDO"});
 assert.equal(fee.feeCents,200);assert.equal(fee.eligible,true);
});
test("não tributar checkout fora do Connect ou contas desconectadas",()=>{
 for(const data of [{processedViaConnect:false},{connectedAccountReady:false}])
  assert.equal(assessConnectFee({...paid,...data,kind:"AVULSA"}).feeCents,0);
});
test("não cobrar em pendências, falhas e estornos",()=>{
 for(const paymentStatus of ["pending","failed","refunded"] as const)
  assert.equal(assessConnectFee({...paid,paymentStatus,kind:"ASSINATURA_LAVARAPIDO"}).feeCents,0);
});
test("não gerar taxa se venda for menor que comissão",()=>{
 assert.equal(assessConnectFee({...paid,amountCents:199,kind:"ASSINATURA_LAVARAPIDO"}).feeCents,0);
 assert.equal(assessConnectFee({...paid,amountCents:200,kind:"ASSINATURA_LAVARAPIDO"}).feeCents,200);
});
test("chave de conciliação é estável e rejeita IDs malformados",()=>{
 const id="11111111-1111-4111-8111-111111111111";
 const key=connectFeeLedgerKey(id,"acct_123","in_456");
 assert.equal(key,connectFeeLedgerKey(id,"acct_123","in_456"));
 assert.throws(()=>connectFeeLedgerKey(id,"acct_bad","evil"),/inválida/);
});
