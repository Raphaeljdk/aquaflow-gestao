import type { Comanda, Status, Veiculo } from "../types";

// O quadro acompanha o filtro escolhido, inclusive comandas já encerradas.
const active: Status[] = ["AGUARDANDO", "EM_LAVAGEM", "FINALIZADO"];
const all: Status[] = [...active, "ENTREGUE", "CANCELADO"];
export function boardStatuses(filter: string): Status[] {
  if (filter === "TODAS") return [...all];
  if (filter === "ATIVAS") return [...active];
  return all.includes(filter as Status) ? [filter as Status] : [...active];
}

// Atendimentos rápidos não possuem registro de veículo na tabela legada.
export function orderVehicleName(
  order: Pick<Comanda, "tipoVeiculo">,
  vehicle?: Pick<Veiculo, "marca" | "modelo">,
): string {
  const registered = [vehicle?.marca, vehicle?.modelo].filter(Boolean).join(" ").trim();
  if (registered) return registered;
  if (order.tipoVeiculo === "MOTO") return "Moto";
  if (order.tipoVeiculo === "CAMINHONETE") return "Caminhonete";
  if (order.tipoVeiculo === "CARRO") return "Carro";
  return "Veículo";
}
