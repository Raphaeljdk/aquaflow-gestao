import {NextRequest,NextResponse} from "next/server";
import {timingSafeEqual} from "node:crypto";
import {withControlPlane} from "@/lib/saas/control-plane";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const tenant="62e37443-8892-42ba-827f-2ab8a3d22aa7";
function authorized(req:NextRequest){
 const secret=process.env.CRON_SECRET,got=req.headers.get("authorization")?.replace(/^Bearer /,"")??"";
 if(!secret||!got)return false;
 const a=Buffer.from(secret),b=Buffer.from(got);
 return a.length===b.length&&timingSafeEqual(a,b);
}
/** Read-only Resend domain inspection. Never sends or retries an unknown email. */
export async function GET(req:NextRequest){
 if(!authorized(req))return NextResponse.json({error:"Não autorizado."},{status:401});
 if(process.env.VERCEL_ENV!=="production")
  return NextResponse.json({error:"Somente produção."},{status:403});
 try{
  const recorded=await withControlPlane(db=>db.$queryRaw<Array<{n:number}>>`
   SELECT count(*)::int AS n FROM platform_audit_events
   WHERE tenant_id=${tenant}::uuid AND action='resend_domain_preflight'`);
  if(recorded[0]?.n)return NextResponse.json({diagnosed:true,alreadyRecorded:true});
  const key=process.env.RESEND_API_KEY;
  const from=process.env.NOTIFICATION_FROM_EMAIL??"";
  const address=from.includes("<")?from.match(/<([^>]+)>/)?.[1]??"":from;
  const domain=address.split("@")[1]?.trim().toLowerCase()??"";
  let result:"missing_key"|"invalid_sender"|"domain_verified"|"domain_unverified"|"domain_not_found"|"domain_check_restricted"|"api_error"="missing_key";
  let httpStatus:number|null=null;
  if(key&&domain&&/^[a-z0-9.-]+$/.test(domain)){
   try{
    const response=await fetch("https://api.resend.com/domains",{
     headers:{"Authorization":"Bearer "+key,"Accept":"application/json"},
     cache:"no-store",signal:AbortSignal.timeout(12000)
    });
    httpStatus=response.status;
    if(response.ok){
     const payload=await response.json() as {data?:Array<{name?:string;status?:string}>};
     const record=payload.data?.find(d=>d.name?.toLowerCase()===domain);
     result=!record?"domain_not_found":record.status==="verified"?"domain_verified":"domain_unverified";
    }else if(response.status===403){result="domain_check_restricted";}
    else result="api_error";
   }catch{result="api_error";}
  }else if(key){result="invalid_sender";}
  // No addresses, tokens, provider body or invitation URLs are persisted.
  await withControlPlane(db=>db.$executeRaw`
   INSERT INTO platform_audit_events(tenant_id,action,metadata)
   SELECT ${tenant}::uuid,'resend_domain_preflight',
      ${JSON.stringify({result,httpStatus})}::jsonb
   WHERE NOT EXISTS(SELECT 1 FROM platform_audit_events WHERE tenant_id=${tenant}::uuid
      AND action='resend_domain_preflight')`);
  return NextResponse.json({diagnosed:true,result,httpStatus},{headers:{"Cache-Control":"no-store"}});
 }catch{
  return NextResponse.json({error:"Diagnóstico Resend não disponível."},{status:503});
 }
}
