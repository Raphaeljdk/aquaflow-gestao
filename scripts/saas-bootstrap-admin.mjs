#!/usr/bin/env node
// One-time QA operator bootstrap. Run in a protected CI environment with masked secrets.
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
const url=process.env.CONTROL_DATABASE_URL;
const email=process.env.SAAS_QA_ADMIN_EMAIL?.trim().toLowerCase();
const password=process.env.SAAS_QA_ADMIN_PASSWORD;
if(process.env.SAAS_QA_MODE!=="true" || !url || !email ||
   !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
   !password || password.length<16 || !/[A-Z]/.test(password) ||
   !/[a-z]/.test(password) || !/[0-9]/.test(password))
   throw new Error("Bootstrap exige QA, banco central, email e senha forte de 16+ caracteres.");
if(process.env.DATABASE_URL && new URL(url).hostname===new URL(process.env.DATABASE_URL).hostname)
   throw new Error("Bootstrap não pode compartilhar conexão com banco legado.");
const db=new PrismaClient({datasources:{db:{url}},log:["error"]});
try{
 const hashed=await hash(password,12);
 await db.$transaction(async tx=>{
   const rows=await tx.$queryRaw`SELECT id::text FROM platform_identities WHERE lower(email)=${email} FOR UPDATE`;
   let id=rows[0]?.id;
   if(!id){
     const created=await tx.$queryRaw`INSERT INTO platform_identities(email,password_hash,full_name)
       VALUES(${email},${hashed},'Gestão da plataforma') RETURNING id::text`;
     id=created[0].id;
   }else{
     // Existing users retain their passwords; never silently reset the credential.
     const allowed=await tx.$queryRaw`SELECT identity_id::text FROM platform_operators
       WHERE identity_id=${id}::uuid`;
     if(!allowed.length)throw new Error("Email já está vinculado a usuário não operador.");
   }
   await tx.$executeRaw`
     INSERT INTO platform_operators(identity_id,enabled)
     VALUES(${id}::uuid,true)
     ON CONFLICT(identity_id) DO UPDATE SET enabled=true`;
 });
 console.log("Gestor central QA configurado; senha não exibida.");
}catch(e){console.error("Bootstrap bloqueado; verificar conta e configuração no runner.");process.exitCode=1;}
finally{await db.$disconnect()}
