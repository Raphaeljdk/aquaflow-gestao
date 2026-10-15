import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { operationalUser as currentUser } from "@/lib/auth";
import { checkOrigin, apiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { BusinessError } from "@/lib/domain";
import { canWrite } from "@/lib/permissions";
import { atendimentoRapidoSchema } from "@/lib/atendimento-rapido";

export const dynamic = "force-dynamic";

// Os dados mínimos são registrados junto à comanda para preservar o histórico
// financeiro. Não é necessário cadastrar clientes e veículos antecipadamente.
export async function POST(request: Request) {
  try {
    const user = await currentUser();
    if (!canWrite(user, "comandas")) throw new BusinessError("Acesso negado.", 403);
    checkOrigin(request);
    if (Number(request.headers.get("content-length") ?? 0) > 16000)
      throw new BusinessError("Requisição muito grande.", 413);
    const values = atendimentoRapidoSchema.parse(await request.json());
    const result = await prisma.$transaction(async (tx) => {
      // Mesmo bloqueio transacional das demais operações de comandas.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(642019)`;
      const services = await tx.servico.findMany({
        where: { id: { in: values.servicoIds }, ativo: true },
      });
      if (services.length !== new Set(values.servicoIds).size)
        throw new BusinessError("Um dos serviços escolhidos está indisponível.", 409);

      const subtotal = services.reduce((sum, service) => sum + Math.round(Number(service.preco) * 100), 0);
      const desconto = Math.round(values.desconto * 100);
      if (desconto > subtotal) throw new BusinessError("Desconto maior que o total dos serviços.");
      if (values.funcionarioId) {
        const employee = await tx.funcionario.findFirst({
          where: { id: values.funcionarioId, ativo: true, cargo: { not: "ADMIN" } },
        });
        if (!employee) throw new BusinessError("Funcionário indisponível.", 409);
      }

      // Não cria nem atualiza uma ficha de cliente ou veículo.
      // Conserva o contato apenas enquanto a comanda estiver em atendimento.
      const active = await tx.comanda.findFirst({
        where: {
          status: { in: ["AGUARDANDO", "EM_LAVAGEM", "FINALIZADO"] },
          OR: [{ placa: values.placa }, { veiculo: { is: { placa: values.placa } } }],
        },
      });
      if (active) throw new BusinessError("Esta placa já possui uma comanda em aberto.", 409);
      const order = await tx.comanda.create({
        data: {
          clienteId: null, veiculoId: null,
          nomeCliente: values.nomeCliente,
          telefoneCliente: values.telefoneCliente ? (values.telefoneCliente.length >= 12 ? values.telefoneCliente : "55" + values.telefoneCliente) : "",
          placa: values.placa,
          tipoVeiculo: values.tipo,
          desconto: new Prisma.Decimal(desconto).div(100),
          total: new Prisma.Decimal(subtotal - desconto).div(100),
          observacoes: values.observacoes,
          funcionarioId: values.funcionarioId || null,
          itens: {
            create: services.map((service) => ({
              servicoId: service.id, nome: service.nome,
              preco: service.preco, quantidade: 1,
            })),
          },
        },
        select: { id: true, numero: true },
      });
      return order;
    }, { timeout: 30000 });
    return NextResponse.json({ comanda: result }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError)
      return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
    return apiError(error);
  }
}
