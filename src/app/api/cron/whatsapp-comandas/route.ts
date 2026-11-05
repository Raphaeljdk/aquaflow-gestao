import { NextRequest,NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { whatsappGatewayReady } from "@/lib/whatsapp-oficial";
import { processarProximaComandaWhatsapp } from "@/lib/whatsapp-envios";
import { listarEmpresasWhatsapp, comBancoEmpresaWhatsapp } from "@/lib/whatsapp-tenants";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=60;
function authorized(req:NextRequest){
  const secret=process.env.CRON_SECRET,token=req.headers.get("authorization")?.replace(/^Bearer /,"")??"";
  if(!secret||!token)return false;
  const a=Buffer.from(secret),b=Buffer.from(token);
  return a.length===b.length && timingSafeEqual(a,b);
}
export async function GET(req:NextRequest){
  if(!authorized(req))return NextResponse.json({error:"Não autorizado"},{status:401});
  if(!whatsappGatewayReady())return NextResponse.json({processed:false,disabled:true});
  const result:{legacy:string;tenantIdsChecked:number;submitted:number;warnings:number}={
    legacy:"EMPTY",tenantIdsChecked:0,submitted:0,warnings:0,
  };
  try{
    const one=await processarProximaComandaWhatsapp(prisma);
    result.legacy=one.status;
    if(one.status==="SUBMITTED")result.submitted++;
  }catch{result.warnings++;}
  try{
    const tenants=await listarEmpresasWhatsapp();
    // Rotação justa; o acionamento após finalizar oferece baixa latência
    // e o cron recupera pendências de eventuais interrupções.
    const maxBatch=12;
    const start=tenants.length?(Math.floor(Date.now()/60000)*maxBatch)%tenants.length:0;
    const chosen=Array.from({length:Math.min(maxBatch,tenants.length)},
      (_,i)=>tenants[(start+i)%tenants.length]);
    for(const tenant of chosen){
      try{
        const r=await comBancoEmpresaWhatsapp(tenant,db=>processarProximaComandaWhatsapp(db));
        result.tenantIdsChecked++;
        if(r.status==="SUBMITTED")result.submitted++;
      }catch{result.warnings++;}
    }
  }catch{result.warnings++;}
  return NextResponse.json({processed:true,...result},{headers:{"Cache-Control":"no-store"}});
}
