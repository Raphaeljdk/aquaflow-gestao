import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeWhatsappPhone } from "@/lib/whatsapp";
export const dynamic = "force-dynamic";

// Dados estritamente públicos da instância. Não inclui comandas ou cadastros de clientes.
export async function GET() {
  try {
    const [company, servicos] = await Promise.all([
      prisma.configuracao.findUnique({ where: { id: "empresa" },
        select: { nome: true, logo: true, telefone: true, abertura: true, fechamento: true,
          diasSemana: true, intervaloMin: true } }),
      prisma.servico.findMany({ where: { ativo: true }, select: { id: true, nome: true, duracaoMin: true },
        orderBy: { nome: "asc" }, take: 100 }),
    ]);
    const whatsapp = normalizeWhatsappPhone(company?.telefone);
    return NextResponse.json({
      empresa: company?.nome ?? "Lava-rápido",
      logo: company?.logo?.startsWith("data:image/") ? company.logo : null,
      whatsapp, disponivel: Boolean(whatsapp),
      abertura: company?.abertura ?? "08:00",
      fechamento: company?.fechamento ?? "18:00",
      diasSemana: company?.diasSemana ?? [1, 2, 3, 4, 5, 6],
      intervaloMin: company?.intervaloMin ?? 30,
      servicos,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Agendamento temporariamente indisponível." }, { status: 503 });
  }
}
