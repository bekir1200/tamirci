ALTER TABLE repair_requests ADD COLUMN IF NOT EXISTS delivery_address varchar(300);
ALTER TABLE users ADD COLUMN IF NOT EXISTS shop_address varchar(300);
ALTER TABLE users ADD COLUMN IF NOT EXISTS shop_phone varchar(20);
