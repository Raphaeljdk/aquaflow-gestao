-- Aditiva e compatível com colaboradores existentes.
ALTER TABLE "Funcionario" ADD COLUMN "permissoes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
