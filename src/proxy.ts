import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { allowedPages } from "@/lib/permissions";
export async function proxy(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_DEMO === "true") return NextResponse.next();
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  const path = request.nextUrl.pathname.split("/")[1] || "dashboard";
  if (!token) {
    const url = new URL("/login", request.url);
    return NextResponse.redirect(url);
  }
  if (!allowedPages[token.role]?.includes(path))
    return NextResponse.redirect(new URL("/comandas", request.url));
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
