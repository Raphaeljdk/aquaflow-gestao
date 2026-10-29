import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { configuracaoSchema } from "../src/lib/validations";

const model = {
  nome: "Lava Rápido do Cliente",
  cnpj: "",
  endereco: "Rua Central, 100",
  telefone: "55 11 99200-3650",
  pixChave: "",
  logo: "",
  manualVideoUrl: "",
  manualPdfUrl: "",
  abertura: "08:00",
  fechamento: "18:00",
  intervaloMin: 30,
  diasSemana: [1, 2, 3, 4, 5, 6],
  timezone: "America/Sao_Paulo",
};

test("estabelecimento pode editar dados próprios sem CNPJ ou PIX obrigatório", () => {
  const parsed = configuracaoSchema.parse(model);
  assert.equal(parsed.telefone, model.telefone);
  assert.equal(parsed.cnpj, "");
});

test("não permite gravar WhatsApp no campo CNPJ como no cadastro legado", () => {
  const result = configuracaoSchema.safeParse({ ...model, cnpj: "5511 99200-3650", telefone: "" });
  assert.equal(result.success, false);
  if (!result.success) assert.equal(result.error.issues.some(issue => issue.path[0] === "cnpj"), true);
});

test("permite CNPJ brasileiro válido e impede WhatsApp sem DDD", () => {
  assert.equal(configuracaoSchema.safeParse({ ...model, cnpj: "11.222.333/0001-81" }).success, true);
  const wrong = configuracaoSchema.safeParse({ ...model, telefone: "1234" });
  assert.equal(wrong.success, false);
  if (!wrong.success) assert.equal(wrong.error.issues.some(issue => issue.path[0] === "telefone"), true);
});

test("horários e outros campos inválidos são identificados antes de enviar", () => {
  const wrong = configuracaoSchema.safeParse({ ...model, abertura:"18:00", fechamento:"08:00" });
  assert.equal(wrong.success, false);
  if (!wrong.success) assert.equal(wrong.error.issues.some(issue => issue.path[0] === "fechamento"), true);
  assert.equal(configuracaoSchema.safeParse({...model,manualVideoUrl:"http://inseguro.example.com"}).success, false);
});

test("UI exibe erros, confirma salvamento e tem atalho no rodapé mobile", () => {
  const src = readFileSync("src/components/settings.tsx", "utf8");
  assert.match(src, /f\.handleSubmit\(submitSettings, invalidSettings\)/);
  assert.match(src, /f\.reset\(v\)/);
  assert.match(src, /setActiveTab\(tab\)/);
  assert.match(src, /Mover número para WhatsApp/);
  assert.match(src, /sticky bottom-2/);
  assert.match(src, /role="alert"/);
});

test("configuração faz upsert direto e não dispara snapshot de comandas", () => {
  const src = readFileSync("src/lib/repository.ts", "utf8");
  const section = src.slice(src.indexOf("export async function mutate"), src.indexOf("const password ="));
  assert.match(section, /configuracaoSchema\.parse\(m\.data\)/);
  assert.match(section, /prisma\.configuracao\.upsert\(/);
  assert.match(section, /canWrite\(actor\.role, "configuracoes"\)/);
  assert.doesNotMatch(section, /snapshot\(tx\)/);
});
