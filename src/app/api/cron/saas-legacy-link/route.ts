import {NextRequest,NextResponse} from "next/server";
import {timingSafeEqual} from "node:crypto";
import {linkVerifiedLegacyCopy} from "@/lib/saas/legacy-copy-link";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=300;
export async function GET(req:NextRequest){
 const key=process.env.CRON_SECRET;
 const token=req.headers.get("authorization")?.replace(/^Bearer /,"")??"";
 if(!key||!token||Buffer.byteLength(key)!==Buffer.byteLength(token)||
    !timingSafeEqual(Buffer.from(key),Buffer.from(token)))
  return NextResponse.json({error:"Não autorizado."},{status:401});
 if(process.env.LEGACY_MIGRATION_LINK_ENABLED!=="true")
  return NextResponse.json({status:"DISABLED"},{status:503});
 try{
  const result=await linkVerifiedLegacyCopy();
  return NextResponse.json(result,{headers:{"Cache-Control":"no-store"}});
 }catch(e){
  console.error("[legacy-link] Vínculo não aplicado; requer revisão:",e instanceof Error?e.message:"erro");
  return NextResponse.json({error:"Cópia não vinculada. Conferir migração e integridade."},{status:503});
 }
}
