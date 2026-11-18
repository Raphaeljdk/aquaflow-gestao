import {NextRequest,NextResponse} from "next/server";
import {randomBytes} from "node:crypto";
import {z} from "zod";
import {prisma} from "@/lib/prisma";
import {requirePlatformAdmin} from "@/lib/platform-admin";
import {withControlPlane} from "@/lib/saas/control-plane";
import {checkOrigin,apiError} from "@/lib/api";
export const runtime="nodejs";
export const dynamic="force-dynamic";

type PartnerRow={id:string;name:string;code:string;active:boolean;createdAt:Date;central:number;inTrial:number;paying:number};

/** Only platform admins can list or create referral links. Partners do not see tenant data. */
export async function GET(){
 try{
  await requirePlatformAdmin();
  const central=await withControlPlane(db=>db.$queryRaw<Array<PartnerRow>>`
   SELECT p.id::text AS id,p.name,p.code,p.active,p.created_at AS "createdAt",
     count(r.tenant_id)::int AS central,
     count(r.tenant_id) FILTER (WHERE e.state='TRIAL')::int AS "inTrial",
     count(r.tenant_id) FILTER (WHERE e.state='ACTIVE')::int AS paying
   FROM platform_sales_partners p
   LEFT JOIN platform_sales_referrals r ON r.partner_id=p.id
   LEFT JOIN platform_entitlements e ON e.tenant_id=r.tenant_id
   GROUP BY p.id,p.name,p.code,p.active,p.created_at
   ORDER BY p.created_at DESC LIMIT 150`);
  const legacy=await prisma.solicitacaoEmpresa.groupBy({
   by:["parceiroIndicador"],where:{parceiroIndicador:{not:null}},_count:{id:true}
  });
  const counts=new Map(legacy.map(x=>[x.parceiroIndicador,x._count.id]));
  return NextResponse.json({partners:central.map(p=>({...p,legacy:counts.get(p.code)??0,total:p.central+(counts.get(p.code)??0)}))},
   {headers:{"Cache-Control":"private,no-store"}});
 }catch(e){return apiError(e);}
}
export async function POST(request:NextRequest){
 try{
  await requirePlatformAdmin();checkOrigin(request);
  if(Number(request.headers.get("content-length")??0)>1000)
   return NextResponse.json({error:"Requisição muito grande."},{status:413});
  const {name}=z.object({name:z.string().trim().min(3).max(90)}).parse(await request.json());
  const code="ind-"+randomBytes(6).toString("hex");
  const rows=await withControlPlane(db=>db.$queryRaw<Array<PartnerRow>>`
   INSERT INTO platform_sales_partners(name,code) VALUES(${name},${code})
   RETURNING id::text AS id,name,code,active,created_at AS "createdAt"`);
  return NextResponse.json({partner:rows[0]},{status:201,headers:{"Cache-Control":"private,no-store"}});
 }catch(e){return apiError(e);}
}
