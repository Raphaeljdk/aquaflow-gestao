import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { gerarPdfVistoria } from "../src/lib/inspection-report";
import { metadataEnvioComanda, whatsappGatewayReady, versionGraphApi } from "../src/lib/whatsapp-oficial";
import { tenantMigrationsPart4 } from "../src/lib/saas/tenant-migration-data-part4";

test("PDF completo contém página de itens e mantém mapa vetorial de avarias",async()=>{
  const pdf=await gerarPdfVistoria({
    numero:908,estabelecimento:"Lava Rápido de Teste",cliente:"Cliente Teste",
    telefone:"11999999999",veiculo:"Fiat Argo",placa:"ABC1D23",tipo:"CARRO",
    criadoEm:"2026-11-05T13:00:00Z",
    vistoria:{atualizadoEm:"2026-11-05T13:00:00Z",observacoesGerais:"",itens:[
      {id:"PINTURA",revisado:true,defeito:true,observacao:"Risco na porta do passageiro"}
    ]},
    resumoComanda:{
      status:"FINALIZADO",pagamento:"PIX",desconto:5,total:109,
      observacoes:"Lavar com cuidado",finalizadoEm:"2026-11-05T14:00:00Z",pagoEm:"2026-11-05T14:00:00Z",
      servicos:[{nome:"Lavagem completa",preco:100,quantidade:1}],
      produtos:[{nome:"Refrigerante 350 ml",preco:7,quantidade:2}],
    },
  });
  assert.equal(pdf.name,"comanda-completa-908.pdf");
  assert.equal(pdf.type,"application/pdf");
  const b=Buffer.from(await pdf.arrayBuffer());
  assert.equal(b.subarray(0,4).toString(),"%PDF");
  assert.ok(b.byteLength>3500);
});
test("vistoria antiga continua gerando PDF separado",async()=>{
  const pdf=await gerarPdfVistoria({
    numero:3,estabelecimento:"Lava Rápido de Teste",cliente:"Teste",telefone:"11999999999",
    veiculo:"Uno",placa:"DEF2G34",criadoEm:"2026-11-05T13:00:00Z",
    vistoria:{itens:[],atualizadoEm:"2026-11-05T13:00:00Z",observacoesGerais:""},
  });
  assert.equal(pdf.name,"vistoria-comanda-3.pdf");
});
test("gateway mantém o envio inativo sem credenciais e template",()=>{
  assert.equal(whatsappGatewayReady({WHATSAPP_COMANDA_ENABLED:"true"}),false);
  assert.equal(whatsappGatewayReady({WHATSAPP_COMANDA_ENABLED:"false",WHATSAPP_CLOUD_API_TOKEN:"token",
    WHATSAPP_PHONE_NUMBER_ID:"123456789012",WHATSAPP_COMANDA_TEMPLATE_NAME:"comanda_documento"}),false);
  assert.equal(whatsappGatewayReady({WHATSAPP_COMANDA_ENABLED:"true",WHATSAPP_CLOUD_API_TOKEN:"token",
    WHATSAPP_PHONE_NUMBER_ID:"123456789012",WHATSAPP_COMANDA_TEMPLATE_NAME:"comanda_documento"}),true);
  assert.equal(versionGraphApi({WHATSAPP_GRAPH_API_VERSION:"v24.0"}),"v24.0");
  assert.throws(()=>versionGraphApi({WHATSAPP_GRAPH_API_VERSION:"javascript:alert(1)"}));
});
test("sem consentimento explícito ou finalização não há envio",()=>{
  assert.equal(metadataEnvioComanda("11999999999",null,"FINALIZADO",true).allowed,false);
  assert.equal(metadataEnvioComanda("11999999999",new Date(),"AGUARDANDO",true).allowed,false);
  assert.equal(metadataEnvioComanda("11999999999",new Date(),"FINALIZADO",false).allowed,false);
  assert.equal(metadataEnvioComanda("11999999999",new Date(),"FINALIZADO",true).allowed,true);
  assert.equal(metadataEnvioComanda("11999999999",new Date(),"ENTREGUE",true).allowed,true);
  assert.equal(metadataEnvioComanda("999",new Date(),"ENTREGUE",true).allowed,false);
});
test("nova empresa recebe migração de outbox idêntica à migration Prisma",()=>{
  const item=tenantMigrationsPart4[0];
  assert.equal(item.name,"202611051500_whatsapp_comanda_outbox");
  assert.equal(item.sql,readFileSync("prisma/migrations/"+item.name+"/migration.sql","utf8"));
  assert.match(item.sql,/CREATE TABLE "WhatsAppEnvio"/);
  assert.match(item.sql,/CREATE TABLE "WhatsAppAutorizacaoEvento"/);
  assert.match(item.sql,/ADD COLUMN "whatsappEnvioAutomatico" BOOLEAN NOT NULL DEFAULT false/);
  assert.doesNotMatch(item.sql,/DELETE FROM|DROP TABLE|TRUNCATE/i);
});
test("Webhook exige assinatura Meta e impede regressão de status",()=>{
  const raw=readFileSync("src/app/api/whatsapp/webhook/route.ts","utf8");
  assert.match(raw,/createHmac\("sha256"/);
  assert.match(raw,/timingSafeEqual/);
  assert.match(raw,/status==="sent"\?\{in:\["SUBMITTED"\]\}/);
  assert.match(raw,/CLIENTE_RESPONDEU_PARAR/);
});
test("finalização não envia no meio da transação nem permite reenvio automático incerto",()=>{
  const repo=readFileSync("src/lib/repository.ts","utf8");
  const job=readFileSync("src/lib/whatsapp-envios.ts","utf8");
  assert.match(repo,/whatsAppEnvio\.upsert/);
  assert.match(job,/status:"PROCESSING"/);
  assert.match(job,/status:"UNKNOWN"/);
  assert.match(job,/SEND_OUTCOME_UNCERTAIN/);
  assert.match(job,/type:"template"/);
  assert.match(job,/type:"document"/);
});
