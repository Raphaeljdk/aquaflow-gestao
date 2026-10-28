import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { checkOrigin, apiError } from "@/lib/api";
import { alterarChamadoSchema } from "@/lib/chamados";
import { BusinessError } from "@/lib/domain";

export const dynamic = "force-dynamic";
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const gestor = await requirePlatformAdmin();
    checkOrigin(request);
    if (Number(request.headers.get("content-length") || 0) > 6000)
      throw new BusinessError("Resposta muito grande.", 413);
    const { id } = await params;
    const input = alterarChamadoSchema.parse(await request.json());
    const result = await prisma.$transaction(async (tx) => {
      const atual = await tx.chamadoSuporte.findUnique({ where: { id }, select: { id: true } });
      if (!atual) throw new BusinessError("Chamado não encontrado.",404);
      if (input.resposta) {
        await tx.mensagemChamado.create({data:{
          chamadoId: id, autorId: gestor.id, autorNome: gestor.name, autorTipo: "SUPORTE",
          texto: input.resposta,
        }});
      }
      return tx.chamadoSuporte.update({
        where: { id }, data: {
          ...(input.status ? { status: input.status } : input.resposta ? { status: "AGUARDANDO_CLIENTE" as const } : {}),
          ...(input.resposta ? { ultimaRespostaEm: new Date() } : {}),
        },
        select: { id: true, status: true, updatedAt: true },
      });
    });
    return NextResponse.json({ chamado: result });
  } catch(e) {
    if(e instanceof SyntaxError) return NextResponse.json({error:"Dados inválidos."},{status:400});
    return apiError(e);
  }
}
