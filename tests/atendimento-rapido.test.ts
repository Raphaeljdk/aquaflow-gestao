import { test } from "node:test";
import assert from "node:assert/strict";
import { atendimentoRapidoSchema } from "../src/lib/atendimento-rapido";

const form = {
  nomeCliente: "Maria Oliveira",
  telefoneCliente: "(11) 99999-9999",
  placa: "abc1d23",
  tipo: "CARRO",
  servicoIds: ["lavagem-simples"],
  funcionarioId: "",
  desconto: 0,
  observacoes: "",
};

test("comanda expressa valida identificação mínima, sem telefone ou ficha antecipada", () => {
  const value = atendimentoRapidoSchema.parse(form);
  assert.equal(value.placa, "ABC1D23");
  assert.equal(value.nomeCliente, "Maria Oliveira");
  assert.equal(value.tipo, "CARRO");
});
test("placa antiga é aceita, removendo pontuação", () => {
  assert.equal(atendimentoRapidoSchema.parse({ ...form, placa: "ABC-1234" }).placa, "ABC1234");
});
test("não aceita placa inválida, sem serviço ou valores absurdos", () => {
  assert.equal(atendimentoRapidoSchema.safeParse({ ...form, placa: "1234" }).success, false);
  assert.equal(atendimentoRapidoSchema.safeParse({ ...form, servicoIds: [] }).success, false);
  assert.equal(atendimentoRapidoSchema.safeParse({ ...form, desconto: -10 }).success, false);
});
test("rejeita tipo de veículo desconhecido", () => {
  assert.equal(atendimentoRapidoSchema.safeParse({ ...form, tipo: "ONIBUS" }).success, false);
});
