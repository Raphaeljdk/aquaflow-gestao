import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {checkOrigin,apiError} from "@/lib/api";
import {completePasswordReset} from "@/lib/saas/password-reset";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function POST(request:NextRequest){
 try{
  checkOrigin(request);
  if(Number(request.headers.get("content-length")??0)>2048)
    return NextResponse.json({error:"Requisição inválida."},{status:413});
  const body=z.object({token:z.string().length(43),password:z.string().min(12).max(128)}).parse(await request.json());
  return NextResponse.json(await completePasswordReset(body.token,body.password),
    {headers:{"Cache-Control":"no-store","Referrer-Policy":"no-referrer"}});
 }catch(error){return apiError(error)}
}
