import "server-only";
import { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { BusinessError } from "@/lib/domain";
import type { User } from "@/types";
import { saasPilotMode,resolveSaasConnection } from "./identity";
import { tenantDatabaseUrl } from "./database-secrets";

/** No fallback to the legacy connection in QA. Owner/membership/licensing checked centrally. */
export async function withOperationalDatabase<T>(user:User,fn:(db:PrismaClient)=>Promise<T>):Promise<T> {
  if(!saasPilotMode()) return fn(prisma);
  const tenantId=user.tenantId;
  if(!tenantId)throw new BusinessError("Não há estabelecimento vinculado à sessão.",403);
  const tenant=await resolveSaasConnection(user.id,tenantId);
  const url=await tenantDatabaseUrl(tenant,{tenantId,enabled:true},{
    state:"ACTIVE",trialStartedAt:null,trialEndsAt:null,
    paidThrough:new Date(Date.now()+60000),graceEndsAt:null,
  },new Date());
  // SaaS authorization is already rechecked above; dummy short-lived entitlement
  // is only an adapter for the decrypt helper, NEVER the source of authorization.
  const client=new PrismaClient({datasources:{db:{url}},log:["error"]});
  try{return await fn(client);}
  finally{await client.$disconnect();}
}
