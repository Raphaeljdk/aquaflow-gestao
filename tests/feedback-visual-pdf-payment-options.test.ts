import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const pdf = readFileSync("src/lib/inspection-report.ts", "utf8");
const form = readFileSync("src/components/forms/order-form.tsx", "utf8");
const types = readFileSync("src/types/index.ts", "utf8");

test("PDF de vistoria contém mapa vetorial e os oito pontos, inclusive moto e caminhonete", () => {
  assert.match(pdf, /doc\.roundedRect/);
  assert.match(pdf, /doc\.circle/);
  assert.match(pdf, /tipo === "MOTO"/);
  assert.match(pdf, /tipo === "CAMINHONETE"/);
  assert.match(pdf, /CHECKLIST DO VEÍCULO/);
  assert.match(pdf, /OBSERVAÇÕES GERAIS/);
  for (const id of ["PARACHOQUES", "FAROIS", "PINTURA", "RETROVISORES", "VIDROS", "AMASSADOS", "RODAS_PNEUS", "INTERIOR"]) {
    assert.match(pdf, new RegExp(id));
  }
  assert.match(form, /tipo: v\?\.tipo \?\? "CARRO"/);
});

test("finalização operacional distingue Pix, débito, crédito e dinheiro", () => {
  for (const method of ["DEBITO", "CREDITO", "DINHEIRO", "PIX"]) {
    assert.match(form, new RegExp('value: "' + method + '"'));
  }
  assert.match(types, /CREDITO: "Crédito"/);
  assert.match(form, /Cartão de débito ou crédito é registrado manualmente/);
  assert.match(form, /Confirme o recebimento no banco/);
});
