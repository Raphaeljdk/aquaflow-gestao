import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { withControlPlane } from "@/lib/saas/control-plane";
import { assertSaasManagementEnabled, listPilotStatus } from "@/lib/saas/pilot-control";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    await requirePlatformAdmin();
    assertSaasManagementEnabled();
    const tenants = await withControlPlane(listPilotStatus);
    return NextResponse.json({
      tenants: tenants.map(t => ({
        id: t.id, slug: t.slug, provisionamento: t.state, licenca: t.license_state,
        usuariosAtivos: t.members, bancoConfigurado: t.has_database,
        testeJaIniciado: Boolean(t.trial_started_at),
        testeExpiraEm: t.trial_ends_at,
        aptoParaTeste: t.state === "READY" && t.has_database && t.members > 0,
        stripeHabilitada: process.env.STRIPE_BILLING_ENABLED === "true" &&
          (process.env.SAAS_PRODUCTION_MODE === "true" ?
              process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") === true :
              process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_") === true) &&
          process.env.STRIPE_WEBHOOK_SECRET?.startsWith("whsec_") === true,
        stripePixHabilitado: process.env.STRIPE_PIX_ENABLED === "true",
      })),
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Painel de homologação indisponível ou não autorizado." },
      { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
