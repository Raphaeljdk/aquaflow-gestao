import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getServerSession } from "next-auth";
import { compare } from "bcryptjs";
import { createHash } from "node:crypto";
import { prisma } from "./prisma";
import { loginSchema } from "./validations";
import { BusinessError } from "./domain";
export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credenciais",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(raw) {
        if (!process.env.NEXTAUTH_SECRET)
          throw new Error("Configure NEXTAUTH_SECRET.");
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;
        const key = createHash("sha256").update(email).digest("hex");
        const allowed = await prisma.$transaction(async (tx) => {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;
          const record = await tx.loginAttempt.findUnique({ where: { key } });
          if (record && record.expiresAt > new Date() && record.attempts >= 10)
            return false;
          await tx.loginAttempt.upsert({
            where: { key },
            create: {
              key,
              attempts: 1,
              expiresAt: new Date(Date.now() + 15 * 60000),
            },
            update:
              record && record.expiresAt > new Date()
                ? { attempts: { increment: 1 } }
                : { attempts: 1, expiresAt: new Date(Date.now() + 15 * 60000) },
          });
          return true;
        });
        if (!allowed) return null;
        const user = await prisma.user.findUnique({ where: { email } });
        const valid = await compare(
          password,
          user?.password ??
            "$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW",
        );
        if (!user || !user.ativo || !valid) return null;
        await prisma.loginAttempt.deleteMany({ where: { key } });
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          funcionarioId: user.funcionarioId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.funcionarioId = user.funcionarioId;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.sub!;
      session.user.role = token.role;
      session.user.funcionarioId = token.funcionarioId;
      return session;
    },
  },
};
export async function currentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new BusinessError("Entre para continuar.", 401);
  const u = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      ativo: true,
      funcionarioId: true,
    },
  });
  if (!u?.ativo) throw new BusinessError("Seu acesso foi desativado.", 401);
  return u;
}
