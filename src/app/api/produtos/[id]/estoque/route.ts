import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { apiError, checkOrigin } from "@/lib/api";
import { withOperationalDatabase } from "@/lib/saas/operations";
import { confirmarEstruturaProdutos, exigirAdminProdutos, movimentoProdutoSchema } from "@/lib/produtos";
import { BusinessError } from "@/lib/domain";
import { quantidadeReservada } from "@/lib/product-sales-policy";

type Context = { params: Promise<{ id: string }> };
export async function POST(request: Request, context: Context) {
  try {
    checkOrigin(request);
    const user = await currentUser();
    exigirAdminProdutos(user);
    const { id } = await context.params;
    const input = movimentoProdutoSchema.parse(await request.json());
    const result = await withOperationalDatabase(user, db => db.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(642019)`;
      await confirmarEstruturaProdutos(tx);
      const produto = await tx.produto.findUnique({ where: { id } });
      if (!produto) throw new BusinessError("Produto não encontrado.", 404);
      // Reservas de todas as comandas ativas impedem ajuste que causaria venda sem saldo.
      const reservas = await tx.itemProdutoComanda.findMany({
        where: { produtoId: id, baixadoEm: null,
          comanda: { status: { in: ["AGUARDANDO", "EM_LAVAGEM"] } } },
        select: { quantidade: true },
      });
      const reservado = quantidadeReservada(reservas);
      const novoSaldo = produto.estoque + input.quantidade;
      if (novoSaldo < 0 || novoSaldo < reservado)
        throw new BusinessError("Saldo insuficiente: existem itens reservados em comandas abertas.", 409);
      const updated = await tx.produto.update({
        where: { id }, data: { estoque: novoSaldo },
      });
      await tx.movimentoProduto.create({
        data: { produtoId: id, registradoPorId: user.id,
          tipo: input.quantidade > 0 ? "ENTRADA" : "AJUSTE",
          quantidade: input.quantidade,
          observacao: input.observacao || "Ajuste manual de estoque" },
      });
      return { ...updated, preco: Number(updated.preco) };
    }, { maxWait: 10000, timeout: 30000 }));
    return NextResponse.json({ produto: result });
  } catch (e) { return apiError(e); }
}
