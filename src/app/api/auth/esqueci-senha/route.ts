import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {checkOrigin,apiError} from "@/lib/api";
import {requestPasswordReset} from "@/lib/saas/password-reset";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function POST(request:NextRequest){
 try{
  checkOrigin(request);
  if(Number(request.headers.get("content-length")??0)>1024)
    return NextResponse.json({error:"Requisição inválida."},{status:413});
  const body=z.object({email:z.string().email().max(254)}).parse(await request.json());
  const ip=request.headers.get("x-vercel-forwarded-for")
    ??request.headers.get("x-forwarded-for")?.split(",")[0]??"unknown";
  return NextResponse.json(await requestPasswordReset(body.email,ip),
    {headers:{"Cache-Control":"no-store"}});
 }catch(error){return apiError(error)}
}
