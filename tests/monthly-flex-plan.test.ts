import {test} from "node:test";
import assert from "node:assert/strict";
import {resolvePlatformOffer} from "../src/lib/platform-billing";
test("assinatura mensal sem fidelidade custa 8000 centavos",()=>{
 const p=resolvePlatformOffer("MENSAL","CARTAO_CREDITO_RECORRENTE");
 assert.equal(p.installmentCents,8000);
 assert.equal(p.installments,1);
});
