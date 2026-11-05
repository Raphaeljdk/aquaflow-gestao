import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { apiError, checkOrigin } from "@/lib/api";
import { withOperationalDatabase } from "@/lib/saas/operations";
import { confirmarEstruturaProdutos, exigirOperacaoProdutos, itemProdutoSchema } from "@/lib/produtos";
import { BusinessError } from "@/lib/domain";

type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
  try {
    const user = await currentUser();
    exigirOperacaoProdutos(user);
    const { id } = await context.params;
    const itens = await withOperationalDatabase(user, async db => {
      await confirmarEstruturaProdutos(db);
      const comanda = await db.comanda.findUnique({ where: { id }, select: { id: true } });
      if (!comanda) throw new BusinessError("Comanda não encontrada.", 404);
      return db.itemProdutoComanda.findMany({ where: { comandaId: id }, orderBy: { createdAt: "asc" } });
    });
    return NextResponse.json({ itens: itens.map(i => ({ ...i, preco: Number(i.preco) })) },
      { headers: { "Cache-Control": "no-store" } });
  } catch (e) { return apiError(e); }
}
export async function POST(request: Request, context: Context) {
  try {
    checkOrigin(request);
    const user = await currentUser();
    exigirOperacaoProdutos(user);
    const { id } = await context.params;
    const input = itemProdutoSchema.parse(await request.json());
    const item = await withOperationalDatabase(user, db => db.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(642019)`;
      await confirmarEstruturaProdutos(tx);
      const pedido = await tx.comanda.findUnique({ where: { id } });
      if (!pedido) throw new BusinessError("Comanda não encontrada.", 404);
      const existente = await tx.itemProdutoComanda.findUnique({ where: { requestId: input.requestId } });
      if (existente) {
        if (existente.comandaId !== id || existente.produtoId !== input.produtoId ||
          existente.quantidade !== input.quantidade)
          throw new BusinessError("Identificador da operação já utilizado em outra venda.", 409);
        return existente;
      }
      if (!["AGUARDANDO", "EM_LAVAGEM"].includes(pedido.status))
        throw new BusinessError("Produtos só podem ser adicionados antes do fechamento.", 409);
      const produto = await tx.produto.findUnique({ where: { id: input.produtoId } });
      if (!produto || !produto.ativo) throw new BusinessError("Produto indisponível.", 404);
      const reservas = await tx.itemProdutoComanda.findMany({
        where: { produtoId: input.produtoId, baixadoEm: null,
          comanda: { status: { in: ["AGUARDANDO", "EM_LAVAGEM"] } } },
        select: { quantidade: true },
      });
      const disponivel = produto.estoque - reservas.reduce((n, x) => n + x.quantidade, 0);
      if (disponivel < input.quantidade) throw new BusinessError("Estoque insuficiente para esse produto.", 409);
      const novoItem = await tx.itemProdutoComanda.create({
        data: {
          requestId: input.requestId, registradoPorId: user.id,
          produtoId: produto.id, comandaId: id,
          nome: produto.nome, preco: produto.preco,
          quantidade: input.quantidade,
        },
      });
      await tx.comanda.update({
        where: { id }, data: { total: pedido.total.plus(produto.preco.mul(input.quantidade)) },
      });
      return novoItem;
    }, { maxWait: 10000, timeout: 30000 }));
    return NextResponse.json({ item: { ...item, preco: Number(item.preco) } }, { status: 201 });
  } catch (e) { return apiError(e); }
}
