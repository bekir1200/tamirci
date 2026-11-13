-- Teşhis, görevli onaylı teklif ve müşteri onayı akışı için yeni talep durumları.
ALTER TABLE repair_requests DROP CONSTRAINT IF EXISTS repair_requests_status_check;
ALTER TABLE repair_requests ADD CONSTRAINT repair_requests_status_check
  CHECK (status IN ('new', 'reviewing', 'offered', 'assigned', 'diagnosing', 'quote_review', 'waiting_customer', 'approved', 'in_repair', 'waiting_parts', 'ready_for_delivery', 'with_courier', 'completed', 'cancelled'));
