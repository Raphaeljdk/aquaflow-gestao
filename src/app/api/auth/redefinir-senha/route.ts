import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {checkOrigin,apiError} from "@/lib/api";
import {completeRecovery} from "@/lib/auth/account-recovery-complete";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const input=z.object({token:z.string().min(40).max(100),password:z.string().min(12).max(128)});
export async function POST(request:NextRequest){
 try{
  checkOrigin(request);
  if(Number(request.headers.get("content-length")??0)>1500)return NextResponse.json({error:"Requisição inválida."},{status:413});
  const parsed=input.parse(await request.json());
  const result=await completeRecovery(parsed.token,parsed.password);
  return NextResponse.json(result,{headers:{"Cache-Control":"no-store"}});
 }catch(error){return apiError(error);}
}
