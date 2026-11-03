import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {checkOrigin} from "@/lib/api";
import {requestRecovery,genericRecoveryMessage} from "@/lib/auth/account-recovery-request";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const input=z.object({
 email:z.string().trim().email().max(254).transform(v=>v.toLowerCase()),
 tenantSlug:z.string().trim().toLowerCase().regex(/^[a-z0-9-]{0,60}$/).optional().default("")
});
export async function POST(request:NextRequest){
 try{
  checkOrigin(request);
  if(Number(request.headers.get("content-length")??0)>1024)return NextResponse.json({error:"Requisição inválida."},{status:413});
  const parsed=input.safeParse(await request.json());
  if(!parsed.success)return NextResponse.json({error:"Confira o e-mail informado."},{status:400});
  const ip=(request.headers.get("x-vercel-forwarded-for")||request.headers.get("x-forwarded-for")||"unknown").split(",")[0].trim();
  await requestRecovery(parsed.data.email,parsed.data.tenantSlug,ip);
 }catch{
  // Identical public response for existing, pending and unknown accounts.
  console.error("[account-recovery] Solicitação não concluída; verificar provedor.");
 }
 return NextResponse.json({message:genericRecoveryMessage},{headers:{"Cache-Control":"no-store"}});
}
