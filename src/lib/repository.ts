import type { Prisma } from "@prisma/client";
import { hash } from "bcryptjs";
import { prisma } from "./prisma";
import type { AppData, Mutation, User } from "@/types";
import { applyMutation, BusinessError } from "./domain";
import { funcionarioSchema } from "./validations";
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
      include: { itens: true },
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
      nome: "AquaFlow",
      cnpj: "",
      endereco: "",
      telefone: "",
      logo: "",
      abertura: "08:00",
      fechamento: "18:00",
      intervaloMin: 30,
      diasSemana: [1, 2, 3, 4, 5, 6],
      timezone: "America/Sao_Paulo",
    },
  };
}
export function scopeData(d: AppData, u: User): AppData {
  if (u.role !== "LAVADOR") return d;
  const orders = d.comandas.filter((o) => o.funcionarioId === u.funcionarioId);
  return {
    ...d,
    comandas: orders,
    clientes: d.clientes.filter((c) =>
      orders.some((o) => o.clienteId === c.id),
    ),
    veiculos: d.veiculos.filter((v) =>
      orders.some((o) => o.veiculoId === v.id),
    ),
    funcionarios: d.funcionarios.filter((f) => f.id === u.funcionarioId),
    agendamentos: [],
    materiais: [],
    movimentosEstoque: [],
  };
}
export async function mutate(m: Mutation, actor: User) {
  const password =
    m.entity === "funcionarios" && m.method !== "DELETE"
      ? funcionarioSchema.parse(m.data).password
      : undefined;
  const passwordHash = password ? await hash(password, 12) : undefined;
  return prisma.$transaction(
    async (tx) => {
      // A transaction-wide lock serializes queue, booking and commission operations.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(642019)`;
      const before = await snapshot(tx),
        after = applyMutation(before, m, actor);
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
        const { id, itens, ...v } = o;
        const data = {
          ...v,
          createdAt: new Date(v.createdAt),
          finalizadoEm: v.finalizadoEm ? new Date(v.finalizadoEm) : null,
        };
        if (before.comandas.some((x) => x.id === id))
          await tx.comanda.update({ where: { id }, data });
        else
          await tx.comanda.create({
            data: { id, ...data, itens: { create: itens } },
          });
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
