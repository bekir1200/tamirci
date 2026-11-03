CREATE TABLE IF NOT EXISTS daily_site_metrics (
  metric_date date PRIMARY KEY,
  visits bigint NOT NULL DEFAULT 0 CHECK (visits >= 0),
  sign_ins bigint NOT NULL DEFAULT 0 CHECK (sign_ins >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
