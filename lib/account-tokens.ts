import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { query } from "@/lib/db";

export type TokenPurpose = "password_reset" | "email_verify";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

// Ham token yalnızca e-postada gider; veritabanında yalnızca özeti tutulur.
export async function createAccountToken(userId: string, purpose: TokenPurpose, ttlMinutes: number) {
  const token = `${randomUUID()}.${randomBytes(24).toString("hex")}`;
  // Eski, kullanılmamış tokenlar aynı amaç için geçersiz kılınır.
  await query(`DELETE FROM account_tokens WHERE user_id = $1 AND purpose = $2 AND used_at IS NULL`, [userId, purpose]);
  await query(
    `INSERT INTO account_tokens (token_hash, user_id, purpose, expires_at)
     VALUES ($1, $2, $3, now() + make_interval(mins => $4))`,
    [hashToken(token), userId, purpose, ttlMinutes],
  );
  return token;
}

// Token tek kullanımlıdır; geçerliyse kullanıcı kimliğini döndürür.
export async function consumeAccountToken(token: string, purpose: TokenPurpose): Promise<string | null> {
  const result = await query<{ user_id: string }>(
    `UPDATE account_tokens SET used_at = now()
     WHERE token_hash = $1 AND purpose = $2 AND used_at IS NULL AND expires_at > now()
     RETURNING user_id`,
    [hashToken(token), purpose],
  );
  return result.rows[0]?.user_id ?? null;
}
