import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { apiError, checkOrigin } from "@/lib/api";
import { withOperationalDatabase } from "@/lib/saas/operations";
import { confirmarEstruturaProdutos, exigirAdminProdutos } from "@/lib/produtos";
import { BusinessError } from "@/lib/domain";

const entrada = z.object({
  requestId: z.string().uuid(),
  quantidade: z.coerce.number().int().min(1).max(100),
  motivo: z.string().trim().min(5).max(300),
  reporAoEstoque: z.boolean(),
  reembolsoConfirmado: z.literal(true),
});
type Context = { params: Promise<{ id: string; itemId: string }> };
export async function POST(request: Request, context: Context) {
  try {
    checkOrigin(request);
    const user = await currentUser();
    exigirAdminProdutos(user);
    const { id, itemId } = await context.params;
    const input = entrada.parse(await request.json());
    const result = await withOperationalDatabase(user, db => db.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(642019)`;
      await confirmarEstruturaProdutos(tx);
      const anterior = await tx.devolucaoProduto.findUnique({ where: { requestId: input.requestId } });
      if (anterior) {
        if (anterior.itemId !== itemId || anterior.quantidade !== input.quantidade)
          throw new BusinessError("Esta operação já foi utilizada em outra devolução.", 409);
        return anterior;
      }
      const comanda = await tx.comanda.findUnique({ where: { id } });
      if (!comanda || !["FINALIZADO", "ENTREGUE"].includes(comanda.status))
        throw new BusinessError("Devoluções só podem ser registradas após a venda finalizada.", 409);
      const item = await tx.itemProdutoComanda.findFirst({ where: { id: itemId, comandaId: id } });
      if (!item || !item.baixadoEm) throw new BusinessError("Produto vendido não encontrado.", 404);
      if (input.quantidade > item.quantidade - item.devolvido)
        throw new BusinessError("Quantidade superior ao saldo vendido ainda não devolvido.", 409);
      const valor = item.preco.mul(input.quantidade);
      if (comanda.total.lessThan(valor))
        throw new BusinessError("Total da comanda inconsistente para esta devolução.", 409);
      await tx.itemProdutoComanda.update({
        where: { id: itemId }, data: { devolvido: { increment: input.quantidade } },
      });
      const devolucao = await tx.devolucaoProduto.create({ data: {
        requestId: input.requestId, itemId, quantidade: input.quantidade, valor,
        repostoAoEstoque: input.reporAoEstoque, reembolsoConfirmado: true,
        motivo: input.motivo, registradoPorId: user.id,
      } });
      await tx.comanda.update({
        where: { id }, data: { total: comanda.total.minus(valor) },
      });
      if (input.reporAoEstoque) {
        await tx.produto.update({
          where: { id: item.produtoId }, data: { estoque: { increment: input.quantidade } },
        });
        await tx.movimentoProduto.create({ data: {
          produtoId: item.produtoId, comandaId: id, registradoPorId: user.id,
          tipo: "DEVOLUCAO", quantidade: input.quantidade,
          observacao: "Devolução da comanda #" + comanda.numero + ": " + input.motivo,
        } });
      }
      return devolucao;
    }, { maxWait: 10000, timeout: 30000 }));
    return NextResponse.json({
      devolucao: { ...result, valor: Number(result.valor) },
      aviso: "Estorno bancário não é automático; só registre após devolver o dinheiro ao cliente.",
    });
  } catch (e) { return apiError(e); }
}
