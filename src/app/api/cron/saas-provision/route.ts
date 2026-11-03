import {NextRequest,NextResponse} from "next/server";
import {timingSafeEqual} from "node:crypto";
import {processOneProvisioningJob} from "@/lib/saas/provisioning-worker";
import {withControlPlane} from "@/lib/saas/control-plane";
import {publicSignupMode} from "@/lib/saas/public-signup-mode";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=300;
export async function GET(request:NextRequest){
 const secret=process.env.CRON_SECRET;
 const bearer=request.headers.get("authorization")?.replace(/^Bearer /,"")??"";
 if(!secret||!bearer||Buffer.byteLength(secret)!==Buffer.byteLength(bearer)||
    !timingSafeEqual(Buffer.from(secret),Buffer.from(bearer)))
  return NextResponse.json({error:"Não autorizado."},{status:401});
 if(process.env.SAAS_QA_MODE!=="true" && process.env.SAAS_PRODUCTION_MODE!=="true" && !publicSignupMode(process.env))
  return NextResponse.json({processed:false,disabled:true},{status:503});
 try{
   if(publicSignupMode(process.env)){
     // Never automatically provision old APPROVED records or manual jobs.
     // Only confirmed-email signups are eligible for the new public worker.
     const rows=await withControlPlane(db=>db.$queryRaw<Array<{tenant_id:string}>>`
       SELECT j.tenant_id::text FROM platform_provisioning_jobs j
       JOIN platform_tenants t ON t.id=j.tenant_id
       WHERE j.state='PENDING' AND t.state='PROVISIONING'
         AND t.neon_project_id IS NULL
         AND EXISTS(SELECT 1 FROM platform_audit_events a
           WHERE a.tenant_id=t.id AND a.action='owner_email_verified_provisioning_queued')
       ORDER BY j.created_at LIMIT 1`);
     if(!rows[0])return NextResponse.json({processed:false});
     return NextResponse.json(await processOneProvisioningJob(rows[0].tenant_id),{headers:{"Cache-Control":"no-store"}});
   }
   return NextResponse.json(await processOneProvisioningJob(),{headers:{"Cache-Control":"no-store"}});
 }
 catch{
  return NextResponse.json({error:"Provisionamento indisponível; conferir controle central."},{status:503});
 }
}
