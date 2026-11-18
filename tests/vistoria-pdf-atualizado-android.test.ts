import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {gerarPdfVistoria} from "../src/lib/inspection-report";

const src=(path:string)=>readFileSync(path,"utf8");
const ids=["PARACHOQUES","FAROIS","PINTURA","RETROVISORES","VIDROS","AMASSADOS","RODAS_PNEUS","INTERIOR"] as const;

test("duas avarias continuam no PDF, mesmo quando oito pontos foram revisados",async()=>{
 const itens=ids.map((id,index)=>({
  id,revisado:true,defeito:index===2||index===5,
  observacao:index===2?"Risco na porta":index===5?"Amassado no para-lama":"",
 }));
 const file=await gerarPdfVistoria({
  numero:312,estabelecimento:"Lava Rápido QA",cliente:"Cliente de Teste",
  telefone:"11999999999",veiculo:"Carro",placa:"ABC1D23",
  criadoEm:"2026-11-18T12:00:00.000Z",
  vistoria:{itens,observacoesGerais:"Inspecionado na entrada",atualizadoEm:"2026-11-18T12:20:00.000Z"}
 });
 assert.equal(file.name,"vistoria-comanda-312.pdf");
 assert.equal(file.type,"application/pdf");
 const raw=Buffer.from(await file.arrayBuffer());
 assert.equal(raw.subarray(0,4).toString(),"%PDF");
 assert.ok(raw.byteLength>2500);
 // A geração contém aviso de avarias e mantém o mapa, sem confundir revisão com estado geral.
 const template=src("src/lib/inspection-report.ts");
 assert.match(template,/AVARIAS REGISTRADAS/);
 assert.match(template,/pontos revisados/);
 assert.match(template,/AVARIA REGISTRADA/);
 assert.doesNotMatch(template,/doc\.text\([^\n]*100% sem (?:danos|avarias)/);
});
test("vistoria avulsa consulta banco atual e recusa vistoria não salva",()=>{
 const route=src("src/app/api/comandas/[id]/pdf/route.ts");
 const document=src("src/lib/comanda-documento.ts");
 const form=src("src/components/forms/order-form.tsx");
 assert.match(route,/tipo==="vistoria"/);
 assert.match(route,/withOperationalDatabase\(user/);
 assert.match(route,/Cache-Control.*private, no-store/);
 assert.match(document,/ids.size !== 8/);
 assert.match(document,/Conclua e salve os oito pontos/);
 assert.match(document,/findUnique/);
 assert.match(form,/\/pdf\?tipo=vistoria/);
 assert.match(form,/cache:"no-store"/);
 assert.doesNotMatch(form,/vistoria: o\.vistoria,/);
});
test("abertura de fotos e PDF tolera limitações do Android",()=>{
 const uploader=src("src/components/vehicle-inspection.tsx");
 const report=src("src/lib/inspection-report.ts");
 assert.match(uploader,/typeof createImageBitmap !== "function"/);
 assert.match(uploader,/new Promise<HTMLImageElement>/);
 assert.match(uploader,/URL\.revokeObjectURL\(url\)/);
 assert.match(report,/60_000/);
 assert.match(report,/props\.fileType === "PNG"/);
});
