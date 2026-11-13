import "server-only";
import { query } from "@/lib/db";

// Her anahtar için zaman penceresinde sayaç tutar. Vercel'de bellek tabanlı sayaç
// birden çok sunucu arasında paylaşılmadığı için veritabanı kullanılır.
export async function consumeRateLimit(key: string, limit: number, windowMinutes: number): Promise<boolean> {
  const result = await query<{ hits: number }>(
    `INSERT INTO rate_limits (key, hits, window_start)
     VALUES ($1, 1, now())
     ON CONFLICT (key) DO UPDATE SET
       hits = CASE WHEN rate_limits.window_start < now() - make_interval(mins => $2::int) THEN 1 ELSE rate_limits.hits + 1 END,
       window_start = CASE WHEN rate_limits.window_start < now() - make_interval(mins => $2::int) THEN now() ELSE rate_limits.window_start END
     RETURNING hits`,
    [key, windowMinutes],
  );
  return result.rows[0].hits <= limit;
}

export async function clearRateLimit(key: string) {
  await query(`DELETE FROM rate_limits WHERE key = $1`, [key]);
}

// İstemci IP'si; Vercel `x-forwarded-for` başlığını ekler.
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}
