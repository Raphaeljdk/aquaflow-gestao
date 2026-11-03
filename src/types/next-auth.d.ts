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
      tenantId?: string;
      tenantSlug?: string;
      platformOperator?: boolean;
      passwordVersion?: string;
    };
  }
  interface User {
    role: Role;
    funcionarioId?: string | null;
    tenantId?: string;
    tenantSlug?: string;
      platformOperator?: boolean;
      passwordVersion?: string;
  }
}
declare module "next-auth/jwt" {
  interface JWT {
    role: Role;
    funcionarioId?: string | null;
    tenantId?: string;
    tenantSlug?: string;
      platformOperator?: boolean;
      passwordVersion?: string;
  }
}
