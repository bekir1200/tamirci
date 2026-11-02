import "server-only";
import { auth } from "@/auth";
import { query } from "@/lib/db";
import type { AppRole } from "@/types/next-auth";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  available: boolean;
};

export class AuthenticationRequiredError extends Error {
  constructor() {
    super("Authentication required");
    this.name = "AuthenticationRequiredError";
  }
}

export class PermissionDeniedError extends Error {
  constructor() {
    super("Permission denied");
    this.name = "PermissionDeniedError";
  }
}

export async function getCurrentUser(allowedRoles?: AppRole[]): Promise<CurrentUser> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new AuthenticationRequiredError();

  const result = await query<{ id: string; full_name: string; email: string; role: AppRole; is_active: boolean; available: boolean }>(
    `SELECT id, full_name, email, role, is_active, available FROM users WHERE id = $1 LIMIT 1`,
    [userId],
  );
  const row = result.rows[0];
  if (!row || !row.is_active) throw new AuthenticationRequiredError();
  if (allowedRoles && !allowedRoles.includes(row.role)) throw new PermissionDeniedError();

  return { id: row.id, name: row.full_name, email: row.email, role: row.role, available: row.available };
}
