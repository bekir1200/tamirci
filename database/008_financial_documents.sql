CREATE TABLE IF NOT EXISTS repair_financials (
  request_id uuid PRIMARY KEY REFERENCES repair_requests(id) ON DELETE CASCADE,
  customer_sale_amount numeric(12, 2) CHECK (customer_sale_amount IS NULL OR customer_sale_amount >= 0),
  technician_cost_amount numeric(12, 2) CHECK (technician_cost_amount IS NULL OR technician_cost_amount >= 0),
  currency char(3) NOT NULL DEFAULT 'TRY' CHECK (currency = 'TRY'),
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS repair_tax_documents (
  id uuid PRIMARY KEY,
  request_id uuid NOT NULL REFERENCES repair_requests(id) ON DELETE CASCADE,
  document_type varchar(24) NOT NULL CHECK (document_type IN ('customer_sale', 'technician_purchase')),
  issuer_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  recipient_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  document_number varchar(80),
  document_date date,
  total_amount numeric(12, 2) NOT NULL CHECK (total_amount >= 0),
  tax_amount numeric(12, 2) CHECK (tax_amount IS NULL OR (tax_amount >= 0 AND tax_amount <= total_amount)),
  document_status varchar(20) NOT NULL DEFAULT 'recorded'
    CHECK (document_status IN ('draft', 'recorded', 'sent', 'accepted', 'rejected', 'cancelled')),
  provider varchar(80),
  provider_document_id varchar(160),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_id, document_type)
);

CREATE INDEX IF NOT EXISTS repair_tax_documents_request_idx
  ON repair_tax_documents (request_id, document_type);
CREATE INDEX IF NOT EXISTS repair_tax_documents_issuer_idx
  ON repair_tax_documents (issuer_user_id, created_at DESC);
