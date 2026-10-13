import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeWhatsappPhone, whatsappLink } from "../src/lib/whatsapp";

test("normaliza telefone com DDD, 55 e pontuação", () => {
  assert.equal(normalizeWhatsappPhone("+55 11 99200-3650"), "5511992003650");
  assert.equal(normalizeWhatsappPhone("(11) 99200-3650"), "5511992003650");
  assert.equal(normalizeWhatsappPhone("11 99200-3650"), "5511992003650");
});
test("recusa números ausentes ou inválidos", () => {
  assert.equal(normalizeWhatsappPhone(""), null);
  assert.equal(normalizeWhatsappPhone("1199"), null);
  assert.equal(normalizeWhatsappPhone("abc"), null);
});
test("gera link de agendamento com mensagem codificada", () => {
  const link = whatsappLink("+55 11 99200-3650", "Olá! Quero agendar uma lavagem.");
  assert.ok(link?.startsWith("https://wa.me/5511992003650?text="));
  assert.ok(link?.includes("Ol%C3%A1"));
});
