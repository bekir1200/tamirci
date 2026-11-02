import { NextResponse } from "next/server";
import { AuthenticationRequiredError, getCurrentUser, PermissionDeniedError } from "@/lib/authorization";
import { withTransaction } from "@/lib/db";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ offerId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const actor = await getCurrentUser(["technician"]);
    const { offerId } = await context.params;
    const body: unknown = await request.json();
    const nextStatus = body && typeof body === "object" ? (body as Record<string, unknown>).status : null;
    if (nextStatus !== "accepted" && nextStatus !== "declined") {
      return NextResponse.json({ error: "Teklif yanıtı kabul veya ret olmalı." }, { status: 400 });
    }

    const result = await withTransaction(async (client) => {
      const selected = await client.query(
        `SELECT o.id, o.request_id, o.status, r.reference, r.status AS request_status,
                r.assigned_technician_id
         FROM repair_offers o JOIN repair_requests r ON r.id = o.request_id
         WHERE o.id = $1 AND o.technician_id = $2 FOR UPDATE OF o, r`,
        [offerId, actor.id],
      );
      const offer = selected.rows[0];
      if (!offer) return { error: "Teklif bulunamadı.", httpStatus: 404 } as const;
      if (offer.status !== "pending") return { error: "Bu teklif daha önce yanıtlanmış.", httpStatus: 409 } as const;
      if (offer.request_status === "cancelled" || offer.request_status === "completed") return { error: "Talep artık açık değil.", httpStatus: 409 } as const;
      if (nextStatus === "accepted" && offer.assigned_technician_id && offer.assigned_technician_id !== actor.id) {
        return { error: "Bu talep başka bir ustaya atanmış.", httpStatus: 409 } as const;
      }

      await client.query(
        `UPDATE repair_offers SET status = $1, responded_at = now() WHERE id = $2`,
        [nextStatus, offerId],
      );
      if (nextStatus === "accepted") {
        await client.query(
          `UPDATE repair_requests SET assigned_technician_id = $1, status = 'assigned', updated_at = now() WHERE id = $2`,
          [actor.id, offer.request_id],
        );
        const cancelled = await client.query(
          `UPDATE repair_offers SET status = 'cancelled', responded_at = now()
           WHERE request_id = $1 AND id <> $2 AND status = 'pending'
           RETURNING id, technician_id`,
          [offer.request_id, offerId],
        );
        for (const cancelledOffer of cancelled.rows) {
          await client.query(
            `INSERT INTO repair_events (request_id, actor_id, event_type, from_status, to_status, details)
             VALUES ($1, $2, 'offer_cancelled', $3, 'assigned', $4::jsonb)`,
            [offer.request_id, actor.id, offer.request_status, JSON.stringify({ offerId: cancelledOffer.id, technicianId: cancelledOffer.technician_id, reason: "another_offer_accepted" })],
          );
        }
      } else {
        const pending = await client.query(
          `SELECT 1 FROM repair_offers WHERE request_id = $1 AND status = 'pending' LIMIT 1`,
          [offer.request_id],
        );
        if (!pending.rowCount) {
          const reopened = await client.query(
            `UPDATE repair_requests SET status = 'reviewing', updated_at = now()
             WHERE id = $1 AND status = 'offered'
             RETURNING status`,
            [offer.request_id],
          );
          if (reopened.rowCount) {
            await client.query(
              `INSERT INTO repair_events (request_id, actor_id, event_type, from_status, to_status)
               VALUES ($1, $2, 'status_changed', 'offered', 'reviewing')`,
              [offer.request_id, actor.id],
            );
          }
        }
      }
      await client.query(
        `INSERT INTO repair_events (request_id, actor_id, event_type, from_status, to_status, details)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
        [offer.request_id, actor.id, `offer_${nextStatus}`, offer.request_status, nextStatus === "accepted" ? "assigned" : offer.request_status, JSON.stringify({ offerId })],
      );
      return { status: nextStatus, reference: offer.reference } as const;
    });

    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.httpStatus });
    return NextResponse.json({ offer: result });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: "Giriş yapman gerekiyor." }, { status: 401 });
    if (error instanceof PermissionDeniedError) return NextResponse.json({ error: "Bu işlem için yetkin yok." }, { status: 403 });
    return NextResponse.json({ error: "Teklif yanıtı kaydedilemedi. Tekrar dene." }, { status: 500 });
  }
}
