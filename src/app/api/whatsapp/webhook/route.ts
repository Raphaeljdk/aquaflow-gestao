import { NextRequest,NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { listarEmpresasWhatsapp, comBancoEmpresaWhatsapp } from "@/lib/whatsapp-tenants";
import type { PrismaClient } from "@prisma/client";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=60;
export async function GET(req:NextRequest){
  const mode=req.nextUrl.searchParams.get("hub.mode");
  const challenge=req.nextUrl.searchParams.get("hub.challenge");
  const verify=req.nextUrl.searchParams.get("hub.verify_token")??"";
  const expected=process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN??"";
  if(!expected || mode!=="subscribe" || !challenge || !verify)
    return NextResponse.json({error:"Verificação recusada"},{status:403});
  const a=Buffer.from(verify),b=Buffer.from(expected);
  if(a.length!==b.length || !timingSafeEqual(a,b))
    return NextResponse.json({error:"Verificação recusada"},{status:403});
  return new NextResponse(challenge,{headers:{"Content-Type":"text/plain"}});
}
type Delivery={id?:string;status?:string;timestamp?:string};
type Inbound={from?:string;text?:{body?:string}};
type Event={entry?:Array<{changes?:Array<{value?:{statuses?:Delivery[];messages?:Inbound[]}}>}>};
async function atualizarEntrega(db:PrismaClient,id:string,status:string){
  const update:Record<string,unknown>={};
  if(status==="sent")update.status="SUBMITTED";
  if(status==="delivered"){update.status="DELIVERED";update.entregueEm=new Date();}
  if(status==="read"){update.status="READ";update.lidoEm=new Date();update.entregueEm=new Date();}
  if(status==="failed"){update.status="FAILED";update.erroCodigo="META_DELIVERY_FAILED";}
  if(!Object.keys(update).length)return;
  await db.whatsAppEnvio.updateMany({
    where:{providerMessageId:id,
      status:status==="sent"?{in:["SUBMITTED"]}:
        status==="delivered"?{in:["SUBMITTED","DELIVERED"]}:
        status==="read"?{in:["SUBMITTED","DELIVERED","READ"]}:
        {in:["SUBMITTED","DELIVERED"]}},data:update,
  });
}
async function revogarPorTelefone(db:PrismaClient,from:string){
  const normalized=from.replace(/\D/g,"");
  if(!/^55\d{10,11}$/.test(normalized))return;
  await db.$transaction(async tx=>{
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(642019)`;
    const matches=await tx.cliente.findMany({select:{id:true,telefone:true}});
    const ids=matches.filter(c=>{
      const digits=c.telefone.replace(/\D/g,"");
      return digits===normalized || "55"+digits===normalized;
    }).map(c=>c.id);
    if(!ids.length)return;
    const orders=await tx.comanda.findMany({where:{clienteId:{in:ids},whatsappAutorizadoEm:{not:null}},select:{id:true}});
    for(const o of orders){
      await tx.comanda.update({where:{id:o.id},data:{whatsappAutorizadoEm:null}});
      await tx.whatsAppEnvio.updateMany({
        where:{comandaId:o.id,status:{in:["PENDING","FAILED"]}},
        data:{status:"CANCELED",erroCodigo:"CLIENT_OPTOUT"},
      });
      await tx.whatsAppAutorizacaoEvento.create({data:{
        comandaId:o.id,registradoPorId:"WEBHOOK_META",acao:"REVOGOU",origem:"CLIENTE_RESPONDEU_PARAR",
      }});
    }
  });
}
export async function POST(req:NextRequest){
  const secret=process.env.WHATSAPP_META_APP_SECRET;
  const signature=req.headers.get("x-hub-signature-256")??"";
  if(!secret||!signature.startsWith("sha256="))return NextResponse.json({error:"Não autorizado"},{status:403});
  const raw=await req.text();
  if(raw.length>120000)return NextResponse.json({error:"Tamanho excedido"},{status:413});
  const calc=createHmac("sha256",secret).update(raw).digest("hex");
  const provided=signature.slice(7);
  if(provided.length!==calc.length || !timingSafeEqual(Buffer.from(provided),Buffer.from(calc)))
    return NextResponse.json({error:"Assinatura inválida"},{status:403});
  let event:Event;
  try{event=JSON.parse(raw) as Event;}catch{return NextResponse.json({error:"JSON inválido"},{status:400});}
  const values=(event.entry??[]).flatMap(e=>(e.changes??[]).map(c=>c.value));
  const statuses=values.flatMap(v=>v?.statuses??[]).filter(s=>s.id && ["sent","delivered","read","failed"].includes(s.status??""));
  const stop=values.flatMap(v=>v?.messages??[]).filter(m=>m.from && /^(parar|sair|stop|cancelar)\b/i.test(m.text?.body?.trim()??""));
  if(!statuses.length&&!stop.length)return NextResponse.json({ok:true});
  const apply=async(db:PrismaClient)=>{
    for(const entry of statuses)await atualizarEntrega(db,entry.id!,entry.status!);
    for(const m of stop)await revogarPorTelefone(db,m.from!);
  };
  try{await apply(prisma);}catch{/* legado pode não estar acessível no modo de isolamento */}
  try{
    const tenants=await listarEmpresasWhatsapp();
    // Webhook firmado: percorrer somente empresas licenciadas, sem vazar dados no retorno.
    for(const tenant of tenants)await comBancoEmpresaWhatsapp(tenant,apply);
  }catch{return NextResponse.json({ok:false,retry:true},{status:503});}
  return NextResponse.json({ok:true});
}
