import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const employeePages = new Set(["clientes", "comandas", "agendamentos", "como-usar", "suporte"]);

export async function proxy(request: NextRequest) {
  // SaaS QA must never reach unscoped legacy API endpoints.
  if (process.env.SAAS_QA_MODE === "true" && request.nextUrl.pathname.startsWith("/api/")) {
    const path=request.nextUrl.pathname;
    const allowed=[
      "/api/auth/","/api/snapshot","/api/relatorios","/api/atendimentos-rapidos",
      "/api/clientes","/api/veiculos","/api/servicos","/api/funcionarios",
      "/api/comandas","/api/agendamentos","/api/configuracoes","/api/materiais",
      "/api/movimentosEstoque","/api/chamados","/api/pedidos-agendamento",
      "/api/public/empresa","/api/plataforma/me","/api/plataforma/saas/pilotos",
      "/api/cron/saas-expiry","/api/saas/convites/aceitar","/api/solicitacoes",
    ];
    const approved=allowed.some(prefix=>path===prefix||path.startsWith(prefix+"/"));
    if(!approved)return NextResponse.json({error:"Módulo em homologação para ambiente multiempresa."},{status:503});
    return NextResponse.next();
  }
  if (process.env.NEXT_PUBLIC_DEMO === "true" && process.env.SAAS_QA_MODE !== "true") return NextResponse.next();

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
    "/como-usar/:path*",
    "/suporte/:path*",
    "/api/:path*",
  ],
};
