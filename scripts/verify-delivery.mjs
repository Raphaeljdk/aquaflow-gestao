import { PrismaClient } from "@prisma/client";
import { compare, hash } from "bcryptjs";

const databaseUrl =
  process.env.DATABASE_URL ??
  process.env.POSTGRES_PRISMA_URL ??
  process.env.POSTGRES_URL ??
  process.env.NEON_DATABASE_URL;

if (!databaseUrl) {
  console.log("[delivery-check] banco: ignorado (sem variável neste ambiente)");
  process.exit(0);
}

if (process.env.NEXT_PUBLIC_DEMO === "true") {
  throw new Error("[delivery-check] NEXT_PUBLIC_DEMO não pode estar ativo na entrega real.");
}

const prisma = new PrismaClient({
  datasources: { db: { url: databaseUrl } },
  log: ["error"],
});

const expectedMigrations = [
  "202609210001_initial",
  "202609240001_estoque",
  "202609280001_vistoria_comanda",
  "202609280002_hierarquia_pagamentos",
  "202609280003_funcionario_defaults",
];

const fail = (message) => {
  throw new Error("[delivery-check] " + message);
};

try {
  await prisma.$queryRawUnsafe("SELECT 1");
  console.log("[delivery-check] banco: ok");

  const migrations = await prisma.$queryRawUnsafe(
    'SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations"',
  );
  const applied = new Set(
    migrations
      .filter((m) => m.finished_at && !m.rolled_back_at)
      .map((m) => m.migration_name),
  );
  const pending = expectedMigrations.filter((name) => !applied.has(name));
  if (pending.length) fail("migrations pendentes: " + pending.join(", "));
  console.log(
    "[delivery-check] migrations: " +
      expectedMigrations.length +
      "/" +
      expectedMigrations.length +
      " aplicadas",
  );

  const [
    config,
    activeAdmins,
    activeEmployees,
    materialCount,
    movementCount,
    clientCount,
    orderCount,
    appointmentCount,
  ] = await Promise.all([
    prisma.configuracao.findUnique({ where: { id: "empresa" } }),
    prisma.user.findMany({
      where: { role: "ADMIN", ativo: true },
      select: { id: true, email: true, password: true },
    }),
    prisma.user.findMany({
      where: {
        ativo: true,
        role: { in: ["FUNCIONARIO", "GERENTE", "ATENDENTE", "LAVADOR"] },
      },
      select: { id: true, password: true, funcionarioId: true },
    }),
    prisma.material.count(),
    prisma.movimentoEstoque.count(),
    prisma.cliente.count(),
    prisma.comanda.count(),
    prisma.agendamento.count(),
  ]);

  if (!config) fail("configuração da empresa ausente.");
  if (config.timezone !== "America/Sao_Paulo")
    fail("timezone da empresa diferente de America/Sao_Paulo.");
  if (!config.pixChave?.startsWith("data:image/"))
    fail("QR Code PIX real ainda não está configurado.");
  console.log("[delivery-check] PIX QR: configurado");
  console.log("[delivery-check] timezone: America/Sao_Paulo");

  if (!activeAdmins.length) fail("nenhum administrador ativo.");
  if (!activeAdmins.every((u) => /^\$2[aby]\$/.test(u.password)))
    fail("administrador sem hash bcrypt válido.");

  const seedAdminEmail = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const seedAdminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!seedAdminEmail || !seedAdminPassword)
    fail("credenciais de validação do administrador não estão configuradas.");
  const configuredAdmin = activeAdmins.find(
    (u) => u.email.toLowerCase() === seedAdminEmail,
  );
  if (!configuredAdmin)
    fail("administrador configurado para validação não existe ou está inativo.");
  if (!(await compare(seedAdminPassword, configuredAdmin.password)))
    fail("senha configurada para validação do administrador não corresponde ao banco.");
  console.log("[delivery-check] login administrador: credencial validada");

  if (!activeEmployees.length) fail("nenhum usuário funcionário ativo.");
  if (
    !activeEmployees.every(
      (u) => u.funcionarioId && /^\$2[aby]\$/.test(u.password),
    )
  )
    fail("há funcionário ativo sem vínculo ou hash de senha válido.");
  console.log(
    "[delivery-check] usuários: " +
      activeAdmins.length +
      " admin ativo(s), " +
      activeEmployees.length +
      " funcionário(s) ativo(s)",
  );

  await Promise.all([
    prisma.material.findMany({ take: 1 }),
    prisma.movimentoEstoque.findMany({ take: 1 }),
    prisma.cliente.findMany({ take: 1 }),
    prisma.comanda.findMany({ take: 1 }),
    prisma.agendamento.findMany({ take: 1 }),
  ]);
  console.log(
    "[delivery-check] dados atuais: clientes=" +
      clientCount +
      ", comandas=" +
      orderCount +
      ", agendamentos=" +
      appointmentCount +
      ", materiais=" +
      materialCount +
      ", movimentos=" +
      movementCount,
  );

  const rollbackMarker = "__DELIVERY_CHECK_ROLLBACK__";
  try {
    await prisma.$transaction(
      async (tx) => {
        const suffix = Date.now().toString(36);
        const client = await tx.cliente.create({
          data: {
            nome: "Teste de entrega " + suffix,
            telefone: "00000000000",
            email: "",
            endereco: "",
          },
        });
        const vehicle = await tx.veiculo.create({
          data: {
            placa: ("T" + suffix.toUpperCase()).slice(-7).padStart(7, "T"),
            marca: "Teste",
            modelo: "Validação",
            cor: "Preto",
            ano: 2026,
            clienteId: client.id,
          },
        });
        const service = await tx.servico.create({
          data: {
            nome: "Serviço validação " + suffix,
            descricao: "Registro temporário revertido ao final.",
            preco: 1,
            duracaoMin: 30,
          },
        });
        const employee = activeEmployees[0];
        const order = await tx.comanda.create({
          data: {
            clienteId: client.id,
            veiculoId: vehicle.id,
            total: 1,
            desconto: 0,
            funcionarioId: employee.funcionarioId,
            itens: {
              create: {
                servicoId: service.id,
                nome: service.nome,
                preco: 1,
                quantidade: 1,
              },
            },
          },
        });
        await tx.comanda.update({
          where: { id: order.id },
          data: { status: "EM_LAVAGEM" },
        });
        await tx.comanda.update({
          where: { id: order.id },
          data: {
            status: "FINALIZADO",
            formaPagamento: "PIX",
            finalizadoEm: new Date(),
            pagoEm: new Date(),
          },
        });
        await tx.comanda.update({
          where: { id: order.id },
          data: { status: "ENTREGUE" },
        });

        const material = await tx.material.create({
          data: {
            nome: "Material validação " + suffix,
            unidade: "L",
            quantidade: 1,
            minimo: 0,
            custoUnitario: 1,
          },
        });
        await tx.movimentoEstoque.create({
          data: {
            materialId: material.id,
            tipo: "SAIDA",
            quantidade: 0.1,
            observacao: "Validação temporária",
          },
        });

        const start = new Date(Date.UTC(2099, 0, 5, 12, 0, 0));
        await tx.agendamento.create({
          data: {
            clienteId: client.id,
            veiculoId: vehicle.id,
            dataHora: start,
            fim: new Date(start.getTime() + 30 * 60 * 1000),
            observacoes: "Validação temporária",
            servicos: { create: { servicoId: service.id } },
          },
        });

        throw new Error(rollbackMarker);
      },
      { maxWait: 10000, timeout: 30000 },
    );
  } catch (error) {
    if (!(error instanceof Error) || error.message !== rollbackMarker) throw error;
  }
  console.log(
    "[delivery-check] smoke transacional: cliente, veículo, comanda, PIX, estoque e agendamento ok (rollback concluído)",
  );

  console.log("[delivery-check] resultado: APROVADO");
} finally {
  await prisma.$disconnect();
}
