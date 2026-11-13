-- Hesap güvenliği: hız sınırı, e-posta doğrulama ve parola sıfırlama tokenları.

CREATE TABLE IF NOT EXISTS rate_limits (
  key text PRIMARY KEY,
  hits integer NOT NULL DEFAULT 0 CHECK (hits >= 0),
  window_start timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at timestamptz;

-- Mevcut hesaplar şifreli giriş ile kullanılıyordu; kilitlenmemeleri için doğrulanmış sayılır.
UPDATE users SET email_verified_at = created_at WHERE email_verified_at IS NULL;

CREATE TABLE IF NOT EXISTS account_tokens (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose text NOT NULL CHECK (purpose IN ('password_reset', 'email_verify')),
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS account_tokens_user_idx ON account_tokens (user_id, purpose);
