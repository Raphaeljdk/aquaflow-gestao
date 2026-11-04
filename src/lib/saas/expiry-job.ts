import type { PrismaClient } from "@prisma/client";
type Changed={tenant_id:string;new_state:string;owner_email:string;owner_whatsapp:string|null};
/** Trial and billing expiry are central; operational databases are never mutated. */
export async function runLicenseExpiryScan(db:PrismaClient,now=new Date()) {
 if(!Number.isFinite(now.getTime()))throw new Error("Data inválida");
 return db.$transaction(async tx=>{
  // Lock trials that just reached their exact expiration instant so one cron
  // sends precisely one conversion invitation; no new trial is ever started.
  const expiringTrials=await tx.$queryRaw<Array<{tenant_id:string}>>`
    SELECT tenant_id::text FROM platform_entitlements
    WHERE state='TRIAL' AND trial_ends_at<=${now} FOR UPDATE`;
  const trialSet=new Set(expiringTrials.map(t=>t.tenant_id));
  const changes=await tx.$queryRaw<Changed[]>`
    WITH changed AS (
      UPDATE platform_entitlements AS e
      SET state=CASE WHEN e.state='ACTIVE' AND e.grace_ends_at > ${now} THEN 'GRACE'
                    ELSE 'EXPIRED' END,
          updated_at=${now}
      WHERE (e.state='TRIAL' AND e.trial_ends_at<=${now})
         OR (e.state='ACTIVE' AND e.paid_through<=${now})
         OR (e.state='GRACE' AND e.grace_ends_at<=${now})
      RETURNING e.tenant_id,e.state AS new_state
    )
    SELECT c.tenant_id::text,c.new_state,t.owner_email,t.owner_whatsapp
    FROM changed c JOIN platform_tenants t ON t.id=c.tenant_id
  `;
  for(const row of changes) {
   const trialExpired=trialSet.has(row.tenant_id)&&row.new_state==="EXPIRED";
   const key=trialExpired?`trial-to-paid:${row.tenant_id}`:
     `license:${row.tenant_id}:${row.new_state}:${now.toISOString().slice(0,10)}`;
   const payload=JSON.stringify({state:row.new_state,reason:trialExpired?"TRIAL_EXPIRED":"LICENSE_UPDATED"});
   await tx.$executeRaw`
      INSERT INTO platform_notification_outbox
        (tenant_id,channel,recipient,template_key,dedupe_key,payload)
      VALUES (${row.tenant_id}::uuid,'EMAIL',${row.owner_email},
        ${trialExpired?"trial_to_paid_offer":"license_status"},${key+":email"},${payload}::jsonb)
      ON CONFLICT(dedupe_key) DO NOTHING
   `;
   if(row.owner_whatsapp && !trialExpired) {
    await tx.$executeRaw`
       INSERT INTO platform_notification_outbox
         (tenant_id,channel,recipient,template_key,dedupe_key,payload)
       VALUES (${row.tenant_id}::uuid,'WHATSAPP',${row.owner_whatsapp},'license_status',${key + ":whatsapp"},${payload}::jsonb)
       ON CONFLICT(dedupe_key) DO NOTHING
    `;
   }
  }
  return {checkedAt:now.toISOString(),changed:changes.length};
 });
}
