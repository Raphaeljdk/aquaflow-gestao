import "next-auth";
import "next-auth/jwt";
import type { Role } from "@/types";
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: Role;
      funcionarioId?: string | null;
    };
  }
  interface User {
    role: Role;
    funcionarioId?: string | null;
  }
}
declare module "next-auth/jwt" {
  interface JWT {
    role: Role;
    funcionarioId?: string | null;
  }
}
