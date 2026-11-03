import { NextResponse } from "next/server";
import { AuthenticationRequiredError, getCurrentUser, PermissionDeniedError } from "@/lib/authorization";
import { withTransaction } from "@/lib/db";
import { deliveryProjection, deliveryStatuses, nextCourierStatus, type DeliveryStatus } from "@/lib/deliveries";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ deliveryId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const actor = await getCurrentUser();
    const { deliveryId } = await context.params;
    const body: unknown = await request.json();
    const nextStatus = body && typeof body === "object" ? (body as Record<string, unknown>).status : null;
    if (typeof nextStatus !== "string" || !deliveryStatuses.includes(nextStatus as DeliveryStatus)) {
      return NextResponse.json({ error: "Geçerli bir teslimat durumu seç." }, { status: 400 });
    }

    const outcome = await withTransaction(async (client) => {
      const selected = await client.query(
        `SELECT d.id, d.request_id, d.courier_id, d.status AS delivery_status, r.status AS request_status, r.assigned_technician_id, r.delivery_address,
                (SELECT shop_address FROM users WHERE id = r.assigned_technician_id) AS shop_address
         FROM repair_deliveries d JOIN repair_requests r ON r.id = d.request_id
         WHERE d.id = $1 FOR UPDATE OF d, r`,
        [deliveryId],
      );
      const delivery = selected.rows[0];
      if (!delivery) return { error: "Teslimat bulunamadı.", status: 404 } as const;
      const isAdmin = actor.role === "admin";
      const isCourier = actor.role === "courier" && delivery.courier_id === actor.id;
      if (!isAdmin && !isCourier) return { error: "Bu teslimat görevine erişim yetkin yok.", status: 403 } as const;

      const current = delivery.delivery_status as DeliveryStatus;
      const target = nextStatus as DeliveryStatus;
      if (current === target) return { error: "Teslimat bu durumda zaten bulunuyor.", status: 409 } as const;
      if (isCourier && nextCourierStatus[current] !== target) {
        return { error: "Kurye yalnızca sıradaki teslimat aşamasına geçebilir." , status: 409 } as const;
      }
      if (current === "delivered") return { error: "Teslimat tamamlandı; durumu değiştirilemez.", status: 409 } as const;
      if (target === "assigned" && current !== "assigned") return { error: "Başlamış görev yeniden atanamaz.", status: 409 } as const;
      if (target === "accepted" && current !== "assigned") return { error: "Kabul aşaması yalnız atanmış görevde kullanılabilir.", status: 409 } as const;
      if (target === "picked_up" && !["assigned", "accepted", "picked_up"].includes(current)) {
        return { error: "Cihaz teslim alınmadan sonraki aşamaya geçilemez.", status: 409 } as const;
      }
      if (target === "picked_up" && (!delivery.delivery_address || !delivery.assigned_technician_id || !delivery.shop_address)) return { error: "Cihaz alınmadan önce müşteri adresi ve atanan ustanın atölye adresi tamamlanmalı.", status: 409 } as const;
      if (target === "at_shop" && !["picked_up", "at_shop"].includes(current)) {
        return { error: "Cihaz teslim alınmadan dükkâna ulaştı olarak işaretlenemez.", status: 409 } as const;
      }
      if (target === "returning" && delivery.request_status !== "ready_for_delivery") {
        return { error: "Cihaz müşteriye ancak tamir hazır olduğunda gönderilebilir.", status: 409 } as const;
      }
      if (target === "returning" && !["at_shop", "returning"].includes(current)) {
        return { error: "Dönüş yolculuğu yalnız dükkâna ulaştıktan sonra başlayabilir.", status: 409 } as const;
      }
      if (target === "delivered" && (current !== "returning" || delivery.request_status !== "ready_for_delivery")) {
        return { error: "Teslimat, hazır cihaz dönüş yolculuğundayken tamamlanabilir.", status: 409 } as const;
      }

      await client.query(
        `UPDATE repair_deliveries SET status = $1, updated_at = now() WHERE id = $2`, [target, deliveryId],
      );
      await client.query(
        `INSERT INTO repair_events (request_id, actor_id, event_type, from_status, to_status, details)
         VALUES ($1, $2, 'delivery_status_changed', $3, $4, $5::jsonb)`,
        [delivery.request_id, actor.id, current, target, JSON.stringify({ deliveryId })],
      );
      if (target === "delivered") {
        await client.query(
          `UPDATE repair_requests SET status = 'completed', updated_at = now() WHERE id = $1`, [delivery.request_id],
        );
        await client.query(
          `INSERT INTO repair_events (request_id, actor_id, event_type, from_status, to_status, details)
           VALUES ($1, $2, 'status_changed', 'ready_for_delivery', 'completed', $3::jsonb)`,
          [delivery.request_id, actor.id, JSON.stringify({ deliveryId, reason: "delivery_completed" })],
        );
      }
      const updated = await client.query(`${deliveryProjection} WHERE d.id = $1`, [deliveryId]);
      return { delivery: updated.rows[0] } as const;
    });
    if ("error" in outcome) return NextResponse.json({ error: outcome.error }, { status: outcome.status });
    return NextResponse.json({ delivery: outcome.delivery });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: "Giriş yapman gerekiyor." }, { status: 401 });
    if (error instanceof PermissionDeniedError) return NextResponse.json({ error: "Bu işlem için yetkin yok." }, { status: 403 });
    return NextResponse.json({ error: "Teslimat durumu güncellenemedi." }, { status: 500 });
  }
}
