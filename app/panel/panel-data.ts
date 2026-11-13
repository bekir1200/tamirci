// Panel veri dönüşümleri: API yanıtlarını arayüz modellerine çevirir ve olay metinlerini üretir.

export type RequestStatus = "Yeni talep" | "Usta aranıyor" | "Teklif gönderildi" | "Atandı" | "Teşhis yapılıyor" | "Görevli onayında" | "Müşteri onayladı" | "Tamir sürüyor" | "Onay bekliyor" | "Parça bekliyor" | "Teslimata hazır" | "Tamamlandı" | "İptal edildi";
export type RepairRequest = {
  id: string; dbId: string; customer: string; customerPhone?: string; customerEmail?: string; initials: string; device: string; issue: string;
  district: string; created: string; status: RequestStatus; priority: "Normal" | "Acil";
  offerId?: string; offerStatus?: string; statusRaw: string; description?: string; repairNotes?: string; city?: string; imei?: string;
  assignedTechnician?: string; deliveryStatus?: CourierJobStatus; assignedCourierName?: string;
  warrantyStatus?: string; warrantyExpiresOn?: string; warrantyCheckedAt?: string;
  deliveryAddress?: string;
};
export type Technician = {
  id: string; name: string; initials: string; shop: string; district: string; distance: string;
  specialties: string[]; rating: string; jobs: number; available: boolean;
};
export type SentOffer = { offerId: string; requestId: string; technicianId: string; technician: string; status: string; createdAt: string };
export type RepairEvent = {
  id: string; eventType: string; fromStatus?: string; toStatus?: string; actorName?: string;
  technicianName?: string; reference: string; device: string; issue: string; createdAt: string;
};
export type Screen = "dispatch" | "technician" | "courier" | "customer";
export type TechnicianJobStatus = "offer" | "accepted" | "diagnosing" | "review" | "approved" | "repairing" | "approval" | "parts" | "completed" | "declined" | "cancelled" | "offer_closed";
export type CourierJobStatus = "assigned" | "accepted" | "picked_up" | "at_shop" | "returning" | "delivered";
export type Delivery = { id: string; request_id: string; reference: string; device: string; issue: string; request_status: string; delivery_status: CourierJobStatus; courier_name: string; customer_name?: string; customer_phone?: string; city?: string; district?: string; delivery_address?: string; shop_name?: string; shop_address?: string; shop_phone?: string; shop_city?: string; shop_district?: string };
export type Courier = { id: string; full_name: string; city: string; district: string; available: boolean };
export type DeviceCustody = { holder: "Müşteride" | "Kuryede" | "Ustada"; detail: string; kind: "customer" | "courier" | "technician" };

export const statusClass: Record<RequestStatus, string> = {
  "Yeni talep": "status-new", "Usta aranıyor": "status-search", "Teklif gönderildi": "status-offer", "Atandı": "status-assigned",
  "Teşhis yapılıyor": "status-offer", "Görevli onayında": "status-search", "Müşteri onayladı": "status-assigned",
  "Tamir sürüyor": "status-offer", "Onay bekliyor": "status-search", "Parça bekliyor": "status-search", "Teslimata hazır": "status-assigned", "Tamamlandı": "status-assigned", "İptal edildi": "status-new",
};

export function mapRequest(row: Record<string, unknown>): RepairRequest {
  const databaseStatus = String(row.status ?? "new");
  const labels: Record<string, RequestStatus> = { new: "Yeni talep", reviewing: "Usta aranıyor", offered: "Teklif gönderildi", assigned: "Atandı", diagnosing: "Teşhis yapılıyor", quote_review: "Görevli onayında", approved: "Müşteri onayladı", in_repair: "Tamir sürüyor", waiting_customer: "Onay bekliyor", waiting_parts: "Parça bekliyor", ready_for_delivery: "Teslimata hazır", with_courier: "Teslimata hazır", completed: "Tamamlandı", cancelled: "İptal edildi" };
  const status = labels[databaseStatus] ?? "Yeni talep";
  const customer = String(row.customer_name ?? "Müşteri");
  const createdAt = row.created_at ? new Date(String(row.created_at)) : new Date();
  return {
    id: String(row.reference ?? row.id ?? ""), dbId: String(row.id ?? ""), customer,
    customerPhone: row.customer_phone ? String(row.customer_phone) : undefined,
    customerEmail: row.customer_email ? String(row.customer_email) : undefined,
    initials: customer.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toLocaleUpperCase("tr-TR"),
    device: String(row.device ?? ""), issue: String(row.issue ?? ""), district: String(row.district ?? ""),
    created: new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" }).format(createdAt),
    status, priority: row.priority === "urgent" ? "Acil" : "Normal", statusRaw: databaseStatus,
    offerId: row.offer_id ? String(row.offer_id) : undefined,
    offerStatus: row.offer_status ? String(row.offer_status) : undefined,
    description: String(row.description ?? ""), repairNotes: row.repair_notes ? String(row.repair_notes) : undefined, city: String(row.city ?? ""), imei: row.imei ? String(row.imei) : undefined,
    deliveryAddress: row.delivery_address ? String(row.delivery_address) : undefined,
    warrantyStatus: row.warranty_status ? String(row.warranty_status) : undefined, warrantyExpiresOn: row.warranty_expires_on ? String(row.warranty_expires_on) : undefined, warrantyCheckedAt: row.warranty_checked_at ? String(row.warranty_checked_at) : undefined,
    assignedTechnician: row.technician_name ? String(row.technician_name) : undefined,
    deliveryStatus: row.delivery_status ? String(row.delivery_status) as CourierJobStatus : undefined,
    assignedCourierName: row.assigned_courier_name ? String(row.assigned_courier_name) : undefined,
  };
}

export function mapTechnician(row: Record<string, unknown>): Technician {
  const name = String(row.full_name ?? "Usta");
  return {
    id: String(row.id ?? ""), name,
    initials: name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toLocaleUpperCase("tr-TR"),
    shop: String(row.shop_name ?? "Telefon tamir servisi"), district: String(row.district ?? ""), distance: "",
    specialties: Array.isArray(row.specialties) ? row.specialties.map(String) : [],
    rating: "Yeni", jobs: 0, available: Boolean(row.available),
  };
}

export function mapTechnicianJobStatus(request?: RepairRequest): TechnicianJobStatus {
  if (!request) return "offer";
  if (request.statusRaw === "cancelled") return "cancelled";
  if (request.offerStatus === "declined") return "declined";
  if (request.offerStatus === "cancelled") return "offer_closed";
  if (request.offerStatus === "pending") return "offer";
  if (request.statusRaw === "diagnosing") return "diagnosing";
  if (request.statusRaw === "quote_review") return "review";
  if (request.statusRaw === "approved") return "approved";
  if (request.statusRaw === "in_repair") return "repairing";
  if (request.statusRaw === "waiting_customer") return "approval";
  if (request.statusRaw === "waiting_parts") return "parts";
  if (request.statusRaw === "completed" || request.statusRaw === "ready_for_delivery") return "completed";
  return "accepted";
}

export function mapRepairEvent(row: Record<string, unknown>): RepairEvent {
  return {
    id: String(row.id ?? ""), eventType: String(row.event_type ?? ""),
    fromStatus: row.from_status ? String(row.from_status) : undefined,
    toStatus: row.to_status ? String(row.to_status) : undefined,
    actorName: row.actor_name ? String(row.actor_name) : undefined,
    technicianName: row.technician_name ? String(row.technician_name) : undefined,
    reference: String(row.reference ?? ""), device: String(row.device ?? ""),
    issue: String(row.issue ?? ""), createdAt: String(row.created_at ?? ""),
  };
}

export function describeRepairEvent(event: RepairEvent) {
  const actor = event.actorName ?? "Ekip üyesi";
  if (event.eventType === "request_created") return `${actor} talep oluşturdu`;
  if (event.eventType === "offer_sent") return `${actor}, ${event.technicianName ?? "bir ustaya"} için teklif gönderdi`;
  if (event.eventType === "offer_accepted") return `${actor} teklifi kabul etti`;
  if (event.eventType === "offer_declined") return `${actor} teklifi reddetti`;
  if (event.eventType === "offer_cancelled") return `${event.technicianName ?? "Usta"} için bekleyen teklif kapatıldı`;
  if (event.eventType === "warranty_checked") return `${actor} garanti sonucunu kaydetti`;
  if (event.eventType === "repair_note_updated") return `${actor} işlem notunu güncelledi`;
  if (event.eventType === "delivery_address_updated") return `${actor} teslimat adresini güncelledi`;
  if (event.eventType === "status_changed") {
    const statusLabels: Record<string, string> = {
      new: "Yeni", reviewing: "Usta aranıyor", offered: "Teklif gönderildi", assigned: "Ustaya atandı",
      in_repair: "Tamir sürüyor", waiting_customer: "Müşteri onayı bekliyor", waiting_parts: "Parça bekliyor",
      ready_for_delivery: "Teslimata hazır", with_courier: "Kuryede", completed: "Tamamlandı", cancelled: "İptal edildi",
    };
    return `${actor} durumu “${statusLabels[event.toStatus ?? ""] ?? event.toStatus ?? "güncel"}” yaptı`;
  }
  return `${actor} talep üzerinde işlem yaptı`;
}

export function formatRepairEventTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul",
  }).format(date);
}

export function mapCustomerJobStatus(request?: RepairRequest): TechnicianJobStatus {
  if (!request || ["new", "reviewing", "offered"].includes(request.statusRaw)) return "offer";
  if (request.statusRaw === "assigned") return "accepted";
  if (request.statusRaw === "diagnosing") return "diagnosing";
  if (request.statusRaw === "quote_review") return "review";
  if (request.statusRaw === "approved") return "approved";
  if (request.statusRaw === "in_repair") return "repairing";
  if (request.statusRaw === "waiting_customer") return "approval";
  if (request.statusRaw === "waiting_parts") return "parts";
  if (request.statusRaw === "cancelled") return "cancelled";
  return "completed";
}

export function getDeviceCustody(request: RepairRequest): DeviceCustody {
  if (request.deliveryStatus === "delivered") return { holder: "Müşteride", detail: "Cihaz teslim edildi", kind: "customer" };
  if (request.deliveryStatus === "picked_up" || request.deliveryStatus === "returning") return { holder: "Kuryede", detail: request.assignedCourierName ?? "Teslimat sürüyor", kind: "courier" };
  if (request.deliveryStatus === "at_shop") return { holder: "Ustada", detail: request.assignedTechnician ?? "Cihaz serviste", kind: "technician" };
  if (!request.deliveryStatus && ["in_repair", "waiting_customer", "waiting_parts", "ready_for_delivery"].includes(request.statusRaw)) return { holder: "Ustada", detail: request.assignedTechnician ?? "Tamir süreci devam ediyor", kind: "technician" };
  return { holder: "Müşteride", detail: request.deliveryStatus ? "Kurye teslim almayı bekliyor" : "Teslim alma bekleniyor", kind: "customer" };
}
