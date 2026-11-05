import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { BusinessError } from "@/lib/domain";
import { allowedPages } from "@/lib/permissions";
import { withOperationalDatabase } from "@/lib/saas/operations";
import { gerarPdfComandaOperacional } from "@/lib/comanda-documento";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
  try {
    const user=await currentUser();
    if (!allowedPages[user.role].includes("comandas")) throw new BusinessError("Sem permissão.",403);
    const {id}=await context.params;
    if (!id || id.length>120) throw new BusinessError("Comanda inválida.",400);
    const pdf=await withOperationalDatabase(user, db=>gerarPdfComandaOperacional(db,id));
    return new NextResponse(await pdf.arrayBuffer(), {
      headers:{
        "Content-Type":"application/pdf",
        "Content-Disposition":'attachment; filename="'+pdf.name+'"',
        "Cache-Control":"private, no-store, max-age=0",
        "X-Content-Type-Options":"nosniff",
      },
    });
  }catch(e){return apiError(e)}
}
