import {NextResponse} from "next/server";
import {requirePlatformAdmin} from "@/lib/platform-admin";
import {withControlPlane} from "@/lib/saas/control-plane";
import {listPilotStatus} from "@/lib/saas/pilot-control";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(){
 try{
  await requirePlatformAdmin();
  if(process.env.SAAS_PRODUCTION_MODE!=="true"||process.env.VERCEL_ENV!=="production")
   return NextResponse.json({error:"Modo SaaS produção indisponível."},{status:503});
  const rows=await withControlPlane(listPilotStatus);
  return NextResponse.json({tenants:rows.map(t=>({
   id:t.id,slug:t.slug,provisionamento:t.state,licenca:t.license_state,
   bancoConfigurado:t.has_database,usuariosAtivos:t.members,testeExpiraEm:t.trial_ends_at
  }))},{headers:{"Cache-Control":"private, no-store"}});
 }catch{
  return NextResponse.json({error:"Gestão SaaS não autorizada."},{status:403,headers:{"Cache-Control":"no-store"}});
 }
}
