ALTER TABLE "Comanda" ADD COLUMN "vistoria" JSONB;

UPDATE "Configuracao"
SET "nome" = 'Ducha Elitte'
WHERE "id" = 'empresa' AND "nome" IN ('AquaFlow', 'AquaFlow Lava Rápido');
