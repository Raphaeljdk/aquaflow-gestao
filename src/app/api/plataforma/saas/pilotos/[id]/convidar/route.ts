import { NextRequest,NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { checkOrigin,apiError } from "@/lib/api";
import { withControlPlane } from "@/lib/saas/control-plane";
import { assertSaasManagementEnabled } from "@/lib/saas/pilot-control";
import { createOwnerInvitation } from "@/lib/saas/invitations";
export const dynamic="force-dynamic";
/** The secret invitation URL is returned only once to the authenticated QA operator. */
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
  try{
    await requirePlatformAdmin();
    assertSaasManagementEnabled();
    checkOrigin(request);
    const {id}=await params;
    const invitation=await withControlPlane(db=>createOwnerInvitation(db,id));
    const origin=new URL(request.url).origin;
    return NextResponse.json({
      inviteUrl:origin+"/convite?token="+encodeURIComponent(invitation.token),
      email:invitation.email,expiresInHours:invitation.expiresInHours,
    },{headers:{"Cache-Control":"private, no-store","Referrer-Policy":"no-referrer"}});
  }catch(e){return apiError(e)}
}
