import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { apiError, checkOrigin } from "@/lib/api";
import { withOperationalDatabase } from "@/lib/saas/operations";
import { confirmarEstruturaProdutos, exigirAdminProdutos, produtoCadastroSchema } from "@/lib/produtos";
import { BusinessError } from "@/lib/domain";

type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, context: Context) {
  try {
    checkOrigin(request);
    const user = await currentUser();
    exigirAdminProdutos(user);
    const { id } = await context.params;
    const { estoqueInicial: _estoqueInicial, ...data } = produtoCadastroSchema.parse(await request.json());
    void _estoqueInicial;
    const produto = await withOperationalDatabase(user, db => db.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(642019)`;
      await confirmarEstruturaProdutos(tx);
      const old = await tx.produto.findUnique({ where: { id } });
      if (!old) throw new BusinessError("Produto não encontrado.", 404);
      if (old.nome.toLocaleLowerCase("pt-BR") !== data.nome.toLocaleLowerCase("pt-BR")) {
        const repeated = await tx.produto.findFirst({ where: {
          id: { not: id }, nome: { equals: data.nome, mode: "insensitive" },
        } });
        if (repeated) throw new BusinessError("Já existe outro produto com este nome.", 409);
      }
      return tx.produto.update({ where: { id }, data });
    }, { maxWait: 10000, timeout: 30000 }));
    return NextResponse.json({ produto: { ...produto, preco: Number(produto.preco) } });
  } catch (e) { return apiError(e); }
}
