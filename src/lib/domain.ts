import type { AppData, Mutation, User, Comanda, Agendamento } from "@/types";
import {
  clienteSchema,
  veiculoSchema,
  servicoSchema,
  funcionarioSchema,
  comandaSchema,
  statusSchema,
  agendamentoSchema,
  configuracaoSchema,
} from "./validations";
import { cents, decimal, dayKey, dateLabel } from "./format";
import { canWrite } from "./permissions";
export class BusinessError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
function recordId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 15) | 64;
  b[8] = (b[8] & 63) | 128;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return (
    h.slice(0, 8) +
    "-" +
    h.slice(8, 12) +
    "-" +
    h.slice(12, 16) +
    "-" +
    h.slice(16, 20) +
    "-" +
    h.slice(20)
  );
}
function need(
  condition: unknown,
  message: string,
  status = 400,
): asserts condition {
  if (!condition) throw new BusinessError(message, status);
}
export const activeStatus = ["AGUARDANDO", "EM_LAVAGEM", "FINALIZADO"];
export function orderTotal(
  items: { preco: number; quantidade: number }[],
  discount: number,
) {
  const subtotal = items.reduce((s, x) => s + cents(x.preco) * x.quantidade, 0);
  need(
    cents(discount) <= subtotal,
    "O desconto não pode ultrapassar o subtotal.",
  );
  return decimal(subtotal - cents(discount));
}
export function applyMutation(
  original: AppData,
  m: Mutation,
  actor: User,
  now = new Date(),
): AppData {
  need(
    canWrite(actor.role, m.entity),
    "Você não tem permissão para esta ação.",
    403,
  );
  const d = structuredClone(original),
    input = m.data ?? {},
    uid = recordId;
  const related = (cid: string, vid: string) => {
    need(
      d.clientes.some((c) => c.id === cid),
      "Cliente não encontrado.",
      404,
    );
    need(
      d.veiculos.some((v) => v.id === vid && v.clienteId === cid),
      "O veículo não pertence ao cliente.",
    );
  };
  const selected = (ids: string[]) =>
    [...new Set(ids)].map((id) => {
      const s = d.servicos.find((s) => s.id === id && s.ativo);
      need(s, "Serviço indisponível.");
      return s;
    });
  const washer = (id?: string | null) => {
    if (!id) return null;
    const f = d.funcionarios.find(
      (f) => f.id === id && f.ativo && f.cargo === "LAVADOR",
    );
    need(f, "Selecione um lavador ativo.");
    return f;
  };
  const makeOrder = (raw: unknown): Comanda => {
    const v = comandaSchema.parse(raw);
    related(v.clienteId, v.veiculoId);
    need(
      !d.comandas.some(
        (o) => o.veiculoId === v.veiculoId && activeStatus.includes(o.status),
      ),
      "Este veículo já está na fila ou aguarda retirada.",
      409,
    );
    const f = washer(v.funcionarioId),
      itens = selected(v.servicoIds).map((s) => ({
        servicoId: s.id,
        nome: s.nome,
        preco: s.preco,
        quantidade: v.quantidades?.[s.id] ?? 1,
      }));
    return {
      id: uid(),
      numero: Math.max(1000, ...d.comandas.map((o) => o.numero)) + 1,
      clienteId: v.clienteId,
      veiculoId: v.veiculoId,
      itens,
      status: "AGUARDANDO",
      desconto: v.desconto,
      total: orderTotal(itens, v.desconto),
      formaPagamento: v.formaPagamento ?? null,
      observacoes: v.observacoes,
      funcionarioId: f?.id ?? null,
      comissao: 0,
      comissaoPercentual: 0,
      createdAt: now.toISOString(),
      finalizadoEm: null,
    };
  };
  if (m.entity === "configuracoes") {
    need(m.method === "PATCH", "Método inválido.");
    d.configuracao = configuracaoSchema.parse(input);
    return d;
  }
  if (m.entity === "comandas") {
    need(
      m.method !== "DELETE",
      "Comandas devem ser canceladas, preservando o histórico.",
    );
    if (m.method === "POST") {
      need(
        actor.role !== "LAVADOR",
        "Apenas atendimento pode abrir comandas.",
        403,
      );
      d.comandas.unshift(makeOrder(input));
      return d;
    }
    const o = d.comandas.find((o) => o.id === m.id);
    need(o, "Comanda não encontrada.", 404);
    const v = statusSchema.parse(input);
    if (actor.role === "LAVADOR") {
      need(
        o.funcionarioId === actor.funcionarioId,
        "Comanda de outro funcionário.",
        403,
      );
      need(
        v.status === "EM_LAVAGEM" &&
          v.funcionarioId === undefined &&
          v.formaPagamento === undefined,
        "O recebimento é feito pelo atendimento.",
        403,
      );
    }
    const transitions: Record<string, string[]> = {
      AGUARDANDO: ["EM_LAVAGEM", "CANCELADO"],
      EM_LAVAGEM: ["FINALIZADO", "CANCELADO"],
      FINALIZADO: ["ENTREGUE"],
      ENTREGUE: [],
      CANCELADO: [],
    };
    need(
      transitions[o.status].includes(v.status),
      "Mudança de status inválida. Atualize a página.",
      409,
    );
    if (o.finalizadoEm) {
      need(
        v.formaPagamento === undefined || v.formaPagamento === o.formaPagamento,
        "O pagamento de uma comanda finalizada não pode ser alterado.",
      );
      need(
        v.funcionarioId === undefined || v.funcionarioId === o.funcionarioId,
        "O responsável de uma comanda finalizada não pode ser alterado.",
      );
    }
    if (v.funcionarioId !== undefined)
      o.funcionarioId = washer(v.funcionarioId)?.id ?? null;
    if (v.formaPagamento) o.formaPagamento = v.formaPagamento;
    if (v.status === "EM_LAVAGEM" || v.status === "FINALIZADO")
      need(washer(o.funcionarioId), "Atribua um lavador antes de iniciar.");
    if (v.status === "FINALIZADO") {
      need(
        o.formaPagamento,
        "Selecione a forma de pagamento antes de finalizar.",
      );
      const f = washer(o.funcionarioId)!;
      o.comissaoPercentual = f.comissao;
      o.comissao = decimal(Math.round((cents(o.total) * f.comissao) / 100));
      o.finalizadoEm = now.toISOString();
    }
    o.status = v.status;
    return d;
  }
  if (m.entity === "agendamentos") {
    need(
      m.method !== "DELETE",
      "Cancele o agendamento para preservar o histórico.",
    );
    if (m.method === "PATCH") {
      const a = d.agendamentos.find((a) => a.id === m.id);
      need(a, "Agendamento não encontrado.", 404);
      need(a.status === "AGENDADO", "Agendamento já processado.", 409);
      if (input.status === "CANCELADO") {
        a.status = "CANCELADO";
        return d;
      }
      need(input.action === "convert", "Ação inválida.");
      need(
        dayKey(a.dataHora) === dayKey(now),
        "Converta o agendamento no dia do atendimento.",
      );
      const o = makeOrder({
        clienteId: a.clienteId,
        veiculoId: a.veiculoId,
        servicoIds: a.servicoIds,
        observacoes: a.observacoes,
        funcionarioId: input.funcionarioId ?? null,
        desconto: 0,
      });
      d.comandas.unshift(o);
      a.status = "CONVERTIDO";
      a.comandaId = o.id;
      return d;
    }
    const v = agendamentoSchema.parse(input);
    related(v.clienteId, v.veiculoId);
    const sv = selected(v.servicoIds),
      start = new Date(v.dataHora),
      end = new Date(
        start.getTime() + sv.reduce((n, s) => n + s.duracaoMin, 0) * 60000,
      );
    need(start > now, "Escolha um horário futuro.");
    const day = Number(dateLabel(start, "i")) % 7,
      local = dateLabel(start, "HH:mm"),
      finish = dateLabel(end, "HH:mm");
    need(
      start.getUTCSeconds() === 0 && start.getUTCMilliseconds() === 0,
      "Selecione um horário sem segundos.",
    );
    need(
      d.configuracao.diasSemana.includes(day),
      "A empresa não funciona neste dia.",
    );
    need(
      local >= d.configuracao.abertura &&
        finish <= d.configuracao.fechamento &&
        dayKey(start) === dayKey(end),
      "O serviço deve caber no horário de funcionamento.",
    );
    const minutes = (h: string) =>
      Number(h.slice(0, 2)) * 60 + Number(h.slice(3));
    need(
      (minutes(local) - minutes(d.configuracao.abertura)) %
        d.configuracao.intervaloMin ===
        0,
      "Selecione um dos horários disponíveis.",
    );
    need(
      !d.agendamentos.some(
        (a) =>
          a.status === "AGENDADO" &&
          start < new Date(a.fim) &&
          end > new Date(a.dataHora),
      ),
      "Este horário já está ocupado. Escolha outro.",
      409,
    );
    const a: Agendamento = {
      ...v,
      id: uid(),
      fim: end.toISOString(),
      status: "AGENDADO",
      comandaId: null,
    };
    d.agendamentos.push(a);
    return d;
  }
  const entity = m.entity,
    collection = d[entity] as { id: string }[];
  const existing = m.id ? collection.find((c) => c.id === m.id) : undefined;
  if (m.method !== "POST") need(existing, "Registro não encontrado.", 404);
  if (m.method === "DELETE") {
    if (entity === "clientes")
      need(
        !d.veiculos.some((x) => x.clienteId === m.id) &&
          !d.comandas.some((x) => x.clienteId === m.id) &&
          !d.agendamentos.some((x) => x.clienteId === m.id),
        "Cliente com veículos ou histórico não pode ser excluído.",
      );
    if (entity === "veiculos")
      need(
        !d.comandas.some((x) => x.veiculoId === m.id) &&
          !d.agendamentos.some((x) => x.veiculoId === m.id),
        "Veículo com histórico não pode ser excluído.",
      );
    if (entity === "servicos") {
      const s = d.servicos.find((s) => s.id === m.id)!;
      s.ativo = false;
      return d;
    }
    if (entity === "funcionarios") {
      const f = d.funcionarios.find((s) => s.id === m.id)!;
      need(
        actor.role === "ADMIN" || !["ADMIN", "GERENTE"].includes(f.cargo),
        "Apenas administrador pode alterar gestores.",
        403,
      );
      need(
        !d.comandas.some(
          (o) =>
            o.funcionarioId === m.id &&
            ["AGUARDANDO", "EM_LAVAGEM"].includes(o.status),
        ),
        "Reatribua ou conclua as comandas antes de desativar.",
      );
      f.ativo = false;
      return d;
    }
    collection.splice(
      collection.findIndex((c) => c.id === m.id),
      1,
    );
    return d;
  }
  let parsed: Record<string, unknown> = {};
  if (entity === "clientes") {
    parsed = clienteSchema.parse(input);
    need(
      !parsed.cpfCnpj ||
        !d.clientes.some((c) => c.id !== m.id && c.cpfCnpj === parsed.cpfCnpj),
      "CPF/CNPJ já cadastrado.",
      409,
    );
    if (!existing) parsed.createdAt = now.toISOString();
  }
  if (entity === "veiculos") {
    parsed = veiculoSchema.parse(input);
    need(
      d.clientes.some((c) => c.id === parsed.clienteId),
      "Cliente não encontrado.",
    );
    need(
      !d.veiculos.some((c) => c.id !== m.id && c.placa === parsed.placa),
      "Placa já cadastrada.",
      409,
    );
    if (
      existing &&
      d.comandas.some(
        (o) => o.veiculoId === m.id && activeStatus.includes(o.status),
      )
    )
      need(
        parsed.clienteId === d.veiculos.find((v) => v.id === m.id)!.clienteId,
        "Não altere o proprietário de um veículo na fila.",
      );
  }
  if (entity === "servicos") parsed = servicoSchema.parse(input);
  if (entity === "funcionarios") {
    const v = funcionarioSchema.parse(input);
    const old = d.funcionarios.find((f) => f.id === m.id);
    need(
      actor.role === "ADMIN" ||
        (!["ADMIN", "GERENTE"].includes(v.cargo) &&
          !["ADMIN", "GERENTE"].includes(old?.cargo ?? "")),
      "Apenas administrador pode alterar gestores.",
      403,
    );
    if (!v.ativo || v.cargo !== "LAVADOR")
      need(
        !d.comandas.some(
          (o) =>
            o.funcionarioId === m.id &&
            ["AGUARDANDO", "EM_LAVAGEM"].includes(o.status),
        ),
        "Conclua as comandas antes de alterar este funcionário.",
      );
    const { password, ...safe } = v;
    void password;
    parsed = safe;
  }
  if (existing) Object.assign(existing, parsed);
  else collection.push({ ...parsed, id: uid() } as { id: string });
  return d;
}
