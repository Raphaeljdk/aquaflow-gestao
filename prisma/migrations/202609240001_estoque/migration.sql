CREATE TABLE "Material" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "unidade" TEXT NOT NULL,
    "quantidade" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "minimo" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "custoUnitario" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Material_nome_key" ON "Material"("nome");
CREATE TABLE "MovimentoEstoque" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "quantidade" DECIMAL(15,3) NOT NULL,
    "observacao" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MovimentoEstoque_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "MovimentoEstoque_materialId_createdAt_idx" ON "MovimentoEstoque"("materialId", "createdAt");
ALTER TABLE "MovimentoEstoque" ADD CONSTRAINT "MovimentoEstoque_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
