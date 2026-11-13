import "server-only";
import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { query, withTransaction } from "@/lib/db";
import type { AppRole } from "@/types/next-auth";

const scrypt = promisify(scryptCallback);

export type LocalAccount = {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  passwordHash: string;
  createdAt: string;
};

type AccountRow = {
  id: string;
  full_name: string;
  email: string;
  password_hash: string | null;
  role: AppRole;
  is_active: boolean;
  created_at: Date;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

async function verifyPassword(password: string, stored: string) {
  const [algorithm, saltHex, keyHex] = stored.split("$");
  if (algorithm !== "scrypt" || !saltHex || !keyHex) return false;

  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(keyHex, "hex");
  const actual = (await scrypt(password, salt, expected.length)) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function mapAccount(row: AccountRow): LocalAccount | null {
  if (!row.password_hash) return null;
  return {
    id: row.id,
    name: row.full_name,
    email: row.email,
    role: row.role,
    passwordHash: row.password_hash,
    createdAt: row.created_at.toISOString(),
  };
}

export async function registerLocalAccount(input: { name: string; email: string; password: string; verified: boolean }) {
  const email = normalizeEmail(input.email);
  const passwordHash = await hashPassword(input.password);
  try {
    const result = await query<AccountRow>(
      `INSERT INTO users (id, full_name, email, password_hash, role, email_verified_at)
       VALUES ($1, $2, $3, $4, 'customer', CASE WHEN $5::boolean THEN now() ELSE NULL END)
       RETURNING id, full_name, email, password_hash, role, is_active, created_at`,
      [randomUUID(), input.name.trim(), email, passwordHash, input.verified],
    );
    const account = mapAccount(result.rows[0]);
    if (!account) throw new Error("Registered account is missing its password hash");
    return { ok: true as const, account };
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      return { ok: false as const, reason: "exists" as const };
    }
    throw error;
  }
}

export type LocalLoginStatus = { status: "ok"; account: LocalAccount } | { status: "unverified" } | { status: "invalid" };

export async function checkLocalLogin(email: string, password: string): Promise<LocalLoginStatus> {
  const result = await query<AccountRow & { email_verified_at: Date | null }>(
    `SELECT id, full_name, email, password_hash, role, is_active, created_at, email_verified_at
     FROM users WHERE lower(email) = $1 LIMIT 1`,
    [normalizeEmail(email)],
  );
  const row = result.rows[0];
  if (!row || !row.is_active || !row.password_hash || !(await verifyPassword(password, row.password_hash))) return { status: "invalid" };
  if (!row.email_verified_at) return { status: "unverified" };
  const account = mapAccount(row);
  return account ? { status: "ok", account } : { status: "invalid" };
}

export async function verifyLocalAccount(email: string, password: string) {
  const result = await checkLocalLogin(email, password);
  return result.status === "ok" ? result.account : null;
}

export async function markEmailVerified(userId: string) {
  await query(`UPDATE users SET email_verified_at = COALESCE(email_verified_at, now()) WHERE id = $1`, [userId]);
}

export async function setAccountPassword(userId: string, password: string) {
  const passwordHash = await hashPassword(password);
  await query(
    `UPDATE users SET password_hash = $2, email_verified_at = COALESCE(email_verified_at, now()) WHERE id = $1 AND password_hash IS NOT NULL`,
    [userId, passwordHash],
  );
}

export async function findActiveAccountByEmail(email: string) {
  const result = await query<{ id: string; email: string; password_hash: string | null }>(
    `SELECT id, email, password_hash FROM users WHERE lower(email) = $1 AND is_active = true LIMIT 1`,
    [normalizeEmail(email)],
  );
  const row = result.rows[0];
  return row?.password_hash ? { id: row.id, email: row.email } : null;
}

export async function findOrCreateOAuthAccount(input: {
  provider: string;
  providerAccountId: string;
  email: string;
  name: string;
  emailVerified: boolean;
}) {
  const email = normalizeEmail(input.email);
  return withTransaction(async (client) => {
    const linked = await client.query<AccountRow>(
      `SELECT u.id, u.full_name, u.email, u.password_hash, u.role, u.is_active, u.created_at
       FROM oauth_accounts a JOIN users u ON u.id = a.user_id
       WHERE a.provider = $1 AND a.provider_account_id = $2 LIMIT 1`,
      [input.provider, input.providerAccountId],
    );
    if (linked.rows[0]) return linked.rows[0].is_active ? linked.rows[0] : null;
    const existing = await client.query<AccountRow>(
      `SELECT id, full_name, email, password_hash, role, is_active, created_at
       FROM users WHERE lower(email) = $1 LIMIT 1 FOR UPDATE`,
      [email],
    );
    let user = existing.rows[0];
    if (user && !input.emailVerified) return null;
    if (user && !user.is_active) return null;
    if (user) await client.query(`UPDATE users SET email_verified_at = COALESCE(email_verified_at, now()) WHERE id = $1`, [user.id]);
    if (!user) {
      const created = await client.query<AccountRow>(
        `INSERT INTO users (id, full_name, email, role, email_verified_at)
         VALUES ($1, $2, $3, 'customer', now())
         RETURNING id, full_name, email, password_hash, role, is_active, created_at`,
        [randomUUID(), input.name.trim().slice(0, 80) || email, email],
      );
      user = created.rows[0];
    }

    const account = await client.query(
      `INSERT INTO oauth_accounts (provider, provider_account_id, user_id)
       VALUES ($1, $2, $3) ON CONFLICT (provider, provider_account_id) DO NOTHING
       RETURNING user_id`,
      [input.provider, input.providerAccountId, user.id],
    );
    if (!account.rowCount) return null;
    return user;
  });
}
