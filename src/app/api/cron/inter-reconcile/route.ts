import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { withControlPlane } from "@/lib/saas/control-plane";
import { consultarPixLiquidado } from "@/lib/saas/inter-pix";
import { recordVerifiedSettlement } from "@/lib/saas/reconciliation";

export const runtime="nodejs";
export const dynamic="force-dynamic";
function allowed(request:NextRequest) {
 const secret=process.env.CRON_SECRET, token=request.headers.get("authorization")?.replace(/^Bearer /,"")??"";
 if(!secret||!token)return false;
 const a=Buffer.from(secret),b=Buffer.from(token);
 return a.length===b.length&&timingSafeEqual(a,b);
}
/** Poll verified Inter results; never trusts callbacks or marks card payments as Pix. */
export async function GET(request:NextRequest) {
 if(!allowed(request))return NextResponse.json({error:"Não autorizado."},{status:401});
 if(!process.env.INTER_CLIENT_ID || !process.env.INTER_CERT_PEM_BASE64)
   return NextResponse.json({error:"Inter ainda não configurado."},{status:503});
 try {
  const result=await withControlPlane(async db=>{
   const pending=await db.$queryRaw<Array<{id:string;external_reference:string;expected_cents:number}>>`
    SELECT id::text,external_reference,expected_cents
    FROM platform_billing_charges
    WHERE provider='INTER_PIX' AND status='PENDING' ORDER BY created_at LIMIT 4
   `;
   let paid=0,notPaid=0,failed=0;
   for(const invoice of pending) {
    try {
      const proof=await consultarPixLiquidado(invoice.external_reference,invoice.expected_cents);
      const settled=await recordVerifiedSettlement(db,invoice.id,proof);
      if(settled.status==="PAID")paid++;
    }catch(error){
      // Provider outage, rate limit and unpaid Pix remain PENDING; never falsely settle.
      if(error instanceof Error && /não liquidado|não corresponde/i.test(error.message))notPaid++;
      else failed++;
    }
   }
   return {checked:pending.length,paid,notPaid,failed};
  });
  return NextResponse.json(result,{headers:{"Cache-Control":"no-store"}});
 } catch {
  console.error("[inter-reconciliation] Consulta bancária indisponível.");
  return NextResponse.json({error:"Conciliação indisponível."},{status:503});
 }
}
