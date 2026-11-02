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

export async function registerLocalAccount(input: { name: string; email: string; password: string }) {
  const email = normalizeEmail(input.email);
  const passwordHash = await hashPassword(input.password);
  try {
    const result = await query<AccountRow>(
      `INSERT INTO users (id, full_name, email, password_hash, role)
       VALUES ($1, $2, $3, $4, 'customer')
       RETURNING id, full_name, email, password_hash, role, is_active, created_at`,
      [randomUUID(), input.name.trim(), email, passwordHash],
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

export async function verifyLocalAccount(email: string, password: string) {
  const result = await query<AccountRow>(
    `SELECT id, full_name, email, password_hash, role, is_active, created_at
     FROM users WHERE lower(email) = $1 LIMIT 1`,
    [normalizeEmail(email)],
  );
  const row = result.rows[0];
  if (!row || !row.is_active || !row.password_hash || !(await verifyPassword(password, row.password_hash))) return null;
  return mapAccount(row);
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
    if (!user) {
      const created = await client.query<AccountRow>(
        `INSERT INTO users (id, full_name, email, role)
         VALUES ($1, $2, $3, 'customer')
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
