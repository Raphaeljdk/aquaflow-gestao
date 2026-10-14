import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { operationalUser as currentUser } from "@/lib/auth";
import { checkOrigin, apiError } from "@/lib/api";
import { BusinessError } from "@/lib/domain";
import { canWrite } from "@/lib/permissions";
import { atendimentoRapidoSchema } from "@/lib/atendimento-rapido";
import { dayKey } from "@/lib/format";
export const dynamic = "force-dynamic";
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await currentUser();
    if (
      !canWrite(actor, "agendamentos") ||
      !canWrite(actor, "comandas")
    )
      throw new BusinessError("Acesso negado.", 403);
    checkOrigin(request);
    const vehicle = atendimentoRapidoSchema
      .pick({ placa: true, tipo: true })
      .parse(await request.json());
    const { id } = await params;
    const result = await prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(642019)`;
        const booking = await tx.agendamento.findUnique({
          where: { id },
          include: { servicos: { include: { servico: true } } },
        });
        if (
          !booking ||
          booking.status !== "AGENDADO" ||
          booking.clienteId ||
          booking.veiculoId
        )
          throw new BusinessError(
            "Agendamento inválido ou já convertido.",
            409,
          );
        if (dayKey(booking.dataHora) !== dayKey(new Date()))
          throw new BusinessError("Converta no dia do agendamento.");
        if (booking.servicos.some((item) => !item.servico.ativo))
          throw new BusinessError(
            "Um serviço da reserva está indisponível.",
            409,
          );
        const active = await tx.comanda.findFirst({
          where: {
            status: { in: ["AGUARDANDO", "EM_LAVAGEM", "FINALIZADO"] },
            OR: [
              { placa: vehicle.placa },
              { veiculo: { is: { placa: vehicle.placa } } },
            ],
          },
        });
        if (active)
          throw new BusinessError(
            "Esta placa já possui uma comanda em aberto.",
            409,
          );
        const subtotal = booking.servicos.reduce(
          (sum, item) => sum + Math.round(Number(item.servico.preco) * 100),
          0,
        );
        const order = await tx.comanda.create({
          data: {
            clienteId: null,
            veiculoId: null,
            nomeCliente: booking.nomeCliente,
            telefoneCliente: booking.telefoneCliente,
            placa: vehicle.placa,
            tipoVeiculo: vehicle.tipo,
            total: new Prisma.Decimal(subtotal).div(100),
            desconto: 0,
            observacoes: booking.observacoes,
            itens: {
              create: booking.servicos.map((item) => ({
                servicoId: item.servicoId,
                nome: item.servico.nome,
                preco: item.servico.preco,
                quantidade: 1,
              })),
            },
          },
          select: { id: true, numero: true },
        });
        await tx.agendamento.update({
          where: { id },
          data: {
            status: "CONVERTIDO",
            comandaId: order.id,
            nomeCliente: "",
            telefoneCliente: "",
            placa: "",
          },
        });
        return order;
      },
      { timeout: 30000 },
    );
    return NextResponse.json({ comanda: result });
  } catch (error) {
    return apiError(error);
  }
}
