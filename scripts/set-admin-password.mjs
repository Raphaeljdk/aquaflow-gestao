import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;

if (!process.env.DATABASE_URL || !email || !password || password.length < 12) {
  console.error("Defina DATABASE_URL, ADMIN_EMAIL e ADMIN_PASSWORD (mínimo 12 caracteres).");
  process.exit(1);
}

const prisma = new PrismaClient();
try {
  const admin = await prisma.user.findUnique({ where: { email } });
  if (!admin || admin.role !== "ADMIN" || !admin.ativo) {
    throw new Error("Administrador ativo não encontrado. Execute o seed inicial antes.");
  }
  await prisma.user.update({
    where: { id: admin.id },
    data: { password: await hash(password, 12) },
  });
  console.log("Senha do administrador atualizada.");
} catch (error) {
  console.error(error instanceof Error ? error.message : "Falha ao atualizar a senha.");
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
