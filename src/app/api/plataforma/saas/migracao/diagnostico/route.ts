import {NextResponse} from "next/server";
import {requirePlatformAdmin} from "@/lib/platform-admin";
import {prisma} from "@/lib/prisma";
import {withControlPlane} from "@/lib/saas/control-plane";

export const runtime="nodejs";
export const dynamic="force-dynamic";

/** Read-only, no passwords, names, emails, phone numbers, connection strings or row content.
 * A release MUST NOT enable SaaS just because this preflight succeeds.
 * Snapshot/reconciliation and an explicit maintenance cutover are separate steps.
 */
export async function GET(){
 try {
  await requirePlatformAdmin();
  if(process.env.VERCEL_ENV!=="production" || process.env.SAAS_PRODUCTION_MODE==="true")
   return NextResponse.json({error:"O diagnóstico legado requer produção no modo anterior à migração."},{status:409});
  const inventory=await prisma.$queryRaw<Array<{
   users:number;clients:number;vehicles:number;orders:number;order_items:number;
   services:number;employees:number;appointments:number;appointment_services:number;
   materials:number;stock_movements:number;public_requests:number;
   public_bookings:number;partners:number;support_cases:number;support_messages:number;
  }>>`
   SELECT
    (SELECT count(*)::int FROM "User") AS users,
    (SELECT count(*)::int FROM "Cliente") AS clients,
    (SELECT count(*)::int FROM "Veiculo") AS vehicles,
    (SELECT count(*)::int FROM "Comanda") AS orders,
    (SELECT count(*)::int FROM "ItemComanda") AS order_items,
    (SELECT count(*)::int FROM "Servico") AS services,
    (SELECT count(*)::int FROM "Funcionario") AS employees,
    (SELECT count(*)::int FROM "Agendamento") AS appointments,
    (SELECT count(*)::int FROM "AgendamentoServico") AS appointment_services,
    (SELECT count(*)::int FROM "Material") AS materials,
    (SELECT count(*)::int FROM "MovimentoEstoque") AS stock_movements,
    (SELECT count(*)::int FROM "SolicitacaoEmpresa") AS public_requests,
    (SELECT count(*)::int FROM "PedidoAgendamentoPublico") AS public_bookings,
    (SELECT count(*)::int FROM "ParceiroLavaRapido") AS partners,
    (SELECT count(*)::int FROM "ChamadoSuporte") AS support_cases,
    (SELECT count(*)::int FROM "MensagemChamado") AS support_messages
  `;
  const central=await withControlPlane(db=>db.$queryRaw<Array<{
    operators:number;tenants:number;memberships:number;licenses:number;charges:number;
    provisioning_jobs:number;
  }>>`
   SELECT
    (SELECT count(*)::int FROM platform_operators) AS operators,
    (SELECT count(*)::int FROM platform_tenants) AS tenants,
    (SELECT count(*)::int FROM platform_memberships) AS memberships,
    (SELECT count(*)::int FROM platform_entitlements) AS licenses,
    (SELECT count(*)::int FROM platform_billing_charges) AS charges,
    (SELECT count(*)::int FROM platform_provisioning_jobs) AS provisioning_jobs
  `);
  return NextResponse.json({
   phase:"READ_ONLY_AUDIT",
   legacy:inventory[0],
   control:central[0],
   migrationsApplied:false,
   billingReleaseAllowed:false,
   requirements:[
    "Criar snapshot Neon antes da cópia",
    "Atribuir identidade e papéis sem misturar empresas",
    "Congelar novas gravações no corte final e comparar as contagens",
    "Verificar logins, comandas, agendamentos e notas no banco individual",
    "Confirmar reconciliação Stripe e envio Resend antes de ativar cobranças"
   ]
  },{headers:{"Cache-Control":"private, no-store"}});
 }catch {
  return NextResponse.json({error:"Não foi possível conferir os dois bancos. Nenhuma migração foi realizada."},
   {status:503,headers:{"Cache-Control":"no-store"}});
 }
}
