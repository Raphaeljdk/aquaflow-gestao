import {NextRequest,NextResponse} from "next/server";
import {withControlPlane} from "@/lib/saas/control-plane";
export const runtime="nodejs";
export const dynamic="force-dynamic";
/** Provider-confirmed status ONLY from the reconciled central ledger, never from URL success. */
export async function GET(request:NextRequest){
 const sessionId=new URL(request.url).searchParams.get("session_id")??"";
 if(!/^cs_(test|live)_[a-zA-Z0-9]{10,200}$/.test(sessionId))
  return NextResponse.json({status:"INVALID"},{status:400,headers:{"Cache-Control":"no-store"}});
 try{
  const rows=await withControlPlane(db=>db.$queryRaw<Array<{status:string;paid:boolean}>>`
    SELECT b.status,
      (b.status='PAID' OR (b.stripe_subscription_id IS NOT NULL AND
       EXISTS(SELECT 1 FROM platform_billing_charges p WHERE p.provider='STRIPE'
         AND p.tenant_id=b.tenant_id AND p.stripe_subscription_id=b.stripe_subscription_id
         AND p.plan_code='MONTHLY' AND p.status='PAID'))) AS paid
    FROM platform_billing_charges b
    WHERE b.provider='STRIPE' AND b.stripe_checkout_session_id=${sessionId} LIMIT 1`);
  const status=rows[0]?.paid?"CONFIRMED":
     rows[0]?.status==="CANCELED"?"CANCELED":"PROCESSING";
  return NextResponse.json({status},{headers:{"Cache-Control":"private,no-store"}});
 }catch{
  return NextResponse.json({status:"UNAVAILABLE"},{status:503,headers:{"Cache-Control":"private,no-store"}});
 }
}
