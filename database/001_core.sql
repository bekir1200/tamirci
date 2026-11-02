CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY,
  full_name varchar(80) NOT NULL,
  email varchar(254) NOT NULL,
  password_hash text,
  role varchar(20) NOT NULL DEFAULT 'customer'
    CHECK (role IN ('admin', 'staff', 'technician', 'courier', 'customer')),
  shop_name varchar(120),
  city varchar(50),
  district varchar(50),
  specialties text[] NOT NULL DEFAULT '{}',
  available boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_unique ON users (lower(email));

CREATE TABLE IF NOT EXISTS oauth_accounts (
  provider varchar(60) NOT NULL,
  provider_account_id varchar(255) NOT NULL,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, provider_account_id)
);

CREATE INDEX IF NOT EXISTS oauth_accounts_user_id_idx ON oauth_accounts (user_id);

CREATE TABLE IF NOT EXISTS repair_requests (
  id uuid PRIMARY KEY,
  reference varchar(20) NOT NULL UNIQUE,
  customer_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  customer_name varchar(80) NOT NULL,
  customer_email varchar(254),
  customer_phone varchar(20) NOT NULL,
  device varchar(120) NOT NULL,
  issue varchar(80) NOT NULL,
  description varchar(500) NOT NULL DEFAULT '',
  city varchar(50) NOT NULL,
  district varchar(50) NOT NULL,
  status varchar(30) NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'reviewing', 'offered', 'assigned', 'in_repair', 'waiting_customer', 'waiting_parts', 'ready_for_delivery', 'with_courier', 'completed', 'cancelled')),
  priority varchar(10) NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'urgent')),
  assigned_technician_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS repair_requests_status_created_idx ON repair_requests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS repair_requests_customer_idx ON repair_requests (customer_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS repair_requests_assigned_technician_idx ON repair_requests (assigned_technician_id, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS repair_offers (
  id uuid PRIMARY KEY,
  request_id uuid NOT NULL REFERENCES repair_requests(id) ON DELETE CASCADE,
  technician_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  sent_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status varchar(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
  message varchar(500) NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  UNIQUE (request_id, technician_id)
);

CREATE INDEX IF NOT EXISTS repair_offers_technician_status_idx ON repair_offers (technician_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS repair_offers_request_idx ON repair_offers (request_id, created_at DESC);

CREATE TABLE IF NOT EXISTS repair_events (
  id bigserial PRIMARY KEY,
  request_id uuid NOT NULL REFERENCES repair_requests(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  event_type varchar(50) NOT NULL,
  from_status varchar(30),
  to_status varchar(30),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS repair_events_request_idx ON repair_events (request_id, created_at DESC);
