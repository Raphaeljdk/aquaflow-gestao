import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { apiError, checkOrigin } from "@/lib/api";
export const dynamic = "force-dynamic";
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePlatformAdmin();
    checkOrigin(request);
    const { id } = await params;
    const input = z.object({ ativo: z.boolean() }).safeParse(await request.json());
    if (!input.success) return NextResponse.json({ error: "Status inválido." }, { status: 400 });
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
    const platformEmail = process.env.PLATFORM_ADMIN_EMAIL?.trim().toLowerCase();
    if (existing.email.toLowerCase() === platformEmail)
      return NextResponse.json({ error: "A conta principal da plataforma não pode ser desativada aqui." }, { status: 403 });
    const updated = await prisma.$transaction(async tx => {
      if (!input.data.ativo && existing.role === "ADMIN" && existing.ativo) {
        const admins = await tx.user.count({ where: { role:"ADMIN", ativo:true } });
        if (admins <= 1) throw new Error("É obrigatório manter um administrador ativo.");
      }
      return tx.user.update({ where: { id }, data: { ativo: input.data.ativo },
        select: { id:true, name:true, email:true, role:true, ativo:true } });
    });
    return NextResponse.json({ usuario: updated });
  } catch (e) {
    if (e instanceof Error && e.message.includes("administrador ativo"))
      return NextResponse.json({ error: e.message }, { status: 409 });
    return apiError(e);
  }
}
