import { test } from "node:test";
import assert from "node:assert/strict";
import { makeDemoData } from "../src/lib/demo-data";
import { applyMutation } from "../src/lib/domain";
import { pixPayload } from "../src/lib/pix";
import type { User } from "../src/types";

const actor: User = { id: "a1", name: "Gestor", email: "gestor@example.com", role: "ADMIN" };
const now = new Date("2026-11-04T23:00:00Z");

function aguardando() {
  const data = makeDemoData(now);
  data.comandas = [];
  const order = applyMutation(data, {
    entity: "comandas", method: "POST",
    data: { clienteId: "c1", veiculoId: "v1", servicoIds: ["s2"], funcionarioId: "f1", desconto: 0 },
  }, actor, now);
  const id = order.comandas[0].id;
  return { id, order: applyMutation(order, { entity: "comandas", method: "PATCH", id, data: {status:"EM_LAVAGEM"} }, actor, now) };
}
test("Pix exige conferência humana antes de registrar como recebido", () => {
  const {id,order}=aguardando();
  assert.throws(() => applyMutation(order, { entity:"comandas",method:"PATCH",id,
    data:{status:"FINALIZADO",formaPagamento:"PIX"} },actor,now),/Confirme manualmente/);
  const done=applyMutation(order,{entity:"comandas",method:"PATCH",id,
    data:{status:"FINALIZADO",formaPagamento:"PIX",pixConfirmadoManualmente:true}},actor,now);
  assert.equal(done.comandas[0].status,"FINALIZADO");
  assert.equal(done.comandas[0].formaPagamento,"PIX");
});
test("Dinheiro, débito e crédito finalizam de forma manual sem chave Pix", () => {
  for(const formaPagamento of ["DINHEIRO","DEBITO","CREDITO"] as const){
    const {id,order}=aguardando();
    const done=applyMutation(order,{entity:"comandas",method:"PATCH",id,
      data:{status:"FINALIZADO",formaPagamento}},actor,now);
    assert.equal(done.comandas[0].formaPagamento,formaPagamento);
  }
});
test("Pix copia e cola possui valor e CRC e utiliza somente a chave informada", () => {
  const s=pixPayload({chave:"+5511988887777",valor:45,nome:"LAVA RAPIDO B",txid:"CMD1004"});
  assert.match(s,/BR.GOV.BCB.PIX/);
  assert.match(s,/45\.00/);
  assert.match(s,/\+5511988887777/);
  assert.match(s,/6304[0-9A-F]{4}$/);
  assert.equal(pixPayload({chave:"",valor:45,nome:"Teste",txid:"CMD1004"}),"");
});
