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
test("estoque é exclusivo do administrador e preserva histórico", () => {
  const funcionario: User = { ...admin, role: "FUNCIONARIO" };
  assert.throws(() => applyMutation(setup(), { entity: "materiais", method: "POST", data: { nome: "Novo insumo", unidade: "L", minimo: 2, custoUnitario: 10 } }, funcionario, now), /permissão/);
  assert.throws(() => applyMutation(setup(), { entity: "movimentosEstoque", method: "POST", data: { materialId: "m1", tipo: "SAIDA", quantidade: 1 } }, funcionario, now), /permissão/);
  const moved = applyMutation(setup(), { entity: "movimentosEstoque", method: "POST", data: { materialId: "m1", tipo: "SAIDA", quantidade: 1 } }, admin, now);
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
test("funcionário opera clientes, comandas e agendamentos", () => {
  const funcionario: User = {
    ...admin,
    role: "FUNCIONARIO",
    funcionarioId: "f2",
  };
  const d = create();
  const started = applyMutation(
    d,
    {
      entity: "comandas",
      method: "PATCH",
      id: d.comandas[0].id,
      data: { status: "EM_LAVAGEM", funcionarioId: "f2" },
    },
    funcionario,
    now,
  );
  const paid = applyMutation(
    started,
    {
      entity: "comandas",
      method: "PATCH",
      id: started.comandas[0].id,
      data: {
        status: "FINALIZADO",
        funcionarioId: "f2",
        formaPagamento: "PIX",
      },
    },
    funcionario,
    now,
  );
  assert.equal(paid.comandas[0].formaPagamento, "PIX");
  assert.equal(paid.comandas[0].pagoEm, now.toISOString());
  assert.throws(
    () =>
      applyMutation(
        setup(),
        { entity: "servicos", method: "POST", data: {} },
        funcionario,
        now,
      ),
    /permissão/,
  );
  assert.throws(
    () =>
      applyMutation(
        setup(),
        {
          entity: "configuracoes",
          method: "PATCH",
          data: { ...setup().configuracao },
        },
        funcionario,
        now,
      ),
    /permissão/,
  );
});

test("pagamento novo aceita somente PIX ou cartão", () => {
  const d = transition(create(), "EM_LAVAGEM");
  assert.throws(
    () => transition(d, "FINALIZADO", { formaPagamento: "DINHEIRO" }),
    /PIX ou Cartão/,
  );
  assert.equal(
    transition(d, "FINALIZADO", { formaPagamento: "CREDITO" }).comandas[0]
      .formaPagamento,
    "CREDITO",
  );
});

test("funcionário não administra usuários", () => {
  const funcionario: User = { ...admin, role: "FUNCIONARIO" };
  assert.throws(
    () =>
      applyMutation(
        setup(),
        {
          entity: "funcionarios",
          method: "POST",
          data: {
            nome: "Novo Administrador",
            email: "gestor@example.com",
            cargo: "ADMIN",
            comissao: 0,
            ativo: true,
          },
        },
        funcionario,
        now,
      ),
    /permissão/,
  );
});

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

test("o cliente entra no histórico somente após entrega, sem ficha prévia", () => {
  const initial = setup();
  initial.clientes = [];
  initial.veiculos = [];
  initial.comandas = [{
    id: "quick-1", numero: 2450, clienteId: "", veiculoId: "",
    nomeCliente: "Maria Silva", telefoneCliente: "5511999887766",
    placa: "ABC1D23", tipoVeiculo: "CARRO",
    status: "AGUARDANDO", total: 85, desconto: 0, formaPagamento: null,
    observacoes: "", vistoria: null, funcionarioId: "f1",
    comissao: 0, comissaoPercentual: 0, createdAt: now.toISOString(),
    finalizadoEm: null, pagoEm: null,
    itens: [{ servicoId: "s1", nome: "Lavagem completa", preco: 85, quantidade: 1 }],
  }];
  assert.equal(initial.clientes.length, 0);
  const washing = transition(initial, "EM_LAVAGEM");
  const ready = transition(washing, "FINALIZADO", { formaPagamento: "PIX" });
  assert.equal(ready.clientes.length, 0, "lavagem pronta ainda não cria cadastro");
  const delivered = transition(ready, "ENTREGUE");
  assert.equal(delivered.clientes.length, 1);
  assert.equal(delivered.clientes[0].nome, "Maria Silva");
  assert.equal(delivered.clientes[0].telefone, "5511999887766");
  assert.equal(delivered.clientes[0].cpfCnpj, "");
  assert.equal(delivered.veiculos.length, 0, "não criar ficha de veículo");
  assert.equal(delivered.comandas[0].clienteId, delivered.clientes[0].id);
  assert.equal(delivered.comandas[0].placa, "ABC1D23");
  assert.equal(delivered.comandas[0].telefoneCliente, "", "contato sem duplicação");
  assert.equal(initial.clientes.length, 0, "original preservado");

  const repeated = structuredClone(delivered);
  repeated.comandas.unshift({
    ...initial.comandas[0], id: "quick-2", numero: 2451,
    nomeCliente: "maria silva", telefoneCliente: "(11) 99988-7766", placa: "XYZ9X99",
  });
  const finishedAgain = transition(transition(repeated, "EM_LAVAGEM"), "FINALIZADO", { formaPagamento: "PIX" });
  const deliveredAgain = transition(finishedAgain, "ENTREGUE");
  assert.equal(deliveredAgain.clientes.length, 1, "reutiliza mesmo nome e telefone");
  assert.equal(deliveredAgain.comandas[0].clienteId, delivered.clientes[0].id);
});

test("cancelamento não cadastra cliente e mantém registros financeiros seguros", () => {
  const initial = setup();
  initial.clientes = [];
  initial.veiculos = [];
  initial.comandas = [{
    id: "quick-cancel", numero: 2460, clienteId: "", veiculoId: "",
    nomeCliente: "João Teste", telefoneCliente: "5511999887766",
    placa: "ABC1D23", tipoVeiculo: "CARRO",
    status: "AGUARDANDO", total: 45, desconto: 0, formaPagamento: null,
    observacoes: "", vistoria: null, funcionarioId: "f1",
    comissao: 0, comissaoPercentual: 0, createdAt: now.toISOString(),
    finalizadoEm: null, pagoEm: null,
    itens: [{ servicoId: "s2", nome: "Lavagem simples", preco: 45, quantidade: 1 }],
  }];
  const cancelled = transition(initial, "CANCELADO");
  assert.equal(cancelled.clientes.length, 0);
  assert.equal(cancelled.comandas[0].nomeCliente, "");
  assert.equal(cancelled.comandas[0].telefoneCliente, "");
  assert.equal(cancelled.comandas[0].placa, "");
  assert.equal(cancelled.comandas[0].total, 45);
});

test("identificação pode ser complementada depois, sem criar ficha antecipada", () => {
  const d = setup();
  d.clientes = [];
  d.comandas = [{
    id: "o-avulsa", numero: 9100, clienteId: "", veiculoId: "",
    nomeCliente: "", telefoneCliente: "", placa: "ABC1D23", tipoVeiculo: "CARRO",
    status: "AGUARDANDO", total: 50, desconto: 0, formaPagamento: null,
    observacoes: "", vistoria: null, funcionarioId: "f1",
    comissao: 0, comissaoPercentual: 0, createdAt: now.toISOString(),
    finalizadoEm: null, pagoEm: null,
    itens: [{ servicoId: "s1", nome: "Lavagem completa", preco: 50, quantidade: 1 }],
  }];
  const identified = applyMutation(
    d, { entity: "comandas", method: "PATCH", id: "o-avulsa",
      data: { action: "contato", nomeCliente: "Cliente de fora", telefoneCliente: "(11) 98888-7777" } },
    admin, now,
  );
  assert.equal(identified.clientes.length, 0);
  assert.equal(identified.comandas[0].telefoneCliente, "5511988887777");
  assert.equal(d.comandas[0].telefoneCliente, "");
  const finished = transition(transition(identified, "EM_LAVAGEM"), "FINALIZADO", { formaPagamento: "PIX" });
  const delivered = transition(finished, "ENTREGUE");
  assert.equal(delivered.clientes.length, 1);
  assert.equal(delivered.clientes[0].nome, "Cliente de fora");
  assert.throws(() => applyMutation(delivered, {
    entity: "comandas", method: "PATCH", id: "o-avulsa",
    data: { action: "contato", nomeCliente: "Outro", telefoneCliente: "" }
  }, admin, now), /após a entrega/);
});
