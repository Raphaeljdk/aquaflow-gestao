import {NextRequest,NextResponse} from "next/server";
import {timingSafeEqual} from "node:crypto";
import {processOneProvisioningJob} from "@/lib/saas/provisioning-worker";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=60;
export async function GET(request:NextRequest){
 const secret=process.env.CRON_SECRET;
 const bearer=request.headers.get("authorization")?.replace(/^Bearer /,"")??"";
 if(!secret||!bearer||Buffer.byteLength(secret)!==Buffer.byteLength(bearer)||
    !timingSafeEqual(Buffer.from(secret),Buffer.from(bearer)))
  return NextResponse.json({error:"Não autorizado."},{status:401});
 if(process.env.SAAS_QA_MODE!=="true" && process.env.SAAS_PRODUCTION_MODE!=="true")
  return NextResponse.json({processed:false,disabled:true},{status:503});
 try{return NextResponse.json(await processOneProvisioningJob(),{headers:{"Cache-Control":"no-store"}});}
 catch{
  return NextResponse.json({error:"Provisionamento indisponível; conferir controle central."},{status:503});
 }
}
