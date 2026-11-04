import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {checkOrigin,apiError} from "@/lib/api";
import {checkoutWithOwnerLink} from "@/lib/saas/self-service-checkout";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function POST(request:NextRequest){
 try{
  checkOrigin(request);
  if(Number(request.headers.get("content-length")??0)>1200)
   return NextResponse.json({error:"Requisição muito grande."},{status:413});
  const input=z.object({
    token:z.string().regex(/^[A-Za-z0-9_-]{43}$/),
    plan:z.enum(["MENSAL","ANUAL_MENSAL","ANUAL_AVISTA"]),
    method:z.enum(["CARD","PIX"])
  }).parse(await request.json());
  const result=await checkoutWithOwnerLink({...input,origin:new URL(request.url).origin});
  return NextResponse.json(result,{headers:{"Cache-Control":"private,no-store","Referrer-Policy":"no-referrer"}});
 }catch(error){return apiError(error);}
}
