import { NextRequest,NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { withControlPlane } from "@/lib/saas/control-plane";
import { deliverNotification,notificationsConfigured } from "@/lib/saas/notification-providers";
import { deliverOwnerInvite,ownerInviteChannelReady } from "@/lib/saas/owner-invite-delivery";
import { ResendDeliveryError } from "@/lib/saas/resend-diagnostics";

export const runtime="nodejs";
export const dynamic="force-dynamic";
function authorized(req:NextRequest) {
 const secret=process.env.CRON_SECRET,token=req.headers.get("authorization")?.replace(/^Bearer /,"")??"";
 if(!secret||!token)return false;
 const a=Buffer.from(secret),b=Buffer.from(token);
 return a.length===b.length&&timingSafeEqual(a,b);
}
/** One durable claim per message. Unknown send outcomes require manual review, not duplicate messages. */
export async function GET(req:NextRequest) {
 if(!authorized(req))return NextResponse.json({error:"Não autorizado."},{status:401});
 if(!notificationsConfigured() && !ownerInviteChannelReady("EMAIL") && !ownerInviteChannelReady("WHATSAPP"))
  return NextResponse.json({error:"Provedor de notificações não configurado."},{status:503});
 try {
  const result=await withControlPlane(async db=>{
   const rows=await db.$queryRaw<Array<{id:string;channel:"EMAIL"|"WHATSAPP";recipient:string;template_key:string;payload:{state?:string;encryptedUrl?:string}}>>`
      SELECT id::text,channel,recipient,template_key,payload
      FROM platform_notification_outbox WHERE state='PENDING'
      ORDER BY created_at LIMIT 25
   `;
   let delivered=0,failed=0,skipped=0;
   for(const row of rows) {
     if(delivered+failed>=5)break;
     const isInvite=row.template_key==="owner_invite";
     if(row.channel==="WHATSAPP" || (isInvite ? !ownerInviteChannelReady(row.channel) : !notificationsConfigured())){
       skipped++;continue;
     }
     const claim=await db.$queryRaw<Array<{outbox_id:string}>>`
       INSERT INTO platform_notification_claims(outbox_id)
       VALUES(${row.id}::uuid) ON CONFLICT(outbox_id) DO NOTHING
       RETURNING outbox_id::text
     `;
     if(!claim.length)continue;
     try {
      const providerId=isInvite?await deliverOwnerInvite(row):await deliverNotification(row);
      await db.$transaction([
        db.$executeRaw`UPDATE platform_notification_claims SET provider_message_id=${providerId} WHERE outbox_id=${row.id}::uuid`,
        db.$executeRaw`UPDATE platform_notification_outbox SET state='SENT',delivered_at=now(),attempts=attempts+1 WHERE id=${row.id}::uuid`
      ]);
      delivered++;
      } catch (err) {
      const category=err instanceof ResendDeliveryError?err.category:"unknown_outcome";
      const httpStatus=err instanceof ResendDeliveryError?err.httpStatus:null;
      await db.$executeRaw`INSERT INTO platform_audit_events(tenant_id,action,metadata)
        SELECT o.tenant_id,'notification_send_failed',${JSON.stringify({category,httpStatus})}::jsonb
        FROM platform_notification_outbox o WHERE o.id=${row.id}::uuid`;
      await db.$executeRaw`UPDATE platform_notification_outbox SET state='ERROR',attempts=attempts+1 WHERE id=${row.id}::uuid`;
      failed++;
     }
   }
   return {queued:rows.length,delivered,failed,skipped};
  });
  return NextResponse.json(result,{headers:{"Cache-Control":"no-store"}});
 }catch{
  console.error("[saas-notify] Verificar configurações de provedores ou controle central.");
  return NextResponse.json({error:"Entrega indisponível."},{status:503});
 }
}
