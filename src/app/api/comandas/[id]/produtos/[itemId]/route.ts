import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { apiError, checkOrigin } from "@/lib/api";
import { withOperationalDatabase } from "@/lib/saas/operations";
import { confirmarEstruturaProdutos, exigirOperacaoProdutos } from "@/lib/produtos";
import { BusinessError } from "@/lib/domain";

type Context = { params: Promise<{ id: string; itemId: string }> };
export async function DELETE(request: Request, context: Context) {
  try {
    checkOrigin(request);
    const user = await currentUser();
    exigirOperacaoProdutos(user);
    const { id, itemId } = await context.params;
    await withOperationalDatabase(user, db => db.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(642019)`;
      await confirmarEstruturaProdutos(tx);
      const comanda = await tx.comanda.findUnique({ where: { id } });
      if (!comanda || !["AGUARDANDO", "EM_LAVAGEM"].includes(comanda.status))
        throw new BusinessError("A comanda não está aberta para alterações.", 409);
      const item = await tx.itemProdutoComanda.findFirst({ where: { id: itemId, comandaId: id } });
      if (!item) throw new BusinessError("Item não encontrado na comanda.", 404);
      if (item.baixadoEm) throw new BusinessError("Não é possível remover um produto vendido. Registre uma devolução auditada.", 409);
      const total = comanda.total.minus(item.preco.mul(item.quantidade));
      if (total.lessThan(0)) throw new BusinessError("Subtotal da comanda inconsistente.", 409);
      await tx.itemProdutoComanda.delete({ where: { id: itemId } });
      await tx.comanda.update({ where: { id }, data: { total } });
    }, { maxWait: 10000, timeout: 30000 }));
    return NextResponse.json({ ok: true });
  } catch (e) { return apiError(e); }
}
