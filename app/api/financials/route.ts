import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { AuthenticationRequiredError, getCurrentUser, PermissionDeniedError } from "@/lib/authorization";
import { query, withTransaction } from "@/lib/db";

export const runtime = "nodejs";

function errorResponse(error: unknown) {
  if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: "Giriş yapman gerekiyor." }, { status: 401 });
  if (error instanceof PermissionDeniedError) return NextResponse.json({ error: "Bu işlem için yetkin yok." }, { status: 403 });
  return NextResponse.json({ error: "Finans kayıtları şu anda yüklenemedi." }, { status: 500 });
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (user.role === "admin") {
      const result = await query(
        `SELECT d.id, d.request_id, r.reference, r.device, d.document_type,
                d.issuer_user_id, issuer.full_name AS issuer_name,
                d.recipient_user_id, recipient.full_name AS recipient_name,
                d.document_number, d.document_date, d.total_amount, d.tax_amount,
                d.document_status, d.provider, d.provider_document_id, d.created_at,
                f.customer_sale_amount, f.technician_cost_amount
         FROM repair_tax_documents d
         JOIN repair_requests r ON r.id = d.request_id
         LEFT JOIN users issuer ON issuer.id = d.issuer_user_id
         LEFT JOIN users recipient ON recipient.id = d.recipient_user_id
         LEFT JOIN repair_financials f ON f.request_id = r.id
         ORDER BY d.created_at DESC LIMIT 300`,
      );
      return NextResponse.json({ documents: result.rows });
    }
    if (user.role === "technician") {
      const result = await query(
        `SELECT d.id, d.request_id, r.reference, r.device, d.document_number,
                d.document_date, d.total_amount, d.tax_amount, d.document_status, d.created_at
         FROM repair_tax_documents d JOIN repair_requests r ON r.id = d.request_id
         WHERE d.document_type = 'technician_purchase' AND d.issuer_user_id = $1
         ORDER BY d.created_at DESC LIMIT 100`, [user.id],
      );
      return NextResponse.json({ documents: result.rows });
    }
    if (user.role === "customer") {
      const result = await query(
        `SELECT d.id, d.request_id, r.reference, r.device, d.document_number,
                d.document_date, d.total_amount, d.tax_amount, d.document_status, d.created_at
         FROM repair_tax_documents d JOIN repair_requests r ON r.id = d.request_id
         WHERE d.document_type = 'customer_sale' AND d.recipient_user_id = $1
         ORDER BY d.created_at DESC LIMIT 100`, [user.id],
      );
      return NextResponse.json({ documents: result.rows });
    }
    return NextResponse.json({ documents: [] });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    const raw: unknown = await request.json();
    if (!raw || typeof raw !== "object") return NextResponse.json({ error: "Fatura bilgileri geçersiz." }, { status: 400 });
    const body = raw as Record<string, unknown>;
    const requestId = typeof body.requestId === "string" ? body.requestId : "";
    const documentType = body.documentType;
    const documentNumber = typeof body.documentNumber === "string" ? body.documentNumber.trim().slice(0, 80) : "";
    const dateCandidate = typeof body.documentDate === "string" ? body.documentDate : "";
    const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(dateCandidate) ? new Date(`${dateCandidate}T00:00:00.000Z`) : null;
    const documentDate = parsedDate && !Number.isNaN(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === dateCandidate ? dateCandidate : null;
    const totalAmount = Number(body.totalAmount);
    const taxAmount = body.taxAmount === "" || body.taxAmount == null ? null : Number(body.taxAmount);
    const status = typeof body.status === "string" && ["draft", "recorded", "sent", "accepted", "rejected", "cancelled"].includes(body.status) ? body.status : "recorded";
    if (!requestId || !["customer_sale", "technician_purchase"].includes(String(documentType)) || !Number.isFinite(totalAmount) || totalAmount < 0 || totalAmount > 1_000_000_000 || (taxAmount !== null && (!Number.isFinite(taxAmount) || taxAmount < 0 || taxAmount > totalAmount))) {
      return NextResponse.json({ error: "Belge türünü ve tutarları kontrol et." }, { status: 400 });
    }
    if (documentType === "customer_sale" && user.role !== "admin") return NextResponse.json({ error: "Müşteri faturası kaydını yalnızca admin yapabilir." }, { status: 403 });
    if (documentType === "technician_purchase" && !["admin", "technician"].includes(user.role)) return NextResponse.json({ error: "Usta faturası kaydı için yetkin yok." }, { status: 403 });
    if (documentType === "technician_purchase" && user.role === "technician" && status !== "recorded") return NextResponse.json({ error: "Usta faturası yalnızca inceleme için kaydedilebilir." }, { status: 403 });

    const result = await withTransaction(async (client) => {
      const requestResult = await client.query(
        `SELECT id, customer_user_id, assigned_technician_id FROM repair_requests WHERE id = $1 FOR UPDATE`, [requestId],
      );
      const repair = requestResult.rows[0];
      if (!repair) return { error: "İş emri bulunamadı.", status: 404 } as const;
      let issuerUserId: string | null = null;
      let recipientUserId: string | null = null;
      if (documentType === "customer_sale") {
        recipientUserId = repair.customer_user_id;
        if (!recipientUserId) return { error: "Müşteri hesabı bu iş emrine bağlı değil; müşteri faturasını kaydetmeden önce hesabı eşleştir.", status: 409 } as const;
      } else {
        issuerUserId = user.role === "technician" ? user.id : String(repair.assigned_technician_id ?? "") || null;
        if (!issuerUserId) return { error: "İş emrine atanmış usta bulunamadı.", status: 409 } as const;
        if (user.role === "technician" && repair.assigned_technician_id !== user.id) return { error: "Bu iş emri sana ait değil.", status: 403 } as const;
      }
      const id = randomUUID();
      const documentValues = [id, requestId, documentType, issuerUserId, recipientUserId, documentNumber || null, documentDate,
        totalAmount.toFixed(2), taxAmount === null ? null : taxAmount.toFixed(2), status, user.id];
      if (user.role === "admin") {
        await client.query(
          `INSERT INTO repair_tax_documents
             (id, request_id, document_type, issuer_user_id, recipient_user_id,
              document_number, document_date, total_amount, tax_amount, document_status, created_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
           ON CONFLICT (request_id, document_type) DO UPDATE SET
             issuer_user_id = EXCLUDED.issuer_user_id, recipient_user_id = EXCLUDED.recipient_user_id,
             document_number = EXCLUDED.document_number, document_date = EXCLUDED.document_date,
             total_amount = EXCLUDED.total_amount, tax_amount = EXCLUDED.tax_amount,
             document_status = EXCLUDED.document_status, created_by = EXCLUDED.created_by, updated_at = now()`,
          documentValues,
        );
      } else {
        const existing = await client.query(`SELECT id FROM repair_tax_documents WHERE request_id = $1 AND document_type = 'technician_purchase' FOR UPDATE`, [requestId]);
        if (existing.rowCount) return { error: "Bu iş emri için fatura kaydı zaten var. Admin ile iletişime geç.", status: 409 } as const;
        await client.query(
          `INSERT INTO repair_tax_documents
             (id, request_id, document_type, issuer_user_id, recipient_user_id,
              document_number, document_date, total_amount, tax_amount, document_status, created_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'recorded',$10)`,
          [...documentValues.slice(0, 9), user.id],
        );
      }
      await client.query(
        `INSERT INTO repair_financials (request_id, customer_sale_amount, technician_cost_amount, updated_by)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (request_id) DO UPDATE SET
           customer_sale_amount = CASE WHEN $2::numeric IS NULL THEN repair_financials.customer_sale_amount ELSE EXCLUDED.customer_sale_amount END,
           technician_cost_amount = CASE WHEN $3::numeric IS NULL THEN repair_financials.technician_cost_amount ELSE EXCLUDED.technician_cost_amount END,
           updated_by = EXCLUDED.updated_by, updated_at = now()`,
        [requestId, documentType === "customer_sale" ? totalAmount.toFixed(2) : null,
          documentType === "technician_purchase" ? totalAmount.toFixed(2) : null, user.id],
      );
      return { ok: true } as const;
    });
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) { return errorResponse(error); }
}
