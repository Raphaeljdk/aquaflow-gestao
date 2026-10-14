import test from "node:test";
import assert from "node:assert/strict";
import { boardStatuses, orderVehicleName } from "../src/lib/order-ui";

test("quadro mostra históricos, incluindo entregas e cancelamentos", () => {
  assert.deepEqual(boardStatuses("ATIVAS"), ["AGUARDANDO", "EM_LAVAGEM", "FINALIZADO"]);
  assert.deepEqual(boardStatuses("ENTREGUE"), ["ENTREGUE"]);
  assert.deepEqual(boardStatuses("CANCELADO"), ["CANCELADO"]);
  assert.deepEqual(boardStatuses("TODAS"), [
    "AGUARDANDO", "EM_LAVAGEM", "FINALIZADO", "ENTREGUE", "CANCELADO",
  ]);
});

test("comanda rápida descreve o tipo do veículo sem ficha", () => {
  assert.equal(orderVehicleName({ tipoVeiculo: "MOTO" }), "Moto");
  assert.equal(orderVehicleName({ tipoVeiculo: "CARRO" }), "Carro");
  assert.equal(orderVehicleName({ tipoVeiculo: "CAMINHONETE" }), "Caminhonete");
  assert.equal(orderVehicleName({ tipoVeiculo: null }), "Veículo");
  assert.equal(
    orderVehicleName({ tipoVeiculo: "CARRO" }, { marca: "Fiat", modelo: "Argo" }),
    "Fiat Argo",
  );
});
