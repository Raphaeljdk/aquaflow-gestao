import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { allowedPages, canWrite } from "@/lib/permissions";

/**
 * Contrato reservado para consumidores mobile autenticados.
 *
 * Importante: esta rota SÓ suporta a sessão web/cookie atual. Não fazer
 * login nativo com senha armazenada, nem distribuir cookie/session secret
 * no aplicativo. OAuth + PKCE e revogação ainda precisam ser implementados.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await currentUser(); // valida sessão, tenant e licença no servidor
    if (user.platformOperator) {
      return NextResponse.json({ error: "Requer acesso a um estabelecimento." }, { status: 403 });
    }
    return NextResponse.json({
      version: 1,
      app: "AquaFlow Gestão",
      user: { name: user.name, role: user.role },
      establishment: { slug: user.tenantSlug ?? null },
      capabilities: {
        commands: { view: allowedPages[user.role].includes("comandas"), edit: canWrite(user.role, "comandas") },
        appointments: { view: allowedPages[user.role].includes("agendamentos") },
        financialReports: { view: allowedPages[user.role].includes("relatorios") },
        smartposPayment: { enabled: false, reason: "Integração e homologação pendentes." },
        nativeAuthentication: { enabled: false, reason: "Autenticação OAuth/PKCE ainda não liberada." },
      },
    }, { headers: { "Cache-Control": "private, no-store", "Vary": "Cookie" } });
  } catch (error) {
    return apiError(error);
  }
}
