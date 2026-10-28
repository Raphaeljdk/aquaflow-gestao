import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { novoChamadoSchema, mensagemChamadoSchema, alterarChamadoSchema } from "../src/lib/chamados";

const read=(path:string)=>readFileSync(path,"utf8");
test("chamado exige assunto, categoria e descrição, sem conteúdo gigante",()=>{
  const input={titulo:"Comanda não finaliza",categoria:"ERRO",prioridade:"ALTA",descricao:"O botão fica carregando após clicar em finalizar a comanda."};
  assert.equal(novoChamadoSchema.safeParse(input).success,true);
  assert.equal(novoChamadoSchema.safeParse({...input,descricao:"curto"}).success,false);
  assert.equal(novoChamadoSchema.safeParse({...input,categoria:"ACESSO_NAO_DEFINIDO"}).success,false);
  assert.equal(novoChamadoSchema.safeParse({...input,descricao:"a".repeat(2501)}).success,false);
  assert.equal(mensagemChamadoSchema.safeParse({texto:"Enviei informações."}).success,true);
  assert.equal(mensagemChamadoSchema.safeParse({texto:" "}).success,false);
});
test("gestor pode responder ou atualizar status",()=>{
  assert.equal(alterarChamadoSchema.safeParse({status:"RESOLVIDO"}).success,true);
  assert.equal(alterarChamadoSchema.safeParse({resposta:"Verificamos seu problema."}).success,true);
  assert.equal(alterarChamadoSchema.safeParse({}).success,false);
  assert.equal(alterarChamadoSchema.safeParse({status:"STATUS_INVENTADO"}).success,false);
});
test("acesso aos tickets é autenticado e funcionário vê somente seus próprios",()=>{
  const client=read("src/app/api/chamados/route.ts");
  const reply=read("src/app/api/chamados/[id]/mensagens/route.ts");
  const admin=read("src/app/api/plataforma/chamados/route.ts");
  const update=read("src/app/api/plataforma/chamados/[id]/route.ts");
  assert.match(client,/currentUser/);
  assert.match(client,/criadoPorId: user\.id/);
  assert.match(client,/checkOrigin/);
  assert.match(client,/recent >= 10/);
  assert.match(reply,/criadoPorId: user\.id/);
  assert.match(reply,/chamado\.status === "FECHADO"/);
  assert.match(admin,/requirePlatformAdmin/);
  assert.match(update,/requirePlatformAdmin/);
  assert.match(update,/checkOrigin/);
  assert.match(update,/tx\.mensagemChamado\.create/);
});
test("menu e proxy permitem chamados a funcionário sem liberar gestão central",()=>{
  const layout=read("src/components/layout/app-shell.tsx");
  const proxy=read("src/proxy.ts");
  const platform=read("src/components/platform-dashboard.tsx");
  assert.match(layout,/path: "suporte", label: "Suporte \/ Chamados"/);
  assert.match(proxy,/"suporte"/);
  assert.match(proxy,/"/suporte\/:path\*"/);
  assert.match(platform,/tab==="chamados"/);
  assert.match(platform,/<PlatformTickets/);
  assert.doesNotMatch(read("src/app/api/chamados/route.ts"),/password: true/);
});
