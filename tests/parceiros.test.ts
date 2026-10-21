import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parceiroSchema, parceiroUpdateSchema, pedidoAgendamentoSchema, mensagemAgendamento, hojeEmSaoPaulo } from "../src/lib/parceiros";

const pedido = {
  parceiroId: "p123", nome: "Ana Lima", veiculo: "Onix preto",
  servico: "Lavagem completa", data: "2026-12-10", horario: "14:30", observacoes: "Tem bagageiro",
};
test("parceiro precisa de contato válido e normaliza WhatsApp brasileiro", () => {
  const x = parceiroSchema.parse({ nome: "Lava Rápido Teste", cidade: "Itapevi", whatsapp: "(11) 99999-9999" });
  assert.equal(x.whatsapp, "5511999999999");
  assert.equal(parceiroSchema.safeParse({ nome: "Parceiro", whatsapp: "1234" }).success, false);
  assert.equal(parceiroUpdateSchema.safeParse({ ativo: false }).success, true);
  assert.equal(parceiroUpdateSchema.safeParse({}).success, false);
});
test("pedido recusa horários ou datas inválidas", () => {
  assert.equal(pedidoAgendamentoSchema.safeParse(pedido).success, true);
  assert.equal(pedidoAgendamentoSchema.safeParse({ ...pedido, data: "2026-02-30" }).success, false);
  assert.equal(pedidoAgendamentoSchema.safeParse({ ...pedido, horario: "25:99" }).success, false);
  assert.equal(pedidoAgendamentoSchema.safeParse({ ...pedido, parceiroId: "" }).success, false);
});
test("mensagem identifica o parceiro e não reserva automaticamente", () => {
  const m = mensagemAgendamento({ nome: "Lava Central" }, pedido);
  assert.match(m, /Lava-rápido: Lava Central/);
  assert.match(m, /Ana Lima/);
  assert.match(m, /10\/12\/2026/);
  assert.match(m, /confirmar disponibilidade e valor/);
  assert.equal(hojeEmSaoPaulo(new Date("2026-10-22T02:00:00.000Z")), "2026-10-21");
});
test("somente parceiros ativados aparecem publicamente e cadastro é inativo por padrão", () => {
  const publicApi = readFileSync("src/app/api/public/parceiros/route.ts", "utf8");
  const createApi = readFileSync("src/app/api/plataforma/parceiros/route.ts", "utf8");
  const sendApi = readFileSync("src/app/api/public/parceiros/agendar/route.ts", "utf8");
  assert.match(publicApi, /where: \{ ativo: true \}/);
  assert.match(publicApi, /select: \{ id: true, nome: true, cidade: true \}/);
  assert.match(createApi, /ativo: false/);
  assert.match(sendApi, /where: \{ id: pedido.parceiroId, ativo: true \}/);
  assert.match(createApi, /requirePlatformAdmin/);
});
