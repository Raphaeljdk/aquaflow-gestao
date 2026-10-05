import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const employeePages = new Set(["clientes", "comandas", "agendamentos"]);

export async function proxy(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_DEMO === "true") return NextResponse.next();

  const secret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET;
  if (!secret) {
    const url = new URL("/login", request.url);
    url.searchParams.set("error", "auth-config");
    return NextResponse.redirect(url);
  }

  const token = await getToken({ req: request, secret });

  if (!token) {
    const url = new URL("/login", request.url);
    url.searchParams.set(
      "callbackUrl",
      request.nextUrl.pathname + request.nextUrl.search,
    );
    return NextResponse.redirect(url);
  }

  const page = request.nextUrl.pathname.split("/")[1] || "dashboard";
  if (token.role !== "ADMIN" && !employeePages.has(page)) {
    return NextResponse.redirect(new URL("/clientes", request.url));
  }

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
    "/estoque/:path*",
    "/funcionarios/:path*",
    "/relatorios/:path*",
    "/configuracoes/:path*",
  ],
};
