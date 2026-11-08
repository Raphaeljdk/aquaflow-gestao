import type { Prisma, PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { prisma } from "./prisma";
import type { AppData, Mutation, User, Vistoria } from "@/types";
import { applyMutation, BusinessError } from "./domain";
import { funcionarioSchema, configuracaoSchema } from "./validations";
import { canWrite } from "./permissions";
import { dadosComandaParaPrisma } from "./comanda-persistence";
type DB = Prisma.TransactionClient;
export async function snapshot(db: DB = prisma): Promise<AppData> {
  const [
    clientes,
    veiculos,
    servicos,
    funcionarios,
    orders,
    appointments,
    config,
    materiais,
    movimentosEstoque,
  ] = await Promise.all([
    db.cliente.findMany({ orderBy: { nome: "asc" } }),
    db.veiculo.findMany(),
    db.servico.findMany(),
    db.funcionario.findMany(),
    db.comanda.findMany({
      include: { itens: true, envioWhatsApp: true },
      orderBy: { createdAt: "desc" },
    }),
    db.agendamento.findMany({
      include: { servicos: true },
      orderBy: { dataHora: "asc" },
    }),
    db.configuracao.findUnique({ where: { id: "empresa" } }),
    db.material.findMany({ orderBy: { nome: "asc" } }),
    db.movimentoEstoque.findMany({ orderBy: { createdAt: "desc" } }),
  ]);
  return {
    clientes: clientes.map((c) => ({
      ...c,
      cpfCnpj: c.cpfCnpj ?? "",
      createdAt: c.createdAt.toISOString(),
    })),
    veiculos,
    servicos: servicos.map((s) => ({ ...s, preco: Number(s.preco) })),
    funcionarios: funcionarios.map((f) => ({
      ...f,
      comissao: Number(f.comissao),
    })),
    comandas: orders.map((o) => ({
      ...o,
      total: Number(o.total),
      desconto: Number(o.desconto),
      comissao: Number(o.comissao),
      comissaoPercentual: Number(o.comissaoPercentual),
      createdAt: o.createdAt.toISOString(),
      finalizadoEm: o.finalizadoEm?.toISOString() ?? null,
      pagoEm: o.pagoEm?.toISOString() ?? null,
      whatsappAutorizadoEm: o.whatsappAutorizadoEm?.toISOString() ?? null,
      whatsappAutorizacaoPor: o.whatsappAutorizacaoPor,
      whatsappEnvioStatus: o.envioWhatsApp?.status ?? null,
      whatsappEnvioEm: o.envioWhatsApp?.enviadoEm?.toISOString() ?? null,
      vistoria: (o.vistoria as unknown as Vistoria | null) ?? null,
      itens: o.itens.map((i) => ({
        servicoId: i.servicoId,
        nome: i.nome,
        preco: Number(i.preco),
        quantidade: i.quantidade,
      })),
    })),
    agendamentos: appointments.map((a) => ({
      id: a.id,
      clienteId: a.clienteId,
      veiculoId: a.veiculoId,
      dataHora: a.dataHora.toISOString(),
      fim: a.fim.toISOString(),
      status: a.status,
      observacoes: a.observacoes,
      comandaId: a.comandaId,
      servicoIds: a.servicos.map((s) => s.servicoId),
    })),
    materiais: materiais.map((x) => ({ ...x, unidade: x.unidade as "un" | "L" | "ml" | "kg" | "g", quantidade: Number(x.quantidade), minimo: Number(x.minimo), custoUnitario: Number(x.custoUnitario) })),
    movimentosEstoque: movimentosEstoque.map((x) => ({ ...x, tipo: x.tipo as "ENTRADA" | "SAIDA", quantidade: Number(x.quantidade), createdAt: x.createdAt.toISOString() })),
    configuracao: config ?? {
      nome: "Ducha Elitte",
      cnpj: "",
      endereco: "",
      telefone: "",
      pixChave: "",
      pixRecebimentoChave: "",
      pixRecebimentoAtivo: false,
      whatsappEnvioAutomatico: false,
      logo: "",
      manualVideoUrl: "",
      manualPdfUrl: "",
      abertura: "08:00",
      fechamento: "18:00",
      intervaloMin: 30,
      diasSemana: [1, 2, 3, 4, 5, 6],
      timezone: "America/Sao_Paulo",
    },
  };
}
export function scopeData(d: AppData, u: User): AppData {
  if (u.role === "ADMIN") return d;
  return {
    ...d,
    funcionarios: d.funcionarios.filter((f) => f.ativo),
    materiais: [],
    movimentosEstoque: [],
  };
}
export async function mutate(m: Mutation, actor: User, database: PrismaClient = prisma) {
  // Configuração é um registro único por banco operacional: gravação direta,
  // sem percorrer comandas, clientes, estoque e toda a base em snapshot().
  // No futuro, este prisma deve ser injetado a partir do tenant autorizado.
  if (m.entity === "configuracoes") {
    if (!canWrite(actor.role, "configuracoes"))
      throw new BusinessError("Sem permissão para editar configurações.", 403);
    if (m.method !== "PATCH")
      throw new BusinessError("Método inválido para configurações.", 405);
    const values = configuracaoSchema.parse(m.data);
    const saved = await database.configuracao.upsert({
      where: { id: "empresa" },
      create: { id: "empresa", ...values },
      update: values,
    });
    return { ok: true, configuracao: saved };
  }
  const password =
    m.entity === "funcionarios" && m.method !== "DELETE"
      ? funcionarioSchema.parse(m.data).password
      : undefined;
  const passwordHash = password ? await hash(password, 12) : undefined;
  return database.$transaction(
    async (tx) => {
      // A transaction-wide lock serializes queue, booking and commission operations.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(642019)`;
      const before = await snapshot(tx),
        after = applyMutation(before, m, actor);

      // Baixa mercadorias somente quando a comanda é finalizada, no MESMO
      // commit do pagamento. Bancos antigos sem a migration continuam operando.
      if (m.entity === "comandas" && m.method === "PATCH" &&
          m.data?.status === "FINALIZADO" && m.id) {
        const tables = await tx.$queryRaw<Array<{ nome: string | null }>>`
          SELECT to_regclass('public."ItemProdutoComanda"')::text AS nome
        `;
        if (tables[0]?.nome) {
          const items = await tx.itemProdutoComanda.findMany({
            where: { comandaId: m.id, baixadoEm: null },
          });
          const numero = after.comandas.find(o => o.id === m.id)?.numero;
          for (const item of items) {
            const result = await tx.produto.updateMany({
              where: { id: item.produtoId, estoque: { gte: item.quantidade } },
              data: { estoque: { decrement: item.quantidade } },
            });
            if (result.count !== 1)
              throw new BusinessError("Estoque insuficiente para finalizar a venda de " + item.nome + ".", 409);
            await tx.itemProdutoComanda.update({
              where: { id: item.id }, data: { baixadoEm: new Date() },
            });
            await tx.movimentoProduto.create({
              data: {
                produtoId: item.produtoId, comandaId: m.id,
                registradoPorId: actor.id, tipo: "VENDA",
                quantidade: -item.quantidade,
                observacao: "Venda da comanda #" + (numero ?? m.id),
              },
            });
          }
        }
      }
      for (const x of before.clientes)
        if (!after.clientes.some((y) => y.id === x.id))
          await tx.cliente.delete({ where: { id: x.id } });
      for (const x of before.veiculos)
        if (!after.veiculos.some((y) => y.id === x.id))
          await tx.veiculo.delete({ where: { id: x.id } });
      const changed = <T extends { id: string }>(a: T[], b: T[]) =>
        b.filter(
          (x) =>
            JSON.stringify(x) !== JSON.stringify(a.find((y) => y.id === x.id)),
        );
      for (const c of changed(before.clientes, after.clientes)) {
        const { id, createdAt, ...values } = c;
        const data = { ...values, cpfCnpj: c.cpfCnpj || null };
        await tx.cliente.upsert({
          where: { id },
          create: { id, ...data, createdAt: new Date(createdAt) },
          update: data,
        });
      }
      for (const v of changed(before.veiculos, after.veiculos)) {
        const { id, ...data } = v;
        await tx.veiculo.upsert({
          where: { id },
          create: { id, ...data },
          update: data,
        });
      }
      for (const s of changed(before.servicos, after.servicos)) {
        const { id, ...data } = s;
        await tx.servico.upsert({
          where: { id },
          create: { id, ...data },
          update: data,
        });
      }
      for (const item of changed(before.materiais, after.materiais)) {
        const { id, ...data } = item;
        await tx.material.upsert({ where: { id }, create: { id, ...data }, update: data });
      }
      for (const movement of changed(before.movimentosEstoque, after.movimentosEstoque)) {
        await tx.movimentoEstoque.create({ data: { ...movement, createdAt: new Date(movement.createdAt) } });
      }
      for (const f of changed(before.funcionarios, after.funcionarios)) {
        const { id, ...data } = f;
        await tx.funcionario.upsert({
          where: { id },
          create: { id, ...data },
          update: data,
        });
        const existing = await tx.user.findUnique({
          where: { funcionarioId: id },
        });
        if (existing && !f.email)
          throw new BusinessError(
            "Funcionário com acesso precisa de um e-mail válido.",
          );
        if (existing?.role === "ADMIN" && (f.cargo !== "ADMIN" || !f.ativo)) {
          const admins = await tx.user.count({
            where: { role: "ADMIN", ativo: true },
          });
          if (admins <= 1)
            throw new BusinessError(
              "Mantenha ao menos um administrador ativo.",
            );
        }
        if (existing)
          await tx.user.update({
            where: { id: existing.id },
            data: {
              name: f.nome,
              email: f.email.toLowerCase(),
              role: f.cargo,
              ativo: f.ativo,
              ...(passwordHash ? { password: passwordHash } : {}),
            },
          });
        else if (passwordHash)
          await tx.user.create({
            data: {
              name: f.nome,
              email: f.email.toLowerCase(),
              password: passwordHash,
              role: f.cargo,
              ativo: f.ativo,
              funcionarioId: id,
            },
          });
      }
      // Allow an account password change even when staff fields are unchanged.
      if (
        passwordHash &&
        m.id &&
        !changed(before.funcionarios, after.funcionarios).some(
          (f) => f.id === m.id,
        )
      ) {
        const f = after.funcionarios.find((f) => f.id === m.id)!;
        await tx.user.upsert({
          where: { funcionarioId: f.id },
          create: {
            name: f.nome,
            email: f.email.toLowerCase(),
            password: passwordHash,
            role: f.cargo,
            ativo: f.ativo,
            funcionarioId: f.id,
          },
          update: { password: passwordHash },
        });
      }
      for (const o of changed(before.comandas, after.comandas)) {
        // Nunca espalhar o snapshot inteiro no Prisma: inclui relações de leitura
        // (ex.: envioWhatsApp), que tornam o PATCH inválido ao finalizar.
        const data = dadosComandaParaPrisma(o);
        if (before.comandas.some((x) => x.id === o.id))
          await tx.comanda.update({ where: { id: o.id }, data });
        else
          await tx.comanda.create({
            data: { id: o.id, ...data, itens: { create: o.itens } },
          });
      }
      // Enfileirar somente UMA mensagem no mesmo commit da finalização.
      // Não enviar ao WhatsApp dentro da transação: o cron fará o envio oficial.
      if (m.entity === "comandas" && m.method === "PATCH" &&
          m.data?.status === "FINALIZADO" && m.id &&
          before.configuracao.whatsappEnvioAutomatico === true) {
        const target = after.comandas.find(o=>o.id===m.id);
        if (target?.whatsappAutorizadoEm) {
          await tx.whatsAppEnvio.upsert({
            where: { comandaId:m.id },
            create: { comandaId:m.id, status:"PENDING", solicitadoPorId:actor.id },
            update: {},
          });
        }
      }
      for (const a of changed(before.agendamentos, after.agendamentos)) {
        const { id, servicoIds, ...v } = a;
        const data = {
          ...v,
          dataHora: new Date(v.dataHora),
          fim: new Date(v.fim),
        };
        if (before.agendamentos.some((x) => x.id === id))
          await tx.agendamento.update({ where: { id }, data });
        else
          await tx.agendamento.create({
            data: {
              id,
              ...data,
              servicos: {
                create: servicoIds.map((servicoId) => ({ servicoId })),
              },
            },
          });
      }
      if (m.entity === "configuracoes") {
        const c = after.configuracao;
        await tx.configuracao.upsert({
          where: { id: "empresa" },
          create: { id: "empresa", ...c },
          update: c,
        });
      }
      return { ok: true };
    },
    { maxWait: 10000, timeout: 30000 },
  );
}
