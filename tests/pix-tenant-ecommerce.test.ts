import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { makeDemoData } from "../src/lib/demo-data";
import { configuracaoSchema } from "../src/lib/validations";
import { tenantMigrationsPart3 } from "../src/lib/saas/tenant-migration-data-part3";

test("Pix de lavagens começa desativado; chave legada não migra para conta operacional",()=>{
  const c=makeDemoData().configuracao;
  assert.equal(c.pixRecebimentoAtivo,false);
  assert.equal(c.pixRecebimentoChave,"");
  assert.equal(c.pixChave,"");
  const antigo={...c,pixChave:"PIX_DE_ASSINATURA_NAO_USAR",pixRecebimentoChave:"",pixRecebimentoAtivo:false};
  assert.equal(configuracaoSchema.parse(antigo).pixRecebimentoAtivo,false);
  assert.equal(configuracaoSchema.parse(antigo).pixRecebimentoChave,"");
  assert.equal(configuracaoSchema.safeParse({...antigo,pixRecebimentoAtivo:true}).success,false);
  assert.equal(configuracaoSchema.safeParse({...antigo,nome:"LAVA RAPIDO QA",pixRecebimentoChave:"+5511999999999",pixRecebimentoAtivo:true}).success,true);
  assert.equal(configuracaoSchema.safeParse({...antigo,pixRecebimentoChave:"+5511999999999",pixRecebimentoAtivo:true}).success,false);
});
test("comanda lê exclusivamente o Pix operacional ativado pelo cliente",()=>{
  const f=readFileSync("src/components/forms/order-form.tsx","utf8");
  const domain=readFileSync("src/lib/domain.ts","utf8");
  const cfg=readFileSync("src/components/settings.tsx","utf8");
  assert.match(f,/configuracao\.pixRecebimentoAtivo/);
  assert.match(f,/configuracao\.pixRecebimentoChave/);
  assert.doesNotMatch(f,/configuracao\.pixChave/);
  assert.match(domain,/d\.configuracao\.pixRecebimentoAtivo/);
  assert.match(cfg,/f\.register\("pixRecebimentoAtivo"\)/);
  assert.match(cfg,/Não use aqui a conta ou o Pix das assinaturas/);
});
test("bundle de novos tenants contém exatamente todas as novas migrations",()=>{
  const names=["202611050240_produtos_venda_comanda","202611050830_devolucoes_produto","202611050945_pix_recebimento_tenant"];
  assert.deepEqual(tenantMigrationsPart3.map(x=>x.name),names);
  for(const migration of tenantMigrationsPart3){
    const sql=readFileSync("prisma/migrations/"+migration.name+"/migration.sql","utf8");
    assert.equal(migration.sql,sql);
  }
  assert.match(tenantMigrationsPart3[2].sql,/ADD COLUMN "pixRecebimentoAtivo"/);
  assert.doesNotMatch(tenantMigrationsPart3[2].sql,/UPDATE "Configuracao" SET.*pixChave/);
});
test("devoluções são manuais, rastreáveis e idempotentes",()=>{
  const source=readFileSync("src/app/api/comandas/[id]/produtos/[itemId]/devolucoes/route.ts","utf8");
  assert.match(source,/reembolsoConfirmado: z.literal\(true\)/);
  assert.match(source,/pg_advisory_xact_lock/);
  assert.match(source,/findUnique\(\{ where: \{ requestId:/);
  assert.match(source,/devolvido: \{ increment:/);
  assert.match(source,/tipo: "DEVOLUCAO"/);
  assert.match(source,/Estorno bancário não é automático/);
});
