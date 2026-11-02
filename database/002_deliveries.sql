CREATE TABLE IF NOT EXISTS repair_deliveries (
  id uuid PRIMARY KEY,
  request_id uuid NOT NULL UNIQUE REFERENCES repair_requests(id) ON DELETE CASCADE,
  courier_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  assigned_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status varchar(20) NOT NULL DEFAULT 'assigned'
    CHECK (status IN ('assigned', 'accepted', 'picked_up', 'at_shop', 'returning', 'delivered')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS repair_deliveries_courier_status_idx
  ON repair_deliveries (courier_id, status, updated_at DESC);
