import { NextResponse } from "next/server";
export function proxy() {
  return NextResponse.next();
}
export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/clientes/:path*",
    "/veiculos/:path*",
    "/servicos/:path*",
    "/comandas/:path*",
    "/agendamentos/:path*",
    "/funcionarios/:path*",
    "/relatorios/:path*",
    "/configuracoes/:path*",
  ],
};
