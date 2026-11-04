import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {checkOrigin,apiError} from "@/lib/api";
import {requestOwnerPaymentLink} from "@/lib/saas/self-service-checkout";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function POST(request:NextRequest){
 try{
  checkOrigin(request);
  if(Number(request.headers.get("content-length")??0)>1024)
   return NextResponse.json({error:"Requisição muito grande."},{status:413});
  const input=z.object({email:z.string().trim().email().max(254)}).parse(await request.json());
  const ip=(request.headers.get("x-vercel-forwarded-for")
     ??request.headers.get("x-forwarded-for")?.split(",")[0]??"unknown").trim();
  const result=await requestOwnerPaymentLink({email:input.email,ip});
  return NextResponse.json(result,{headers:{"Cache-Control":"private,no-store"}});
 }catch(error){return apiError(error);}
}
