import "next-auth";
import "next-auth/jwt";
import type { DefaultSession } from "next-auth";

export type AppRole = "admin" | "staff" | "technician" | "courier" | "customer";

declare module "next-auth" {
  interface User {
    role: AppRole;
  }

  interface Session {
    user: {
      id: string;
      role: AppRole;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: AppRole;
  }
}
