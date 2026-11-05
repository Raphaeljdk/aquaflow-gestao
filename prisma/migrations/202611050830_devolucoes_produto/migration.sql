-- Devoluções são compensações financeiras manuais e movimentações de estoque auditáveis.
-- Não apagar vendas históricas nem executar estorno bancário automaticamente.
ALTER TABLE "ItemProdutoComanda" ADD COLUMN "devolvido" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ItemProdutoComanda" ADD CONSTRAINT "ItemProdutoComanda_devolvido_check"
 CHECK ("devolvido" >= 0 AND "devolvido" <= "quantidade");
CREATE TABLE "DevolucaoProduto" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "quantidade" INTEGER NOT NULL,
  "valor" DECIMAL(12,2) NOT NULL,
  "repostoAoEstoque" BOOLEAN NOT NULL DEFAULT false,
  "reembolsoConfirmado" BOOLEAN NOT NULL DEFAULT false,
  "motivo" TEXT NOT NULL,
  "registradoPorId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DevolucaoProduto_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DevolucaoProduto_quantidade_check" CHECK ("quantidade" > 0)
);
CREATE UNIQUE INDEX "DevolucaoProduto_requestId_key" ON "DevolucaoProduto"("requestId");
CREATE INDEX "DevolucaoProduto_itemId_createdAt_idx" ON "DevolucaoProduto"("itemId", "createdAt");
ALTER TABLE "DevolucaoProduto" ADD CONSTRAINT "DevolucaoProduto_itemId_fkey"
 FOREIGN KEY ("itemId") REFERENCES "ItemProdutoComanda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
