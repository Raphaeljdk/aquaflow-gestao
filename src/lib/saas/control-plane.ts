import "server-only";
import { PrismaClient } from "@prisma/client";

/** Separate central database. Fail closed when not configured. */
export function validateControlPlaneDatabaseUrl(value: string | undefined, legacy: string | undefined) {
  if (!value) throw new Error("CONTROL_DATABASE_URL não configurada.");
  let control: URL, operational: URL | undefined;
  try { control = new URL(value); operational = legacy ? new URL(legacy) : undefined; }
  catch { throw new Error("URL do controle central inválida."); }
  if (!["postgresql:", "postgres:"].includes(control.protocol) ||
      !control.username || !control.password || !control.hostname || control.pathname.length < 2)
    throw new Error("Banco central inválido.");
  if (operational && operational.hostname === control.hostname)
    throw new Error("Banco central não pode reutilizar o endpoint operacional.");
  return value;
}
export async function withControlPlane<T>(callback:(db:PrismaClient)=>Promise<T>):Promise<T> {
  const url=validateControlPlaneDatabaseUrl(
    process.env.CONTROL_DATABASE_URL,
    process.env.DATABASE_URL ?? process.env.NEON_DATABASE_URL,
  );
  const client=new PrismaClient({datasources:{db:{url}},log:["error"]});
  try{return await callback(client);}finally{await client.$disconnect();}
}
