import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkOrigin, apiError } from "@/lib/api";
import { BusinessError } from "@/lib/domain";
import { hojeEmSaoPaulo, mensagemAgendamento, pedidoAgendamentoSchema } from "@/lib/parceiros";
import { whatsappLink } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";
// Apenas cria um link; não grava dados pessoais nem reserva horários no sistema.
export async function POST(request: NextRequest) {
  try {
    checkOrigin(request);
    if (Number(request.headers.get("content-length") || 0) > 6000)
      throw new BusinessError("Solicitação muito grande.", 413);
    const pedido = pedidoAgendamentoSchema.parse(await request.json());
    if (pedido.data < hojeEmSaoPaulo())
      throw new BusinessError("Selecione uma data de hoje em diante.", 400);
    const parceiro = await prisma.parceiroLavaRapido.findFirst({
      where: { id: pedido.parceiroId, ativo: true },
      select: { nome: true, whatsapp: true },
    });
    if (!parceiro)
      throw new BusinessError("Este estabelecimento não está recebendo agendamentos pela plataforma.", 409);
    const url = whatsappLink(parceiro.whatsapp, mensagemAgendamento(parceiro, pedido));
    if (!url) throw new BusinessError("Contato do parceiro indisponível.", 409);
    return NextResponse.json({ url }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof SyntaxError)
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    return apiError(error);
  }
}
