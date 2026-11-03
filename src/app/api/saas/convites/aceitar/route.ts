import { NextRequest,NextResponse } from "next/server";
import { z } from "zod";
import { withControlPlane } from "@/lib/saas/control-plane";
import { acceptOwnerInvitation } from "@/lib/saas/invitations";
import { saasPilotMode } from "@/lib/saas/identity";
import { publicSignupMode } from "@/lib/saas/public-signup-mode";
import { checkOrigin,apiError } from "@/lib/api";
import { BusinessError } from "@/lib/domain";
export const dynamic="force-dynamic";
export async function POST(request:NextRequest){
  try{
    if(!saasPilotMode() && !publicSignupMode(process.env))throw new BusinessError("Convites indisponíveis.",503);
    checkOrigin(request);
    if(Number(request.headers.get("content-length")??0)>1000)throw new BusinessError("Requisição muito grande.",413);
    const input=z.object({token:z.string().min(40).max(100),password:z.string().min(12).max(128)}).parse(await request.json());
    const result=await withControlPlane(db=>acceptOwnerInvitation(db,input.token,input.password));
    return NextResponse.json(result,{headers:{"Cache-Control":"no-store"}});
  }catch(e){return apiError(e)}
}
