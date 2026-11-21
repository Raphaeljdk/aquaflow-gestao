import {test} from "node:test";
import assert from "node:assert/strict";
import {assessConnectFee,connectFeeLedgerKey,calculateMerchantDeductedSplit} from "../src/lib/saas/connect-fee-policy";
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

test("desconta comissão do estabelecimento sem aumentar pagamento do cliente",()=>{
 const sale=calculateMerchantDeductedSplit(assessConnectFee({...paid,amountCents:5000,kind:"AVULSA"}));
 assert.deepEqual(sale,{customerPaysCents:5000,merchantBeforeProcessorFeesCents:4900,platformFeeCents:100,processorFeesIncluded:false});
 const membership=calculateMerchantDeductedSplit(assessConnectFee({...paid,amountCents:10000,kind:"ASSINATURA_LAVARAPIDO"}));
 assert.deepEqual(membership,{customerPaysCents:10000,merchantBeforeProcessorFeesCents:9800,platformFeeCents:200,processorFeesIncluded:false});
});
test("split de comissão inelegível falha fechado",()=>{
 assert.throws(()=>calculateMerchantDeductedSplit(assessConnectFee({...paid,processedViaConnect:false,kind:"AVULSA"})),/não elegível/);
});
