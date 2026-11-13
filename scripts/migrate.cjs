const { loadEnvConfig } = require("@next/env");
const { Pool } = require("pg");
const { readFile } = require("node:fs/promises");
const { resolve } = require("node:path");

async function main() {
  loadEnvConfig(process.cwd());
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL tanımlı değil. `.env.local` veya sunucu ortam değişkenlerine ekleyin.");
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  try {
    for (const file of ["001_core.sql", "002_deliveries.sql", "003_imei.sql", "004_warranty.sql", "005_repair_notes.sql", "006_delivery_addresses.sql", "007_daily_site_metrics.sql", "008_financial_documents.sql", "009_account_security.sql", "010_quote_flow.sql"]) {
      const migration = await readFile(resolve(process.cwd(), "database", file), "utf8");
      await pool.query("BEGIN");
      try {
        await pool.query(migration);
        await pool.query("COMMIT");
      } catch (error) {
        await pool.query("ROLLBACK");
        throw error;
      }
    }
    process.stdout.write("CepTamir veritabanı şeması hazır.\n");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
