import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks = {
    database: false,
    schema: false,
    nextAuthSecret: Boolean(process.env.NEXTAUTH_SECRET),
    nextAuthUrl: Boolean(process.env.NEXTAUTH_URL),
    demo: process.env.NEXT_PUBLIC_DEMO === "true",
  };

  let error = "";
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    checks.database = true;
    await Promise.all([
      prisma.configuracao.findUnique({ where: { id: "empresa" } }),
      prisma.material.count(),
      prisma.movimentoEstoque.count(),
      prisma.comanda.count(),
      prisma.agendamento.count(),
    ]);
    checks.schema = true;
  } catch (e) {
    error =
      e instanceof Error
        ? e.name
        : "UnknownError";
  }

  return NextResponse.json(
    {
      ok:
        checks.database &&
        checks.schema &&
        checks.nextAuthSecret &&
        checks.nextAuthUrl,
      checks,
      error: error || undefined,
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ?? null,
    },
    {
      status: checks.database && checks.schema ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
