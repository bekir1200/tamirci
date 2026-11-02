ALTER TABLE repair_requests ADD COLUMN IF NOT EXISTS warranty_status varchar(20) NOT NULL DEFAULT 'unknown';
ALTER TABLE repair_requests ADD COLUMN IF NOT EXISTS warranty_expires_on date;
ALTER TABLE repair_requests ADD COLUMN IF NOT EXISTS warranty_checked_at timestamptz;
ALTER TABLE repair_requests ADD COLUMN IF NOT EXISTS warranty_checked_by uuid REFERENCES users(id) ON DELETE SET NULL;
