import { NextRequest,NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { withControlPlane } from "@/lib/saas/control-plane";
import { deliverNotification,notificationsConfigured } from "@/lib/saas/notification-providers";

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
 if(!notificationsConfigured())return NextResponse.json({error:"Notificações ainda não homologadas."},{status:503});
 try {
  const result=await withControlPlane(async db=>{
   const rows=await db.$queryRaw<Array<{id:string;channel:"EMAIL"|"WHATSAPP";recipient:string;template_key:string}>>`
      SELECT id::text,channel,recipient,template_key
      FROM platform_notification_outbox WHERE state='PENDING'
      ORDER BY created_at LIMIT 5
   `;
   let delivered=0,failed=0;
   for(const row of rows) {
     const claim=await db.$queryRaw<Array<{outbox_id:string}>>`
       INSERT INTO platform_notification_claims(outbox_id)
       VALUES(${row.id}::uuid) ON CONFLICT(outbox_id) DO NOTHING
       RETURNING outbox_id::text
     `;
     if(!claim.length)continue;
     try {
      const providerId=await deliverNotification(row);
      await db.$transaction([
        db.$executeRaw`UPDATE platform_notification_claims SET provider_message_id=${providerId} WHERE outbox_id=${row.id}::uuid`,
        db.$executeRaw`UPDATE platform_notification_outbox SET state='SENT',delivered_at=now(),attempts=attempts+1 WHERE id=${row.id}::uuid`
      ]);
      delivered++;
     } catch {
      await db.$executeRaw`UPDATE platform_notification_outbox SET state='ERROR',attempts=attempts+1 WHERE id=${row.id}::uuid`;
      failed++;
     }
   }
   return {queued:rows.length,delivered,failed};
  });
  return NextResponse.json(result,{headers:{"Cache-Control":"no-store"}});
 }catch{
  console.error("[saas-notify] Verificar configurações de provedores ou controle central.");
  return NextResponse.json({error:"Entrega indisponível."},{status:503});
 }
}
