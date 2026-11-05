-- Produtos comercializados no lava-rápido, independentes dos insumos de lavagem.
-- Migração aditiva por banco operacional. Não executar no controle central SaaS.
CREATE TYPE "CategoriaProduto" AS ENUM ('BEBIDA', 'ALIMENTO', 'OUTROS');

CREATE TABLE "Produto" (
  "id" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "descricao" TEXT NOT NULL DEFAULT '',
  "categoria" "CategoriaProduto" NOT NULL DEFAULT 'OUTROS',
  "preco" DECIMAL(12,2) NOT NULL,
  "estoque" INTEGER NOT NULL DEFAULT 0,
  "estoqueMinimo" INTEGER NOT NULL DEFAULT 0,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Produto_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Produto_preco_check" CHECK ("preco" > 0),
  CONSTRAINT "Produto_estoque_check" CHECK ("estoque" >= 0 AND "estoqueMinimo" >= 0)
);

CREATE TABLE "ItemProdutoComanda" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "produtoId" TEXT NOT NULL,
  "comandaId" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "preco" DECIMAL(12,2) NOT NULL,
  "quantidade" INTEGER NOT NULL,
  "baixadoEm" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ItemProdutoComanda_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ItemProdutoComanda_quantidade_check" CHECK ("quantidade" > 0)
);

CREATE TABLE "MovimentoProduto" (
  "id" TEXT NOT NULL,
  "produtoId" TEXT NOT NULL,
  "comandaId" TEXT,
  "tipo" TEXT NOT NULL,
  "quantidade" INTEGER NOT NULL,
  "observacao" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MovimentoProduto_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MovimentoProduto_quantidade_check" CHECK ("quantidade" <> 0)
);

CREATE INDEX "Produto_ativo_nome_idx" ON "Produto"("ativo", "nome");
CREATE UNIQUE INDEX "ItemProdutoComanda_requestId_key" ON "ItemProdutoComanda"("requestId");
CREATE INDEX "ItemProdutoComanda_comandaId_idx" ON "ItemProdutoComanda"("comandaId");
CREATE INDEX "ItemProdutoComanda_produtoId_baixadoEm_idx" ON "ItemProdutoComanda"("produtoId", "baixadoEm");
CREATE INDEX "MovimentoProduto_produtoId_createdAt_idx" ON "MovimentoProduto"("produtoId", "createdAt");
CREATE INDEX "MovimentoProduto_comandaId_idx" ON "MovimentoProduto"("comandaId");

ALTER TABLE "ItemProdutoComanda" ADD CONSTRAINT "ItemProdutoComanda_produtoId_fkey"
  FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ItemProdutoComanda" ADD CONSTRAINT "ItemProdutoComanda_comandaId_fkey"
  FOREIGN KEY ("comandaId") REFERENCES "Comanda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MovimentoProduto" ADD CONSTRAINT "MovimentoProduto_produtoId_fkey"
  FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
