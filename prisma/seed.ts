import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { makeDemoData } from "../src/lib/demo-data";
const prisma=new PrismaClient();
async function main(){
 const email=process.env.SEED_ADMIN_EMAIL??"admin@aquaflow.local",password=process.env.SEED_ADMIN_PASSWORD;
 if(!password||password.length<12)throw new Error("Defina SEED_ADMIN_PASSWORD com no mínimo 12 caracteres.");
 const data=makeDemoData();
 await prisma.$transaction(async tx=>{
 await tx.configuracao.upsert({where:{id:"empresa"},create:{id:"empresa",...data.configuracao},update:{}});
 await tx.funcionario.upsert({where:{id:"admin"},create:{id:"admin",nome:"Administrador",cargo:"ADMIN",comissao:0,email},update:{}});
 await tx.user.upsert({where:{email},create:{name:"Administrador",email,password:await hash(password,12),role:"ADMIN",funcionarioId:"admin"},update:{}});
 if(await tx.cliente.count()>0){console.log("Cadastros existentes preservados. Seed não duplicado.");return;}
 for(const c of data.clientes)await tx.cliente.create({data:{...c,cpfCnpj:c.cpfCnpj||null,createdAt:new Date(c.createdAt)}});
 for(const v of data.veiculos)await tx.veiculo.create({data:v});
 for(const s of data.servicos)await tx.servico.create({data:s});
 for(const f of data.funcionarios)await tx.funcionario.create({data:f});
 for(const o of data.comandas){const {itens,...v}=o;await tx.comanda.create({data:{...v,createdAt:new Date(v.createdAt),finalizadoEm:v.finalizadoEm?new Date(v.finalizadoEm):null,itens:{create:itens}}});}
 for(const a of data.agendamentos){const {servicoIds,...v}=a;await tx.agendamento.create({data:{...v,dataHora:new Date(v.dataHora),fim:new Date(v.fim),servicos:{create:servicoIds.map(servicoId=>({servicoId}))}}});}
 console.log("Seed concluído com clientes, veículos, catálogo, equipe, comandas e agenda.");
 },{timeout:60000});
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>prisma.$disconnect());

