import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeWhatsappPhone } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

// Resposta pública mínima: nunca retorna funcionários, clientes, credenciais ou dados financeiros.
export async function GET() {
  try {
    const company = await prisma.configuracao.findUnique({
      where: { id: "empresa" },
      select: { nome: true, telefone: true, logo: true },
    });
    const whatsapp = normalizeWhatsappPhone(company?.telefone);
    return NextResponse.json(
      { empresa: company?.nome ?? "Lava-rápido", logo: company?.logo?.startsWith("data:image/") ? company.logo : null, whatsapp, disponivel: !!whatsapp },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    console.error("[public-contato] Falha ao consultar contato", error);
    return NextResponse.json(
      { error: "Contato temporariamente indisponível." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
