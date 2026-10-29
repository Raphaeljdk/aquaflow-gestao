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

test("cadastro de parceiro armazena os campos editáveis do cartão CNPJ", () => {
  const x = parceiroSchema.parse({
    nome: "Lavagem Central", cnpj: "11.222.333/0001-81",
    razaoSocial: "Lavagem Central LTDA", cidade: "Cotia, SP",
    uf: "sp", cep: "06700-000", bairro: "Centro",
    endereco: "Avenida Principal, 100", email: "CONTATO@EXEMPLO.COM",
    telefoneComercial: "1133334444", whatsapp: "(11) 99999-9999",
    atividadePrincipal: "4520-0/05", naturezaJuridica: "Sociedade Empresária Limitada",
    situacaoCadastral: "ATIVA", porte: "ME", dataAbertura: "2025-01-01",
    responsavel: "Joana da Silva",
  });
  assert.equal(x.cnpj, "11222333000181");
  assert.equal(x.uf, "SP");
  assert.equal(x.email, "contato@exemplo.com");
  assert.equal(x.responsavel, "Joana da Silva");
});
test("CNPJ é opcional para preenchimento manual, mas inválido é rejeitado", () => {
  assert.equal(parceiroSchema.safeParse({ nome: "Lavagem Manual", whatsapp: "(11) 99999-9999" }).success, true);
  assert.equal(parceiroSchema.safeParse({ nome: "Lavagem Teste", whatsapp: "(11) 99999-9999", cnpj: "123" }).success, false);
  assert.equal(parceiroSchema.safeParse({ nome: "Lavagem Teste", whatsapp: "(11) 99999-9999", cep: "12" }).success, false);
  assert.equal(parceiroSchema.safeParse({ nome: "Lavagem Teste", whatsapp: "(11) 99999-9999", email: "errado" }).success, false);
});
test("campos individuais podem ser alterados sem exigir sobrescrever os demais", () => {
  const parsed = parceiroUpdateSchema.safeParse({ razaoSocial: "Novo nome empresarial", email: "novo@teste.com" });
  assert.equal(parsed.success, true);
  assert.equal(parceiroUpdateSchema.safeParse({ ativo: false }).success, true);
});
test("cartão CNPJ fornece dados públicos, sem expor QSA e CPF em resposta", () => {
  const source = readFileSync("src/lib/cnpj-publico.ts", "utf8");
  assert.match(source, /ddd_telefone_1/);
  assert.match(source, /natureza_juridica/);
  assert.match(source, /data_inicio_atividade/);
  assert.doesNotMatch(source, /nome_socio|cnpj_cpf_do_socio/);
});
test("autopreenchimento preserva WhatsApp e responsável e exige revisão humana", () => {
  const ui = readFileSync("src/components/partners-manager.tsx", "utf8");
  assert.match(ui, /preencherParceiroComCnpj/);
  assert.match(ui, /whatsapp: form.whatsapp/);
  assert.match(ui, /responsavel: form.responsavel/);
  assert.match(ui, /lastAuto.current/);
  assert.match(ui, /setTimeout/);
  assert.match(ui, /onChangeRef.current/);
  assert.match(ui, /"POST"/);
  assert.match(ui, /ativo: !p.ativo/);
});
test("API do gestor não divulga dados comerciais na rota pública", () => {
  const admin = readFileSync("src/app/api/plataforma/parceiros/route.ts", "utf8");
  const publicRoute = readFileSync("src/app/api/public/parceiros/route.ts", "utf8");
  assert.match(admin, /razaoSocial: true/);
  assert.match(admin, /requirePlatformAdmin/);
  assert.doesNotMatch(publicRoute, /razaoSocial: true|telefoneComercial: true|email: true/);
});
