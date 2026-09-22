-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'GERENTE', 'ATENDENTE', 'LAVADOR');

-- CreateEnum
CREATE TYPE "TipoVeiculo" AS ENUM ('CARRO', 'MOTO', 'CAMINHONETE');

-- CreateEnum
CREATE TYPE "StatusComanda" AS ENUM ('AGUARDANDO', 'EM_LAVAGEM', 'FINALIZADO', 'ENTREGUE', 'CANCELADO');

-- CreateEnum
CREATE TYPE "FormaPagamento" AS ENUM ('DINHEIRO', 'PIX', 'DEBITO', 'CREDITO');

-- CreateEnum
CREATE TYPE "StatusAgendamento" AS ENUM ('AGENDADO', 'CONVERTIDO', 'CANCELADO');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'ATENDENTE',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "funcionarioId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "email" TEXT NOT NULL DEFAULT '',
    "cpfCnpj" TEXT,
    "endereco" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Veiculo" (
    "id" TEXT NOT NULL,
    "placa" TEXT NOT NULL,
    "marca" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "cor" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "tipo" "TipoVeiculo" NOT NULL DEFAULT 'CARRO',
    "clienteId" TEXT NOT NULL,

    CONSTRAINT "Veiculo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Servico" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT NOT NULL DEFAULT '',
    "preco" DECIMAL(12,2) NOT NULL,
    "duracaoMin" INTEGER NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Servico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Funcionario" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL DEFAULT '',
    "cargo" "Role" NOT NULL DEFAULT 'LAVADOR',
    "comissao" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Funcionario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comanda" (
    "id" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "clienteId" TEXT NOT NULL,
    "veiculoId" TEXT NOT NULL,
    "status" "StatusComanda" NOT NULL DEFAULT 'AGUARDANDO',
    "total" DECIMAL(12,2) NOT NULL,
    "desconto" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "formaPagamento" "FormaPagamento",
    "observacoes" TEXT NOT NULL DEFAULT '',
    "funcionarioId" TEXT,
    "comissao" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "comissaoPercentual" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "finalizadoEm" TIMESTAMP(3),

    CONSTRAINT "Comanda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemComanda" (
    "id" TEXT NOT NULL,
    "comandaId" TEXT NOT NULL,
    "servicoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "preco" DECIMAL(12,2) NOT NULL,
    "quantidade" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ItemComanda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agendamento" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "veiculoId" TEXT NOT NULL,
    "dataHora" TIMESTAMPTZ(3) NOT NULL,
    "fim" TIMESTAMPTZ(3) NOT NULL,
    "status" "StatusAgendamento" NOT NULL DEFAULT 'AGENDADO',
    "observacoes" TEXT NOT NULL DEFAULT '',
    "comandaId" TEXT,

    CONSTRAINT "Agendamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgendamentoServico" (
    "agendamentoId" TEXT NOT NULL,
    "servicoId" TEXT NOT NULL,

    CONSTRAINT "AgendamentoServico_pkey" PRIMARY KEY ("agendamentoId","servicoId")
);

-- CreateTable
CREATE TABLE "Configuracao" (
    "id" TEXT NOT NULL DEFAULT 'empresa',
    "nome" TEXT NOT NULL DEFAULT 'AquaFlow Lava Rápido',
    "cnpj" TEXT NOT NULL DEFAULT '',
    "endereco" TEXT NOT NULL DEFAULT '',
    "telefone" TEXT NOT NULL DEFAULT '',
    "logo" TEXT NOT NULL DEFAULT '',
    "abertura" TEXT NOT NULL DEFAULT '08:00',
    "fechamento" TEXT NOT NULL DEFAULT '18:00',
    "intervaloMin" INTEGER NOT NULL DEFAULT 30,
    "diasSemana" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5, 6]::INTEGER[],
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',

    CONSTRAINT "Configuracao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "key" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_funcionarioId_key" ON "User"("funcionarioId");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_cpfCnpj_key" ON "Cliente"("cpfCnpj");

-- CreateIndex
CREATE INDEX "Cliente_nome_idx" ON "Cliente"("nome");

-- CreateIndex
CREATE INDEX "Cliente_telefone_idx" ON "Cliente"("telefone");

-- CreateIndex
CREATE UNIQUE INDEX "Veiculo_placa_key" ON "Veiculo"("placa");

-- CreateIndex
CREATE INDEX "Veiculo_clienteId_idx" ON "Veiculo"("clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "Comanda_numero_key" ON "Comanda"("numero");

-- CreateIndex
CREATE INDEX "Comanda_createdAt_idx" ON "Comanda"("createdAt");

-- CreateIndex
CREATE INDEX "Comanda_finalizadoEm_idx" ON "Comanda"("finalizadoEm");

-- CreateIndex
CREATE INDEX "Comanda_status_funcionarioId_idx" ON "Comanda"("status", "funcionarioId");

-- CreateIndex
CREATE INDEX "ItemComanda_comandaId_idx" ON "ItemComanda"("comandaId");

-- CreateIndex
CREATE UNIQUE INDEX "Agendamento_comandaId_key" ON "Agendamento"("comandaId");

-- CreateIndex
CREATE INDEX "Agendamento_dataHora_status_idx" ON "Agendamento"("dataHora", "status");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_funcionarioId_fkey" FOREIGN KEY ("funcionarioId") REFERENCES "Funcionario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Veiculo" ADD CONSTRAINT "Veiculo_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comanda" ADD CONSTRAINT "Comanda_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comanda" ADD CONSTRAINT "Comanda_veiculoId_fkey" FOREIGN KEY ("veiculoId") REFERENCES "Veiculo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comanda" ADD CONSTRAINT "Comanda_funcionarioId_fkey" FOREIGN KEY ("funcionarioId") REFERENCES "Funcionario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemComanda" ADD CONSTRAINT "ItemComanda_comandaId_fkey" FOREIGN KEY ("comandaId") REFERENCES "Comanda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemComanda" ADD CONSTRAINT "ItemComanda_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "Servico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_veiculoId_fkey" FOREIGN KEY ("veiculoId") REFERENCES "Veiculo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_comandaId_fkey" FOREIGN KEY ("comandaId") REFERENCES "Comanda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgendamentoServico" ADD CONSTRAINT "AgendamentoServico_agendamentoId_fkey" FOREIGN KEY ("agendamentoId") REFERENCES "Agendamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgendamentoServico" ADD CONSTRAINT "AgendamentoServico_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "Servico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Business invariants (also enforced by domain validation).
CREATE UNIQUE INDEX "Comanda_veiculo_ativo_unique" ON "Comanda" ("veiculoId") WHERE "status" IN ('AGUARDANDO', 'EM_LAVAGEM', 'FINALIZADO');
ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_sem_sobreposicao" EXCLUDE USING gist (tstzrange("dataHora", "fim", '[)') WITH &&) WHERE ("status" = 'AGENDADO');
ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_intervalo_valido" CHECK ("fim" > "dataHora");
ALTER TABLE "Comanda" ADD CONSTRAINT "Comanda_valores_validos" CHECK ("total" >= 0 AND "desconto" >= 0 AND "comissao" >= 0 AND "comissaoPercentual" BETWEEN 0 AND 100);
ALTER TABLE "Comanda" ADD CONSTRAINT "Comanda_pagamento_obrigatorio" CHECK ("status" NOT IN ('FINALIZADO', 'ENTREGUE') OR ("formaPagamento" IS NOT NULL AND "finalizadoEm" IS NOT NULL));
ALTER TABLE "Servico" ADD CONSTRAINT "Servico_valores_validos" CHECK ("preco" > 0 AND "duracaoMin" > 0);
ALTER TABLE "ItemComanda" ADD CONSTRAINT "ItemComanda_valores_validos" CHECK ("quantidade" > 0 AND "preco" > 0);
ALTER TABLE "Funcionario" ADD CONSTRAINT "Funcionario_comissao_valida" CHECK ("comissao" BETWEEN 0 AND 100);
