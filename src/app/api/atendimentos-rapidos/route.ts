import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { currentUser } from "@/lib/auth";
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
    if (!canWrite(user.role, "comandas")) throw new BusinessError("Acesso negado.", 403);
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

      // Reutiliza um veículo já conhecido somente quando o nome do proprietário confere.
      // Nunca muda de titularidade automaticamente nem altera atendimentos anteriores.
      const previous = await tx.veiculo.findUnique({
        where: { placa: values.placa }, include: { cliente: true },
      });
      if (previous && previous.cliente.nome.trim().toLocaleLowerCase("pt-BR") !== values.nomeCliente.toLocaleLowerCase("pt-BR"))
        throw new BusinessError("Esta placa já está vinculada a outro cliente. Confirme os dados em Clientes antes de abrir a comanda.", 409);
      if (previous?.tipo !== undefined && previous.tipo !== values.tipo)
        throw new BusinessError("Esta placa está cadastrada com outro tipo de veículo. Confira a ficha do veículo.", 409);
      if (previous) {
        const existingOrder = await tx.comanda.findFirst({
          where: { veiculoId: previous.id, status: { in: ["AGUARDANDO", "EM_LAVAGEM", "FINALIZADO"] } },
        });
        if (existingOrder) throw new BusinessError("Este veículo já possui uma comanda em aberto.", 409);
      }

      const vehicle = previous ?? await tx.veiculo.create({
        data: {
          placa: values.placa,
          tipo: values.tipo,
          marca: "Não informado",
          modelo: values.tipo === "MOTO" ? "Motocicleta" : values.tipo === "CAMINHONETE" ? "Caminhonete" : "Automóvel",
          cor: "Não informado",
          ano: new Date().getFullYear(),
          cliente: { create: { nome: values.nomeCliente, telefone: "" } },
        },
      });
      const order = await tx.comanda.create({
        data: {
          clienteId: vehicle.clienteId,
          veiculoId: vehicle.id,
          desconto: new Prisma.Decimal(desconto).div(100),
          total: new Prisma.Decimal(subtotal - desconto).div(100),
          observacoes: values.observacoes,
          funcionarioId: values.funcionarioId || null,
          itens: {
            create: services.map((service) => ({
              servicoId: service.id,
              nome: service.nome,
              preco: service.preco,
              quantidade: 1,
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
