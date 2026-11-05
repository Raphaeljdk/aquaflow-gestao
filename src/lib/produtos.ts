import "server-only";
import { z } from "zod";
import type { PrismaClient, Prisma } from "@prisma/client";
import { BusinessError } from "@/lib/domain";
import type { User } from "@/types";

export const produtoCadastroSchema = z.object({
  nome: z.string().trim().min(2).max(100),
  descricao: z.string().trim().max(300).default(""),
  categoria: z.enum(["BEBIDA", "ALIMENTO", "OUTROS"]),
  preco: z.coerce.number().positive("Informe o preço de venda.").max(100000),
  estoqueMinimo: z.coerce.number().int().min(0).max(1000000).default(0),
  ativo: z.boolean().default(true),
  estoqueInicial: z.coerce.number().int().min(0).max(1000000).optional(),
});
export const movimentoProdutoSchema = z.object({
  quantidade: z.coerce.number().int().min(-1000000).max(1000000)
    .refine((n) => n !== 0, "Informe a quantidade a adicionar ou retirar."),
  observacao: z.string().trim().max(300).default(""),
});
export const itemProdutoSchema = z.object({
  produtoId: z.string().trim().min(1).max(100),
  quantidade: z.coerce.number().int().min(1).max(100),
  requestId: z.string().uuid(),
});

export function exigirAdminProdutos(user: User) {
  if (user.role !== "ADMIN") throw new BusinessError("Apenas administradores podem gerenciar produtos.", 403);
}
export function exigirOperacaoProdutos(user: User) {
  if (!["ADMIN", "FUNCIONARIO", "GERENTE", "ATENDENTE", "LAVADOR"].includes(user.role))
    throw new BusinessError("Sem autorização para movimentar a comanda.", 403);
}

/** Evita quebrar a operação de bancos isolados que ainda não receberam a migration. */
export async function confirmarEstruturaProdutos(db: PrismaClient | Prisma.TransactionClient) {
  const result = await db.$queryRaw<Array<{ produto: string | null; item: string | null }>>`
    SELECT to_regclass('public."Produto"')::text AS produto,
           to_regclass('public."ItemProdutoComanda"')::text AS item
  `;
  if (!result[0]?.produto || !result[0]?.item)
    throw new BusinessError("O catálogo de produtos ainda não foi implantado no banco deste lava-rápido.", 503);
}
export function centavos(valor: number) {
  if (!Number.isFinite(valor) || valor < 0) throw new BusinessError("Valor financeiro inválido.");
  return Math.round(valor * 100);
}
