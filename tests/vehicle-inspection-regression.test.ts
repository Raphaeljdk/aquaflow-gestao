import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("src/components/vehicle-inspection.tsx", "utf8");
const detail = readFileSync("src/components/forms/order-form.tsx", "utf8");

test("vistoria conserva oito pontos e as mesmas chaves persistidas", () => {
  for (const name of ["PARACHOQUES", "FAROIS", "PINTURA", "RETROVISORES", "VIDROS", "AMASSADOS", "RODAS_PNEUS", "INTERIOR"])
    assert.match(source, new RegExp('id: "' + name + '"'));
});

test("tocar no diagrama navega em vez de registrar avaria sem confirmação", () => {
  assert.match(source, /onClick=\{\(\) => escolher\(p\.id\)\}/);
  assert.match(source, /marcar\(p\.id, "ok"\)/);
  assert.match(source, /marcar\(p\.id, "defeito"\)/);
  assert.match(source, /marcar\(p\.id, "pendente"\)/);
});

test("vistoria não sobrescreve rascunho ao receber novo snapshot", () => {
  assert.match(source, /dirtyRef\.current/);
  assert.match(source, /setExternalChange\(true\)/);
  assert.match(source, /\[value\?\.atualizadoEm\]/);
  assert.match(detail, /<VehicleInspection\s+key=\{o\.id\}/);
});

test("salvamento somente após revisar todos os pontos e confirmar mutação", () => {
  assert.match(source, /disabled=\{busy \|\| !concluida \|\| !dirty\}/);
  assert.match(source, /await onSave\(\{ itens, observacoesGerais \}\)/);
  assert.match(source, /maxLength=\{300\}/);
  assert.match(source, /maxLength=\{1000\}/);
});

test("comanda usa gaveta ampla para vistoria no desktop e largura integral no celular", () => {
  assert.match(detail, /w-screen max-w-full/);
  assert.match(detail, /sm:max-w-\[880px\]/);
});
