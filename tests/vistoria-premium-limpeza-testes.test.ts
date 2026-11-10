import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { criteriosSolicitacoesTesteDescartaveis } from "../src/lib/platform-test-cleanup";
import { vistoriaSchema } from "../src/lib/validations";

test("limpeza admite somente testes não aprovados e jamais registros financeiros", () => {
  assert.equal(criteriosSolicitacoesTesteDescartaveis.modalidadeCadastro, "TESTE_7_DIAS");
  assert.deepEqual(criteriosSolicitacoesTesteDescartaveis.status, { in: ["PENDENTE", "REJEITADO"] });
  assert.equal(criteriosSolicitacoesTesteDescartaveis.testeIniciadoEm, null);
  assert.equal(criteriosSolicitacoesTesteDescartaveis.testeExpiraEm, null);
  assert.equal(criteriosSolicitacoesTesteDescartaveis.revisadoEm, null);
});

test("API exige autenticação central, origem legítima, frase e total consistente", () => {
  const src = readFileSync("src/app/api/plataforma/solicitacoes/limpar-testes/route.ts","utf8");
  assert.match(src, /await requirePlatformAdmin\(\)/);
  assert.match(src, /checkOrigin\(request\)/);
  assert.match(src, /z\.literal\("LIMPAR TESTES"\)/);
  assert.match(src, /quantidadeAtual !== values\.quantidade/);
  assert.match(src, /resultado\.count !== values\.quantidade/);
  assert.match(src, /tx\.solicitacaoEmpresa\.deleteMany/);
  assert.doesNotMatch(src, /tenant\.delete|billing\.delete|user\.delete/i);
});

test("vistoria mantém 8 pontos e armazena no máximo 3 fotos JPEG compactadas", () => {
  const itens = ["PINTURA","AMASSADOS","VIDROS","FAROIS","RODAS_PNEUS","RETROVISORES","PARACHOQUES","INTERIOR"]
    .map(id => ({id,revisado:true,defeito:false,observacao:""}));
  const valid = vistoriaSchema.safeParse({itens,observacoesGerais:"",fotos:["data:image/jpeg;base64,AA=="]});
  assert.equal(valid.success,true);
  const tooMany = vistoriaSchema.safeParse({itens,observacoesGerais:"",fotos:Array(4).fill("data:image/jpeg;base64,AA==")});
  assert.equal(tooMany.success,false);
  const invalid = vistoriaSchema.safeParse({itens,observacoesGerais:"",fotos:["javascript:alert(1)"]});
  assert.equal(invalid.success,false);
  assert.match(readFileSync("src/lib/inspection-report.ts","utf8"),/REGISTRO FOTOGRÁFICO DA VISTORIA/);
});
