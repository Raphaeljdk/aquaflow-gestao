import {NextRequest,NextResponse} from "next/server";
import {requirePlatformAdmin} from "@/lib/platform-admin";
import {withControlPlane} from "@/lib/saas/control-plane";
import {apiError} from "@/lib/api";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const PAGE_SIZE=25;
/**
 * Paginated READ ONLY inventory. Works even when SAAS_PRODUCTION_MODE=false,
 * protecting the legacy login while keeping new central registrations visible.
 * Every request requires verified platform administrator credentials.
 */
export async function GET(request:NextRequest){
 try{
  await requirePlatformAdmin();
  const q=new URL(request.url).searchParams;
  const mode=q.get("mode")==="accounts"?"accounts":"companies";
  const search=(q.get("search")??"").trim().toLowerCase().slice(0,80);
  const filter=["all","attention","provisioning","ready","active"].includes(q.get("filter")??"")
    ? q.get("filter")!:"all";
  const page=Math.min(10000,Math.max(1,Number.parseInt(q.get("page")??"1",10)||1));
  const offset=(page-1)*PAGE_SIZE;
  const result=await withControlPlane(async db=>{
   const stats=await db.$queryRaw<Array<{total:number;ready:number;live:number;action:number}>>`
    SELECT count(*)::int AS total,
      count(*) FILTER(WHERE t.neon_project_id IS NOT NULL AND t.encrypted_database_url IS NOT NULL)::int AS ready,
      count(*) FILTER(WHERE t.state='READY'
        AND t.neon_project_id IS NOT NULL AND t.encrypted_database_url IS NOT NULL
        AND e.state IN ('TRIAL','ACTIVE','GRACE')
        AND EXISTS(SELECT 1 FROM platform_memberships m
          JOIN platform_identities i ON i.id=m.identity_id
          WHERE m.tenant_id=t.id AND m.role='OWNER' AND m.enabled AND i.enabled))::int AS live,
      count(*) FILTER(WHERE t.state='ERROR'
        OR EXISTS(SELECT 1 FROM platform_provisioning_jobs j WHERE j.tenant_id=t.id AND j.state='ERROR')
        OR (NOT EXISTS(SELECT 1 FROM platform_memberships m
              JOIN platform_identities i ON i.id=m.identity_id
              WHERE m.tenant_id=t.id AND m.role='OWNER' AND m.enabled AND i.enabled)
            AND (SELECT o.state FROM platform_notification_outbox o
              WHERE o.tenant_id=t.id AND o.template_key='owner_invite'
              ORDER BY o.created_at DESC,o.id DESC LIMIT 1)='ERROR'))::int AS action
    FROM platform_tenants t LEFT JOIN platform_entitlements e ON e.tenant_id=t.id`;
   if(mode==="companies"){
    const where=`
      WHERE ($1::text='' OR lower(t.display_name) LIKE '%'||$1||'%'
        OR lower(t.owner_email) LIKE '%'||$1||'%'
        OR lower(t.slug) LIKE '%'||$1||'%')
      AND ($2::text='all'
        OR ($2='attention' AND (t.state='ERROR'
          OR EXISTS(SELECT 1 FROM platform_provisioning_jobs j WHERE j.tenant_id=t.id AND j.state='ERROR')
          OR (NOT EXISTS(SELECT 1 FROM platform_memberships m JOIN platform_identities i ON i.id=m.identity_id
            WHERE m.tenant_id=t.id AND m.role='OWNER' AND m.enabled AND i.enabled)
            AND (SELECT o.state FROM platform_notification_outbox o WHERE o.tenant_id=t.id
              AND o.template_key='owner_invite' ORDER BY o.created_at DESC,o.id DESC LIMIT 1)='ERROR')))
        OR ($2='provisioning' AND t.state IN ('PENDING','PROVISIONING'))
        OR ($2='ready' AND t.neon_project_id IS NOT NULL AND t.encrypted_database_url IS NOT NULL)
        OR ($2='active' AND t.state='READY' AND e.state IN ('TRIAL','ACTIVE','GRACE')
          AND t.neon_project_id IS NOT NULL AND t.encrypted_database_url IS NOT NULL
          AND EXISTS(SELECT 1 FROM platform_memberships m JOIN platform_identities i ON i.id=m.identity_id
            WHERE m.tenant_id=t.id AND m.role='OWNER' AND m.enabled AND i.enabled))))`;
    const found=await db.$queryRawUnsafe<Array<{quantity:number}>>(
     `SELECT count(*)::integer AS quantity FROM platform_tenants t
       LEFT JOIN platform_entitlements e ON e.tenant_id=t.id ${where}`,search,filter);
    const tenants=await db.$queryRawUnsafe<Array<{
      id:string;name:string;email:string;slug:string;state:string;createdAt:Date;
      dbReady:boolean;license:string|null;trialEndsAt:Date|null;
      ownerActive:boolean;members:number;jobState:string|null;jobAttempts:number|null;
      inviteStatus:string|null;inviteAt:Date|null;signupType:string|null;
    }>>(`
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
         ORDER BY a.created_at DESC LIMIT 1) AS "signupType"
     FROM platform_tenants t LEFT JOIN platform_entitlements e ON e.tenant_id=t.id
     ${where} ORDER BY t.created_at DESC,t.id DESC
     LIMIT $3::integer OFFSET $4::integer`,search,filter,PAGE_SIZE,offset);
    const ids=tenants.map(t=>t.id);
    const events=ids.length?await db.$queryRawUnsafe<Array<{tenantId:string;action:string;createdAt:Date}>>(`
      SELECT a.tenant_id::text AS "tenantId",a.action,a.created_at AS "createdAt"
      FROM platform_audit_events a WHERE a.tenant_id::text=ANY($1::text[])
      AND a.action IN (
        'saas_signup_requested','qa_provisioning_approved',
        'owner_invitation_queued','owner_invite_recovery_requested',
        'owner_email_verified_provisioning_queued','owner_invite_activated',
        'self_service_trial_started_after_db_ready','trial_activated_qa',
        'notification_send_failed','tenant_provisioning_failed')
      ORDER BY a.created_at DESC LIMIT 250`,ids):[];
    return {tenants,accounts:[],events,totalMatched:found[0]?.quantity??0,counts:stats[0],page,pageSize:PAGE_SIZE};
   }
   const accountSource=`
    FROM (
      SELECT i.id::text AS id,i.full_name AS name,i.email,
        m.role,(i.enabled AND m.enabled) AS enabled,m.tenant_id::text AS "tenantId",
        t.display_name AS "tenantName",t.state AS "tenantState",e.state AS license,
        'TENANT'::text AS source
      FROM platform_memberships m JOIN platform_identities i ON i.id=m.identity_id
      JOIN platform_tenants t ON t.id=m.tenant_id
      LEFT JOIN platform_entitlements e ON e.tenant_id=t.id
      UNION ALL
      SELECT i.id::text AS id,i.full_name AS name,i.email,
        'PLATFORM'::text AS role,(i.enabled AND p.enabled) AS enabled,
        NULL::text AS "tenantId",NULL::text AS "tenantName",
        NULL::text AS "tenantState",NULL::text AS license,'PLATFORM'::text AS source
      FROM platform_operators p JOIN platform_identities i ON i.id=p.identity_id
    ) a WHERE ($1::text='' OR lower(a.name) LIKE '%'||$1||'%'
      OR lower(a.email) LIKE '%'||$1||'%'
      OR lower(COALESCE(a."tenantName",'')) LIKE '%'||$1||'%')`;
   const matched=await db.$queryRawUnsafe<Array<{quantity:number}>>(
      `SELECT count(*)::integer AS quantity ${accountSource}`,search);
   const accounts=await db.$queryRawUnsafe<Array<{
      id:string;name:string;email:string;role:string;enabled:boolean;tenantId:string|null;
      tenantName:string|null;tenantState:string|null;license:string|null;source:string;
   }>>(`SELECT a.* ${accountSource} ORDER BY a.name,a.id LIMIT $2::integer OFFSET $3::integer`,
      search,PAGE_SIZE,offset);
   return {tenants:[],accounts,events:[],totalMatched:matched[0]?.quantity??0,counts:stats[0],page,pageSize:PAGE_SIZE};
  });
  return NextResponse.json(result,{headers:{"Cache-Control":"private,no-store"}});
 }catch(error){return apiError(error);}
}
