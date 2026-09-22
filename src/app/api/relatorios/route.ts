import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { snapshot } from "@/lib/repository";
import { canManage } from "@/lib/permissions";
import { BusinessError } from "@/lib/domain";
import { apiError } from "@/lib/api";
import { reportRows, csvReport, pdfReport } from "@/lib/reports";
export async function GET(request: Request) {
  try {
    const user = await currentUser();
    if (!canManage(user.role)) throw new BusinessError("Sem permissão.", 403);
    const params = new URL(request.url).searchParams;
    const input = z
      .object({
        inicio: z.string().date(),
        fim: z.string().date(),
        formato: z.enum(["csv", "pdf"]),
      })
      .parse(Object.fromEntries(params));
    if (input.inicio > input.fim) throw new BusinessError("Período inválido.");
    const d = await snapshot(),
      rows = reportRows(d, input.inicio, input.fim),
      body =
        input.formato === "csv"
          ? csvReport(rows)
          : await pdfReport(rows, d.configuracao.nome, input.inicio, input.fim);
    return new Response(body, {
      headers: {
        "Content-Type":
          input.formato === "csv"
            ? "text/csv; charset=utf-8"
            : "application/pdf",
        "Content-Disposition":
          'attachment; filename="aquaflow-relatorio.' + input.formato + '"',
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return apiError(e);
  }
}
