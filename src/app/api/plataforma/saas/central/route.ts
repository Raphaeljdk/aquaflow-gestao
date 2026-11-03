import {NextResponse} from "next/server";
import {requirePlatformAdmin} from "@/lib/platform-admin";
import {withControlPlane} from "@/lib/saas/control-plane";
import {apiError} from "@/lib/api";
export const runtime="nodejs";
export const dynamic="force-dynamic";

/**
 * Read-only central SaaS inventory. Intentionally works in legacy/hybrid mode:
 * toggling global SAAS_PRODUCTION_MODE must not be required to view signups.
 * Only platform admins can see owner contact information.
 */
export async function GET(){
 try{
  await requirePlatformAdmin();
  const result=await withControlPlane(async db=>{
   const tenants=await db.$queryRaw<Array<{
    id:string;name:string;email:string;slug:string;state:string;createdAt:Date;
    dbReady:boolean;license:string|null;trialEndsAt:Date|null;
    ownerActive:boolean;members:number;jobState:string|null;jobAttempts:number|null;
    inviteStatus:string|null;inviteAt:Date|null;signupType:string|null;
    legacyLinked:boolean;
   }>>`
     SELECT t.id::text AS id,t.display_name AS name,t.owner_email AS email,
       t.slug,t.state,t.created_at AS "createdAt",
       (t.neon_project_id IS NOT NULL AND t.encrypted_database_url IS NOT NULL) AS "dbReady",
       e.state AS license,e.trial_ends_at AS "trialEndsAt",
       EXISTS(SELECT 1 FROM platform_memberships m JOIN platform_identities i ON i.id=m.identity_id
         WHERE m.tenant_id=t.id AND m.role='OWNER' AND m.enabled AND i.enabled) AS "ownerActive",
       (SELECT count(*)::integer FROM platform_memberships m JOIN platform_identities i
         ON i.id=m.identity_id WHERE m.tenant_id=t.id AND m.enabled AND i.enabled) AS members,
       (SELECT j.state FROM platform_provisioning_jobs j WHERE j.tenant_id=t.id
         ORDER BY j.created_at DESC LIMIT 1) AS "jobState",
       (SELECT j.attempts FROM platform_provisioning_jobs j WHERE j.tenant_id=t.id
         ORDER BY j.created_at DESC LIMIT 1) AS "jobAttempts",
       (SELECT o.state FROM platform_notification_outbox o
         WHERE o.tenant_id=t.id AND o.template_key='owner_invite'
         ORDER BY o.created_at DESC,o.id DESC LIMIT 1) AS "inviteStatus",
       (SELECT o.created_at FROM platform_notification_outbox o
         WHERE o.tenant_id=t.id AND o.template_key='owner_invite'
         ORDER BY o.created_at DESC,o.id DESC LIMIT 1) AS "inviteAt",
       (SELECT a.metadata->>'kind' FROM platform_audit_events a
         WHERE a.tenant_id=t.id AND a.action='saas_signup_requested'
         ORDER BY a.created_at DESC LIMIT 1) AS "signupType",
       EXISTS(SELECT 1 FROM platform_audit_events a WHERE a.tenant_id=t.id
         AND a.action IN ('legacy_tenant_linked','qa_provisioning_approved')) AS "legacyLinked"
     FROM platform_tenants t LEFT JOIN platform_entitlements e ON e.tenant_id=t.id
     ORDER BY t.created_at DESC LIMIT 150`;
   const accounts=await db.$queryRaw<Array<{
    id:string;name:string;email:string;role:string;enabled:boolean;tenantId:string|null;
    tenantName:string|null;tenantState:string|null;license:string|null;source:string;
   }>>`
    SELECT i.id::text AS id,i.full_name AS name,i.email,
      m.role, (i.enabled AND m.enabled) AS enabled,m.tenant_id::text AS "tenantId",
      t.display_name AS "tenantName",t.state AS "tenantState",e.state AS license,
      'TENANT'::text AS source
    FROM platform_memberships m
    JOIN platform_identities i ON i.id=m.identity_id
    JOIN platform_tenants t ON t.id=m.tenant_id
    LEFT JOIN platform_entitlements e ON e.tenant_id=t.id
    UNION ALL
    SELECT i.id::text AS id,i.full_name AS name,i.email,
      'PLATFORM'::text AS role,(i.enabled AND p.enabled) AS enabled,
      NULL::text AS "tenantId",NULL::text AS "tenantName",NULL::text AS "tenantState",
      NULL::text AS license,'PLATFORM'::text AS source
    FROM platform_operators p JOIN platform_identities i ON i.id=p.identity_id
    ORDER BY source, name LIMIT 250`;
   const events=await db.$queryRaw<Array<{tenantId:string;action:string;createdAt:Date}>>`
    SELECT a.tenant_id::text AS "tenantId",a.action,a.created_at AS "createdAt"
    FROM platform_audit_events a JOIN platform_tenants t ON t.id=a.tenant_id
    WHERE a.action IN (
      'saas_signup_requested','qa_provisioning_approved',
      'owner_invitation_queued','owner_invite_recovery_requested',
      'owner_email_verified_provisioning_queued','owner_invite_activated',
      'self_service_trial_started_after_db_ready','trial_activated_qa',
      'notification_send_failed','tenant_provisioning_failed')
    ORDER BY a.created_at DESC LIMIT 160`;
   return {tenants,accounts,events};
  });
  return NextResponse.json(result,{headers:{"Cache-Control":"private,no-store"}});
 }catch(error){return apiError(error);}
}
