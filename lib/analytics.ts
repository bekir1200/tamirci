import "server-only";
import { query } from "@/lib/db";

export async function recordDailyMetric(metric: "visits" | "sign_ins") {
  await query(
    `INSERT INTO daily_site_metrics (metric_date, ${metric})
     VALUES ((now() AT TIME ZONE 'Europe/Istanbul')::date, 1)
     ON CONFLICT (metric_date) DO UPDATE
     SET ${metric} = daily_site_metrics.${metric} + 1, updated_at = now()`,
  );
}
