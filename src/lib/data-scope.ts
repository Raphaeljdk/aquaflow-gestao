import type { AppData, User } from "@/types";

export function scopeData(d: AppData, u: User): AppData {
  if (u.role === "ADMIN") return d;
  return {
    ...d,
    funcionarios: d.funcionarios
      .filter((f) => f.ativo && f.cargo !== "ADMIN")
      .map(({ acesso: _acesso, ...f }) => ({ ...f, email: "", comissao: 0 })),
    comandas: d.comandas.map((o) => ({ ...o, comissao: 0, comissaoPercentual: 0 })),
    materiais: [],
    movimentosEstoque: [],
  };
}
