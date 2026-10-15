-- Sem perda de registros anteriores: novas operações gravam apenas dados de contato temporários
-- diretamente na comanda ou agendamento, sem criar uma ficha de cliente.
ALTER TABLE "Comanda"
  ADD COLUMN "nomeCliente" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "telefoneCliente" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "placa" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "tipoVeiculo" "TipoVeiculo",
  ALTER COLUMN "clienteId" DROP NOT NULL,
  ALTER COLUMN "veiculoId" DROP NOT NULL;
ALTER TABLE "Agendamento"
  ADD COLUMN "nomeCliente" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "telefoneCliente" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "placa" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "tipoVeiculo" "TipoVeiculo",
  ALTER COLUMN "clienteId" DROP NOT NULL,
  ALTER COLUMN "veiculoId" DROP NOT NULL;
CREATE INDEX "Comanda_placa_status_idx" ON "Comanda"("placa", "status");
