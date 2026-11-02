const { loadEnvConfig } = require("@next/env");
const { Pool } = require("pg");

async function main() {
  loadEnvConfig(process.cwd());
  const email = process.argv[2]?.trim().toLowerCase();
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL tanımlı değil.");
  if (!email || email.length > 254) throw new Error("Kullanım: npm run db:promote-admin -- hesap@ornek.com");

  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  try {
    const result = await pool.query(
      `UPDATE users SET role = 'admin', updated_at = now()
       WHERE lower(email) = $1 AND is_active = true
       RETURNING full_name, email`,
      [email],
    );
    if (!result.rowCount) throw new Error("Bu e-posta ile aktif bir hesap bulunamadı. Önce kayıt oluşturun.");
    process.stdout.write(`${result.rows[0].email} admin yapıldı.\n`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
