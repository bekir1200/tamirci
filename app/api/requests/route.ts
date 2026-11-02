import { NextResponse } from "next/server";
import { randomBytes, randomUUID } from "node:crypto";
import { AuthenticationRequiredError, getCurrentUser, PermissionDeniedError } from "@/lib/authorization";
import { query, withTransaction } from "@/lib/db";

export const runtime = "nodejs";

function jsonError(error: unknown) {
  if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: "Giriş yapman gerekiyor." }, { status: 401 });
  if (error instanceof PermissionDeniedError) return NextResponse.json({ error: "Bu işlem için yetkin yok." }, { status: 403 });
  return NextResponse.json({ error: "İşlem şu anda tamamlanamadı. Tekrar dene." }, { status: 500 });
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (user.role === "admin" || user.role === "staff") {
      const result = await query(
        `SELECT r.id, r.reference, r.customer_name, r.customer_phone, r.device, r.issue,
                r.description, r.imei, r.warranty_status, r.warranty_expires_on, r.warranty_checked_at, r.city, r.district, r.status, r.priority, r.created_at,
                r.assigned_technician_id,
                t.full_name AS technician_name,
                d.status AS delivery_status, d.courier_id AS assigned_courier_id,
                c.full_name AS assigned_courier_name
         FROM repair_requests r LEFT JOIN users t ON t.id = r.assigned_technician_id
         LEFT JOIN repair_deliveries d ON d.request_id = r.id
         LEFT JOIN users c ON c.id = d.courier_id
         ORDER BY r.created_at DESC LIMIT 200`,
      );
      return NextResponse.json({ requests: result.rows });
    }
    if (user.role === "technician") {
      const result = await query(
        `SELECT r.id, r.reference, r.customer_name,
                CASE WHEN o.status = 'accepted' THEN r.customer_phone ELSE NULL END AS customer_phone,
                r.device, r.issue, r.description, CASE WHEN o.status = 'accepted' THEN r.imei ELSE NULL END AS imei, r.city, r.district, r.status,
                r.assigned_technician_id, u.full_name AS technician_name,
                d.status AS delivery_status, d.courier_id AS assigned_courier_id,
                c.full_name AS assigned_courier_name,
                o.id AS offer_id, o.status AS offer_status, o.message AS offer_message, o.created_at
         FROM repair_offers o JOIN repair_requests r ON r.id = o.request_id
         JOIN users u ON u.id = o.technician_id
         LEFT JOIN repair_deliveries d ON d.request_id = r.id
         LEFT JOIN users c ON c.id = d.courier_id
         WHERE o.technician_id = $1 AND o.status IN ('pending', 'accepted')
         ORDER BY o.created_at DESC LIMIT 100`,
        [user.id],
      );
      return NextResponse.json({ requests: result.rows });
    }
    if (user.role === "customer") {
      const result = await query(
        `SELECT r.id, r.reference, r.customer_name, r.device, r.issue, r.city, r.district, r.status,
                r.priority, r.description, r.imei, r.created_at, r.updated_at, r.assigned_technician_id,
                t.full_name AS technician_name, d.status AS delivery_status,
                d.courier_id AS assigned_courier_id, c.full_name AS assigned_courier_name
         FROM repair_requests r LEFT JOIN users t ON t.id = r.assigned_technician_id
         LEFT JOIN repair_deliveries d ON d.request_id = r.id
         LEFT JOIN users c ON c.id = d.courier_id
         WHERE r.customer_user_id = $1 ORDER BY r.created_at DESC LIMIT 100`,
        [user.id],
      );
      return NextResponse.json({ requests: result.rows });
    }
    return NextResponse.json({ requests: [] });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser(["customer", "admin", "staff"]);
    const raw: unknown = await request.json();
    if (!raw || typeof raw !== "object") return NextResponse.json({ error: "Talep bilgileri geçersiz." }, { status: 400 });
    const body = raw as Record<string, unknown>;
    const customerName = typeof body.customerName === "string" ? body.customerName.trim() : user.name;
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const device = typeof body.device === "string" ? body.device.trim() : "";
    const issue = typeof body.issue === "string" ? body.issue.trim() : "";
    const city = typeof body.city === "string" ? body.city.trim() : "";
    const district = typeof body.district === "string" ? body.district.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const imei = typeof body.imei === "string" ? body.imei.trim() : "";

    if (imei && !/^\d{15}$/.test(imei)) return NextResponse.json({ error: "IMEI 15 rakamdan oluşmalı." }, { status: 400 });

    if (customerName.length < 2 || customerName.length > 80 || phone.length < 10 || phone.length > 20 ||
        device.length < 2 || device.length > 120 || issue.length < 2 || issue.length > 80 ||
        city.length < 2 || city.length > 50 || district.length < 2 || district.length > 50 || description.length > 500) {
      return NextResponse.json({ error: "Bilgileri kontrol edip tekrar dene." }, { status: 400 });
    }

    const id = randomUUID();
    const reference = `CT-${randomBytes(3).toString("hex").toUpperCase()}`;
    const created = await withTransaction(async (client) => {
      const result = await client.query(
        `INSERT INTO repair_requests
          (id, reference, customer_user_id, customer_name, customer_email, customer_phone, device, issue, description, city, district, imei)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING id, reference, status, created_at`,
        [id, reference, user.role === "customer" ? user.id : null, customerName, user.role === "customer" ? user.email : null, phone, device, issue, description, city, district, imei || null],
      );
      await client.query(
        `INSERT INTO repair_events (request_id, actor_id, event_type, to_status, details)
         VALUES ($1, $2, 'request_created', 'new', $3::jsonb)`,
        [id, user.id, JSON.stringify({ reference })],
      );
      return result.rows[0];
    });
    return NextResponse.json({ request: created }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
