import test from "node:test";
import assert from "node:assert/strict";
import { makeDemoData } from "../src/lib/demo-data";
import { applyMutation, orderTotal } from "../src/lib/domain";
import { fromLocal } from "../src/lib/format";
import { csvReport, reportRows } from "../src/lib/reports";
import { clienteSchema, veiculoSchema } from "../src/lib/validations";
import type { User, AppData } from "../src/types";
const now = new Date("2026-09-21T11:00:00Z"),
  admin: User = {
    id: "u1",
    name: "Admin",
    email: "admin@example.com",
    role: "ADMIN",
  };
function setup() {
  const d = makeDemoData(now);
  d.comandas = [];
  d.agendamentos = [];
  return d;
}
const payload = {
  clienteId: "c1",
  veiculoId: "v1",
  servicoIds: ["s1", "s2"],
  funcionarioId: "f1",
  desconto: 10,
};
const create = (d: AppData = setup()) =>
  applyMutation(
    d,
    { entity: "comandas", method: "POST", data: payload },
    admin,
    now,
  );
const transition = (
  d: AppData,
  status: string,
  extra: Record<string, unknown> = {},
) =>
  applyMutation(
    d,
    {
      entity: "comandas",
      method: "PATCH",
      id: d.comandas[0].id,
      data: { status, ...extra },
    },
    admin,
    now,
  );
test("catálogo é fonte do preço; desconto e comissão usam centavos", () => {
  const d = create();
  assert.equal(d.comandas[0].total, 120);
  assert.equal(orderTotal([{ preco: 0.1, quantidade: 3 }], 0.1), 0.2);
  const done = transition(transition(d, "EM_LAVAGEM"), "FINALIZADO", {
    formaPagamento: "PIX",
  });
  assert.equal(done.comandas[0].comissao, 18);
  assert.equal(done.comandas[0].comissaoPercentual, 15);
});
test("não finaliza sem pagamento e não modifica o original", () => {
  const d = transition(create(), "EM_LAVAGEM");
  assert.throws(() => transition(d, "FINALIZADO"), /pagamento/);
  assert.equal(d.comandas[0].status, "EM_LAVAGEM");
});
test("estoque registra entradas e saídas sem permitir saldo negativo", () => {
  const d = setup();
  const add = applyMutation(d, { entity: "movimentosEstoque", method: "POST", data: { materialId: "m2", tipo: "ENTRADA", quantidade: 2.5, observacao: "Compra" } }, admin, now);
  assert.equal(add.materiais.find((x) => x.id === "m2")?.quantidade, 5.5);
  const taken = applyMutation(add, { entity: "movimentosEstoque", method: "POST", data: { materialId: "m2", tipo: "SAIDA", quantidade: 1.25, observacao: "Consumo" } }, admin, now);
  assert.equal(taken.materiais.find((x) => x.id === "m2")?.quantidade, 4.25);
  assert.equal(taken.movimentosEstoque.length, 2);
  assert.throws(() => applyMutation(taken, { entity: "movimentosEstoque", method: "POST", data: { materialId: "m2", tipo: "SAIDA", quantidade: 5 } }, admin, now), /Saldo insuficiente/);
  assert.equal(d.materiais.find((x) => x.id === "m2")?.quantidade, 3);
});
test("estoque restringe cadastro e preserva histórico", () => {
  const atendente: User = { ...admin, role: "ATENDENTE" };
  assert.throws(() => applyMutation(setup(), { entity: "materiais", method: "POST", data: { nome: "Novo insumo", unidade: "L", minimo: 2, custoUnitario: 10 } }, atendente, now), /permissão/);
  const moved = applyMutation(setup(), { entity: "movimentosEstoque", method: "POST", data: { materialId: "m1", tipo: "SAIDA", quantidade: 1 } }, atendente, now);
  assert.throws(() => applyMutation(moved, { entity: "movimentosEstoque", method: "DELETE", id: moved.movimentosEstoque[0].id }, admin, now), /permanentes/);
  const archived = applyMutation(moved, { entity: "materiais", method: "DELETE", id: "m1" }, admin, now);
  assert.equal(archived.movimentosEstoque.length, 1);
  assert.equal(archived.materiais.find((x) => x.id === "m1")?.ativo, false);
});
test("impede duplicidade de veículo ativo, inclusive pronto para retirada", () => {
  const d = create();
  assert.throws(() => create(d), /já está na fila/);
  const done = transition(transition(d, "EM_LAVAGEM"), "FINALIZADO", {
    formaPagamento: "PIX",
  });
  assert.throws(() => create(done), /já está na fila/);
  assert.equal(create(transition(done, "ENTREGUE")).comandas.length, 2);
});
test("desconto maior que subtotal não é aceito", () =>
  assert.throws(
    () =>
      applyMutation(
        setup(),
        {
          entity: "comandas",
          method: "POST",
          data: { ...payload, desconto: 500 },
        },
        admin,
        now,
      ),
    /desconto/,
  ));
test("cliente e veículo precisam corresponder", () =>
  assert.throws(
    () =>
      applyMutation(
        setup(),
        {
          entity: "comandas",
          method: "POST",
          data: { ...payload, clienteId: "c2" },
        },
        admin,
        now,
      ),
    /não pertence/,
  ));
test("não permite pular etapas nem gerar comissão duas vezes", () => {
  const d = create();
  assert.throws(
    () => transition(d, "FINALIZADO", { formaPagamento: "PIX" }),
    /status/,
  );
  const done = transition(transition(d, "EM_LAVAGEM"), "FINALIZADO", {
    formaPagamento: "PIX",
  });
  assert.throws(
    () => transition(done, "FINALIZADO", { formaPagamento: "PIX" }),
    /status/,
  );
});
test("lavador só pode iniciar suas próprias comandas", () => {
  const d = create(),
    lavador: User = { ...admin, role: "LAVADOR", funcionarioId: "f2" };
  assert.throws(
    () =>
      applyMutation(
        d,
        {
          entity: "comandas",
          method: "PATCH",
          id: d.comandas[0].id,
          data: { status: "EM_LAVAGEM" },
        },
        lavador,
        now,
      ),
    /outro funcionário/,
  );
  assert.throws(
    () =>
      applyMutation(
        d,
        { entity: "servicos", method: "POST", data: {} },
        lavador,
        now,
      ),
    /permissão/,
  );
  assert.equal(
    applyMutation(
      d,
      {
        entity: "comandas",
        method: "PATCH",
        id: d.comandas[0].id,
        data: { status: "EM_LAVAGEM" },
      },
      { ...lavador, funcionarioId: "f1" },
      now,
    ).comandas[0].status,
    "EM_LAVAGEM",
  );
});
test("lavador não recebe pagamento nem finaliza", () => {
  const d = transition(create(), "EM_LAVAGEM");
  assert.throws(
    () =>
      applyMutation(
        d,
        {
          entity: "comandas",
          method: "PATCH",
          id: d.comandas[0].id,
          data: { status: "FINALIZADO", formaPagamento: "PIX" },
        },
        { ...admin, role: "LAVADOR", funcionarioId: "f1" },
        now,
      ),
    /recebimento/,
  );
});
test("gerente não pode promover funcionário para administrador", () =>
  assert.throws(
    () =>
      applyMutation(
        setup(),
        {
          entity: "funcionarios",
          method: "POST",
          data: {
            nome: "Gestor",
            email: "gestor@example.com",
            cargo: "ADMIN",
            comissao: 0,
            ativo: true,
          },
        },
        { ...admin, role: "GERENTE" },
        now,
      ),
    /administrador/,
  ));
const booking = {
  clienteId: "c1",
  veiculoId: "v1",
  servicoIds: ["s1"],
  dataHora: fromLocal("2026-09-21T10:00"),
  observacoes: "",
};
const book = (d: AppData, input = booking) =>
  applyMutation(
    d,
    { entity: "agendamentos", method: "POST", data: input },
    admin,
    now,
  );
test("agenda bloqueia sobreposição parcial e permite adjacente", () => {
  const d = book(setup());
  assert.throws(
    () => book(d, { ...booking, dataHora: fromLocal("2026-09-21T10:30") }),
    /ocupado/,
  );
  assert.equal(
    book(d, { ...booking, dataHora: fromLocal("2026-09-21T11:00") })
      .agendamentos.length,
    2,
  );
});
test("agenda rejeita passado, fechamento e dia fechado", () => {
  assert.throws(
    () =>
      book(setup(), { ...booking, dataHora: fromLocal("2026-09-20T10:00") }),
    /futuro/,
  );
  assert.throws(
    () =>
      book(setup(), { ...booking, dataHora: fromLocal("2026-09-21T17:30") }),
    /funcionamento/,
  );
  assert.throws(
    () =>
      book(setup(), { ...booking, dataHora: fromLocal("2026-09-27T10:00") }),
    /não funciona/,
  );
});
test("conversão preserva vínculo e é executada apenas uma vez", () => {
  const d = book(setup()),
    id = d.agendamentos[0].id;
  const converted = applyMutation(
    d,
    {
      entity: "agendamentos",
      method: "PATCH",
      id,
      data: { action: "convert", funcionarioId: "f1" },
    },
    admin,
    now,
  );
  assert.equal(converted.agendamentos[0].comandaId, converted.comandas[0].id);
  assert.throws(
    () =>
      applyMutation(
        converted,
        {
          entity: "agendamentos",
          method: "PATCH",
          id,
          data: { action: "convert" },
        },
        admin,
        now,
      ),
    /processado/,
  );
});
test("não exclui cliente com vínculo e desativa serviço sem apagar histórico", () => {
  assert.throws(
    () =>
      applyMutation(
        setup(),
        { entity: "clientes", method: "DELETE", id: "c1" },
        admin,
        now,
      ),
    /não pode/,
  );
  const d = create();
  const after = applyMutation(
    d,
    { entity: "servicos", method: "DELETE", id: "s1" },
    admin,
    now,
  );
  assert.equal(after.servicos.find((s) => s.id === "s1")?.ativo, false);
  assert.equal(after.comandas[0].itens[0].nome, "Lavagem completa");
});
test("relatório considera recebimento e CSV neutraliza fórmulas", () => {
  let d = transition(transition(create(), "EM_LAVAGEM"), "FINALIZADO", {
    formaPagamento: "PIX",
  });
  d.clientes[0].nome = "=WEBSERVICE(1)";
  const rows = reportRows(d, "2026-09-21", "2026-09-21");
  assert.equal(rows.length, 1);
  assert.match(csvReport(rows), /'=WEBSERVICE/);
  assert.equal(reportRows(d, "2026-09-20", "2026-09-20").length, 0);
});
test("placa é normalizada e telefone validado", () => {
  const v = veiculoSchema.parse({
    clienteId: "c1",
    placa: "abc-1234",
    marca: "Fiat",
    modelo: "Uno",
    cor: "Azul",
    ano: 2020,
    tipo: "CARRO",
  });
  assert.equal(v.placa, "ABC1234");
  assert.equal(
    clienteSchema.safeParse({ nome: "João", telefone: "123" }).success,
    false,
  );
});

test("pagamento e responsável ficam imutáveis após finalizar", () => {
  const done = transition(transition(create(), "EM_LAVAGEM"), "FINALIZADO", {
    formaPagamento: "PIX",
  });
  assert.throws(
    () => transition(done, "ENTREGUE", { formaPagamento: "DINHEIRO" }),
    /pagamento/,
  );
  assert.throws(
    () => transition(done, "ENTREGUE", { funcionarioId: "f2" }),
    /responsável/,
  );
  assert.equal(transition(done, "ENTREGUE").comandas[0].comissao, 18);
});
