import { test } from "node:test";
import assert from "node:assert/strict";
import { agendamentoRapidoSchema } from "../src/lib/agendamento-rapido";
const valid={
  nomeCliente:"Marcos Silva",telefoneCliente:"(11) 99999-9999",
  dataHora:"2026-10-14T15:00:00.000Z",
  servicoIds:["lavagem"],observacoes:"",
};
test("agendamento usa apenas nome, WhatsApp, horário e serviços",()=>{
  const value=agendamentoRapidoSchema.parse(valid);
  assert.equal(value.nomeCliente,"Marcos Silva");
  assert.equal(value.telefoneCliente,"11999999999");
  assert.equal(value.servicoIds.length,1);
});
test("recusa reserva sem contato ou serviço",()=>{
  assert.equal(agendamentoRapidoSchema.safeParse({...valid,telefoneCliente:"abc"}).success,false);
  assert.equal(agendamentoRapidoSchema.safeParse({...valid,servicoIds:[]}).success,false);
});
