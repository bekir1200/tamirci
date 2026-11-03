import "server-only";

export const deliveryStatuses = ["assigned", "accepted", "picked_up", "at_shop", "returning", "delivered"] as const;
export type DeliveryStatus = (typeof deliveryStatuses)[number];

export const nextCourierStatus: Partial<Record<DeliveryStatus, DeliveryStatus>> = {
  assigned: "accepted",
  accepted: "picked_up",
  picked_up: "at_shop",
  at_shop: "returning",
  returning: "delivered",
};

export const deliveryProjection = `
  SELECT d.id, d.request_id, r.reference, r.device, r.issue, r.status AS request_status,
         d.status AS delivery_status, d.courier_id, c.full_name AS courier_name,
         r.customer_name, r.customer_phone, r.city, r.district, r.delivery_address,
         t.shop_name, t.shop_address, t.shop_phone, t.city AS shop_city, t.district AS shop_district,
         d.created_at, d.updated_at
  FROM repair_deliveries d
  JOIN repair_requests r ON r.id = d.request_id
  JOIN users c ON c.id = d.courier_id
  LEFT JOIN users t ON t.id = r.assigned_technician_id
`;
