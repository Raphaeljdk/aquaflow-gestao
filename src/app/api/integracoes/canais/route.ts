import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { BusinessError } from "@/lib/domain";
import { listDistributionChannels, releaseReadiness } from "@/lib/integrations/catalog";

export const dynamic = "force-dynamic";

/**
 * Endpoint de leitura para administradores autenticados.
 * O currentUser() já exige uma licença válida e valida a associação tenant.
 * Não expõe segredos, IDs de estabelecimento recebedor nem credenciais de banco.
 */
export async function GET() {
  try {
    const user = await currentUser();
    if (user.role !== "ADMIN") throw new BusinessError("Acesso restrito ao administrador.", 403);
    return NextResponse.json(
      {
        version: 1,
        channels: listDistributionChannels(),
        readiness: releaseReadiness(),
        message: "A estrutura foi criada, mas os canais ainda não foram homologados ou publicados.",
      },
      { headers: { "Cache-Control": "no-store, private" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
