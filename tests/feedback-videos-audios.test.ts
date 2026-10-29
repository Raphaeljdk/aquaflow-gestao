import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const detail = readFileSync("src/components/forms/order-form.tsx", "utf8");
const pdf = readFileSync("src/lib/inspection-report.ts", "utf8");
const bookings = readFileSync("src/components/appointments.tsx", "utf8");

test("a vistoria entregue contém checklist e dados do veículo", () => {
  for (const key of ["PINTURA", "AMASSADOS", "VIDROS", "FAROIS", "RODAS_PNEUS", "RETROVISORES", "PARACHOQUES", "INTERIOR"]) {
    assert.match(pdf, new RegExp(key));
  }
  assert.match(pdf, /vistoria\.atualizadoEm/);
  assert.match(pdf, /return new File/);
  assert.match(pdf, /Cliente:/);
  assert.match(pdf, /Placa:/);
});
test("o compartilhamento não exporta rascunhos nem promete anexos automáticos via wa.me", () => {
  assert.match(detail, /o\.vistoria\.itens\.some\(i => !i\.revisado\)/);
  assert.match(detail, /navigator\.share\(\{ files: \[arquivo\]/);
  assert.match(detail, /baixarPdfVistoria\(arquivo\)/);
  assert.match(detail, /whatsappLink\(c\?\.telefone, texto\)/);
  assert.match(detail, /Anexe-o na conversa/);
});
test("o link de agendamento é compartilhado só após configurar o WhatsApp", () => {
  assert.match(bookings, /canShareBooking = Boolean\(normalizeWhatsappPhone/);
  assert.match(bookings, /window\.location\.origin \+ "\/agendar\/empresa"/);
  assert.match(bookings, /navigator\.share/);
  assert.match(bookings, /disabled=\{!canShareBooking\}/);
});
