import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { apiError, checkOrigin } from "@/lib/api";
import { withOperationalDatabase } from "@/lib/saas/operations";
import { confirmarEstruturaProdutos, exigirAdminProdutos, produtoCadastroSchema } from "@/lib/produtos";
import { BusinessError } from "@/lib/domain";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await currentUser();
    const produtos = await withOperationalDatabase(user, async (db) => {
      await confirmarEstruturaProdutos(db);
      return db.produto.findMany({
        where: user.role === "ADMIN" ? undefined : { ativo: true },
        orderBy: [{ categoria: "asc" }, { nome: "asc" }],
      });
    });
    return NextResponse.json({
      produtos: produtos.map((p) => ({ ...p, preco: Number(p.preco) })),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) { return apiError(e); }
}

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const user = await currentUser();
    exigirAdminProdutos(user);
    const v = produtoCadastroSchema.parse(await request.json());
    const result = await withOperationalDatabase(user, db => db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(642019)`;
      await confirmarEstruturaProdutos(tx);
      const repetido = await tx.produto.findFirst({
        where: { nome: { equals: v.nome, mode: "insensitive" } },
      });
      if (repetido) throw new BusinessError("Já existe produto com este nome.", 409);
      const { estoqueInicial = 0, ...data } = v;
      const produto = await tx.produto.create({ data: { ...data, estoque: estoqueInicial } });
      if (estoqueInicial)
        await tx.movimentoProduto.create({
          data: { produtoId: produto.id, registradoPorId: user.id, quantidade: estoqueInicial, tipo: "ENTRADA",
            observacao: "Saldo inicial cadastrado pelo administrador" },
        });
      return { ...produto, preco: Number(produto.preco) };
    }, { maxWait: 10000, timeout: 30000 }));
    return NextResponse.json({ produto: result }, { status: 201 });
  } catch (e) { return apiError(e); }
}
