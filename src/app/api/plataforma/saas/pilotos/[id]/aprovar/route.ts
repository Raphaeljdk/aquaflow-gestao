import { NextRequest,NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { checkOrigin,apiError } from "@/lib/api";
import { withControlPlane } from "@/lib/saas/control-plane";
import { assertSaasManagementEnabled } from "@/lib/saas/pilot-control";
import { approveTrialRequest } from "@/lib/saas/signup";
export const dynamic="force-dynamic";
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
  try{
    await requirePlatformAdmin();assertSaasManagementEnabled();checkOrigin(request);
    const {id}=await params;
    const result=await withControlPlane(db=>approveTrialRequest(db,id));
    return NextResponse.json(result,{headers:{"Cache-Control":"private, no-store"}});
  }catch(e){return apiError(e)}
}
