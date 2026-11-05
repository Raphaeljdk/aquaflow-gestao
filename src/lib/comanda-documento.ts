import "server-only";
import type { PrismaClient } from "@prisma/client";
import type { Vistoria } from "@/types";
import { gerarPdfVistoria } from "@/lib/inspection-report";
import { BusinessError } from "@/lib/domain";

export async function gerarPdfComandaOperacional(db: PrismaClient, id: string): Promise<File> {
  const comanda = await db.comanda.findUnique({
    where: { id },
    include: {
      cliente: true, veiculo: true, itens: true,
      itensProduto: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!comanda) throw new BusinessError("Comanda não encontrada neste lava-rápido.", 404);
  const cfg = await db.configuracao.findUnique({ where: { id: "empresa" } });
  const vistoria = comanda.vistoria as unknown as Vistoria | null;
  return gerarPdfVistoria({
    numero: comanda.numero,
    estabelecimento: cfg?.nome ?? "Lava-rápido",
    cliente: comanda.cliente.nome,
    telefone: comanda.cliente.telefone,
    veiculo: [comanda.veiculo.marca, comanda.veiculo.modelo, comanda.veiculo.cor].filter(Boolean).join(" "),
    tipo: comanda.veiculo.tipo,
    placa: comanda.veiculo.placa,
    criadoEm: comanda.createdAt.toISOString(),
    vistoria: vistoria ?? { itens: [], atualizadoEm: comanda.createdAt.toISOString(), observacoesGerais: "Vistoria não realizada." },
    resumoComanda: {
      status: comanda.status,
      pagamento: comanda.formaPagamento ?? "Pendente",
      desconto: Number(comanda.desconto),
      total: Number(comanda.total),
      observacoes: comanda.observacoes,
      finalizadoEm: comanda.finalizadoEm?.toISOString() ?? null,
      pagoEm: comanda.pagoEm?.toISOString() ?? null,
      servicos: comanda.itens.map(i => ({nome:i.nome,preco:Number(i.preco),quantidade:i.quantidade})),
      produtos: comanda.itensProduto.map(i => ({
        nome:i.nome,preco:Number(i.preco),quantidade:i.quantidade,devolvido:i.devolvido,
      })),
    },
  });
}
