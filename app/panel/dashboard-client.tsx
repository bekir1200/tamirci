"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { CurrentUser } from "@/lib/authorization";
import { phoneModels } from "@/lib/phone-models";
import { WarrantyCheck } from "./warranty-check";
import {
  Activity, ArrowRight, Bell, Check,
  ChevronDown, ChevronLeft, ChevronRight, Clock3, FileText, Filter,
  BatteryCharging, CheckCircle2, ClipboardCheck, Headphones, MapPin, MapPinned,
  Menu, MoreHorizontal, Navigation, PackageCheck, Phone, Plus, Search, Settings2,
  ShieldCheck, Smartphone, SlidersHorizontal, Truck, UserRound, Users, Wrench, X,
} from "lucide-react";

type RequestStatus = "Yeni talep" | "Usta aranıyor" | "Teklif gönderildi" | "Atandı";
type RepairRequest = {
  id: string; dbId: string; customer: string; initials: string; device: string; issue: string;
  district: string; created: string; status: RequestStatus; priority: "Normal" | "Acil";
  offerId?: string; offerStatus?: string; statusRaw: string; description?: string; city?: string; imei?: string;
  assignedTechnician?: string; deliveryStatus?: CourierJobStatus; assignedCourierName?: string;
  warrantyStatus?: string; warrantyExpiresOn?: string; warrantyCheckedAt?: string;
};
type Technician = {
  id: string; name: string; initials: string; shop: string; district: string; distance: string;
  specialties: string[]; rating: string; jobs: number; available: boolean;
};
type SentOffer = { offerId: string; requestId: string; technicianId: string; technician: string; status: string; createdAt: string };
type RepairEvent = {
  id: string; eventType: string; fromStatus?: string; toStatus?: string; actorName?: string;
  technicianName?: string; reference: string; device: string; issue: string; createdAt: string;
};
type Screen = "dispatch" | "technician" | "courier" | "customer";
type TechnicianJobStatus = "offer" | "accepted" | "repairing" | "approval" | "parts" | "completed" | "declined";
type CourierJobStatus = "assigned" | "accepted" | "picked_up" | "at_shop" | "returning" | "delivered";
type Delivery = { id: string; request_id: string; reference: string; device: string; issue: string; request_status: string; delivery_status: CourierJobStatus; courier_name: string };
type Courier = { id: string; full_name: string; city: string; district: string; available: boolean };
type DeviceCustody = { holder: "Müşteride" | "Kuryede" | "Ustada"; detail: string; kind: "customer" | "courier" | "technician" };

const statusClass: Record<RequestStatus, string> = {
  "Yeni talep": "status-new", "Usta aranıyor": "status-search", "Teklif gönderildi": "status-offer", "Atandı": "status-assigned",
};

function mapRequest(row: Record<string, unknown>): RepairRequest {
  const databaseStatus = String(row.status ?? "new");
  const status: RequestStatus = databaseStatus === "offered" ? "Teklif gönderildi" : databaseStatus === "assigned" || databaseStatus === "in_repair" || databaseStatus === "completed" ? "Atandı" : databaseStatus === "reviewing" ? "Usta aranıyor" : "Yeni talep";
  const customer = String(row.customer_name ?? "Müşteri");
  const createdAt = row.created_at ? new Date(String(row.created_at)) : new Date();
  return {
    id: String(row.reference ?? row.id ?? ""), dbId: String(row.id ?? ""), customer,
    initials: customer.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toLocaleUpperCase("tr-TR"),
    device: String(row.device ?? ""), issue: String(row.issue ?? ""), district: String(row.district ?? ""),
    created: new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" }).format(createdAt),
    status, priority: row.priority === "urgent" ? "Acil" : "Normal", statusRaw: databaseStatus,
    offerId: row.offer_id ? String(row.offer_id) : undefined,
    offerStatus: row.offer_status ? String(row.offer_status) : undefined,
    description: String(row.description ?? ""), city: String(row.city ?? ""), imei: row.imei ? String(row.imei) : undefined,
    warrantyStatus: row.warranty_status ? String(row.warranty_status) : undefined, warrantyExpiresOn: row.warranty_expires_on ? String(row.warranty_expires_on) : undefined, warrantyCheckedAt: row.warranty_checked_at ? String(row.warranty_checked_at) : undefined,
    assignedTechnician: row.technician_name ? String(row.technician_name) : undefined,
    deliveryStatus: row.delivery_status ? String(row.delivery_status) as CourierJobStatus : undefined,
    assignedCourierName: row.assigned_courier_name ? String(row.assigned_courier_name) : undefined,
  };
}

function mapTechnician(row: Record<string, unknown>): Technician {
  const name = String(row.full_name ?? "Usta");
  return {
    id: String(row.id ?? ""), name,
    initials: name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toLocaleUpperCase("tr-TR"),
    shop: String(row.shop_name ?? "Telefon tamir servisi"), district: String(row.district ?? ""), distance: "",
    specialties: Array.isArray(row.specialties) ? row.specialties.map(String) : [],
    rating: "Yeni", jobs: 0, available: Boolean(row.available),
  };
}

function mapTechnicianJobStatus(request?: RepairRequest): TechnicianJobStatus {
  if (!request) return "offer";
  if (request.offerStatus === "pending") return "offer";
  if (request.statusRaw === "in_repair") return "repairing";
  if (request.statusRaw === "waiting_customer") return "approval";
  if (request.statusRaw === "waiting_parts") return "parts";
  if (request.statusRaw === "completed" || request.statusRaw === "ready_for_delivery") return "completed";
  return "accepted";
}

function mapRepairEvent(row: Record<string, unknown>): RepairEvent {
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

function describeRepairEvent(event: RepairEvent) {
  const actor = event.actorName ?? "Ekip üyesi";
  if (event.eventType === "request_created") return `${actor} talep oluşturdu`;
  if (event.eventType === "offer_sent") return `${actor}, ${event.technicianName ?? "bir ustaya"} için teklif gönderdi`;
  if (event.eventType === "offer_accepted") return `${actor} teklifi kabul etti`;
  if (event.eventType === "offer_declined") return `${actor} teklifi reddetti`;
  if (event.eventType === "offer_cancelled") return `${event.technicianName ?? "Usta"} için bekleyen teklif kapatıldı`;
  if (event.eventType === "warranty_checked") return `${actor} garanti sonucunu kaydetti`;
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

function formatRepairEventTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul",
  }).format(date);
}

function mapCustomerJobStatus(request?: RepairRequest): TechnicianJobStatus {
  if (!request || ["new", "reviewing", "offered"].includes(request.statusRaw)) return "offer";
  if (request.statusRaw === "assigned") return "accepted";
  if (request.statusRaw === "in_repair") return "repairing";
  if (request.statusRaw === "waiting_customer") return "approval";
  if (request.statusRaw === "waiting_parts") return "parts";
  return "completed";
}

function getDeviceCustody(request: RepairRequest): DeviceCustody {
  if (request.deliveryStatus === "delivered") return { holder: "Müşteride", detail: "Cihaz teslim edildi", kind: "customer" };
  if (request.deliveryStatus === "picked_up" || request.deliveryStatus === "returning") return { holder: "Kuryede", detail: request.assignedCourierName ?? "Teslimat sürüyor", kind: "courier" };
  if (request.deliveryStatus === "at_shop") return { holder: "Ustada", detail: request.assignedTechnician ?? "Cihaz serviste", kind: "technician" };
  if (!request.deliveryStatus && ["in_repair", "waiting_customer", "waiting_parts", "ready_for_delivery"].includes(request.statusRaw)) return { holder: "Ustada", detail: request.assignedTechnician ?? "Tamir süreci devam ediyor", kind: "technician" };
  return { holder: "Müşteride", detail: request.deliveryStatus ? "Kurye teslim almayı bekliyor" : "Teslim alma bekleniyor", kind: "customer" };
}

export default function PanelDashboard({ user }: { user: CurrentUser }) {
  const roleName: Record<CurrentUser["role"], "Görevli" | "Admin" | "Usta" | "Kurye" | "Müşteri"> = { admin: "Admin", staff: "Görevli", technician: "Usta", courier: "Kurye", customer: "Müşteri" };
  const role = roleName[user.role];
  const initialScreen: Screen = user.role === "technician" ? "technician" : user.role === "courier" ? "courier" : user.role === "customer" ? "customer" : "dispatch";
  const [requests, setRequests] = useState<RepairRequest[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Tüm talepler");
  const [screen] = useState<Screen>(initialScreen);
  const [technicianJobStatus, setTechnicianJobStatus] = useState<TechnicianJobStatus>("offer");
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [deliveryLoading, setDeliveryLoading] = useState(screen === "courier");
  const [deliveryError, setDeliveryError] = useState("");
  const [deliveryPending, setDeliveryPending] = useState(false);
  const [courierId, setCourierId] = useState("");
  const [selectedDeliveryId, setSelectedDeliveryId] = useState("");
  const [eventHistory, setEventHistory] = useState<RepairEvent[]>([]);
  const [recentActivity, setRecentActivity] = useState<RepairEvent[]>([]);
  const [technicianAvailable, setTechnicianAvailable] = useState(user.available);
  const [notice, setNotice] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [tab, setTab] = useState<"Uygun ustalar" | "Teklif geçmişi">("Uygun ustalar");
  const [sentOffers, setSentOffers] = useState<SentOffer[]>([]);
  const selected = requests.find((request) => request.id === selectedId) ?? requests[0];

  useEffect(() => {
    let active = true;
    async function loadData() {
      try {
        const [requestResponse, technicianResponse, activityResponse] = await Promise.all([
          fetch("/api/requests", { cache: "no-store" }),
          screen === "dispatch" ? fetch("/api/technicians", { cache: "no-store" }) : Promise.resolve(null),
          screen === "dispatch" ? fetch("/api/activity", { cache: "no-store" }) : Promise.resolve(null),
        ]);
        const requestData = requestResponse.ok ? await requestResponse.json() as { requests?: Record<string, unknown>[] } : null;
        if (!active) return;
        const mapped = (requestData?.requests ?? []).map(mapRequest);
        setRequests(mapped);
        setSelectedId((current) => current || mapped[0]?.id || "");
        if (screen === "technician") setTechnicianJobStatus(mapTechnicianJobStatus(mapped[0]));
        if (technicianResponse?.ok) {
          const data = await technicianResponse.json() as { technicians?: Record<string, unknown>[] };
          if (active) setTechnicians((data.technicians ?? []).map(mapTechnician));
        }
        if (activityResponse?.ok) {
          const data = await activityResponse.json() as { events?: Record<string, unknown>[] };
          if (active) setRecentActivity((data.events ?? []).map(mapRepairEvent));
        }
      } catch {
        if (active) setNotice("Bilgiler yüklenemedi. Sayfayı yenileyip tekrar dene.");
      }
    }
    void loadData();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (screen !== "dispatch" || !selected?.dbId) return;
    let active = true;
    fetch(`/api/requests/${selected.dbId}/offers`, { cache: "no-store" })
      .then(async (response) => response.ok ? await response.json() as { offers?: Record<string, unknown>[] } : null)
      .then((data) => {
        if (!active) return;
        setSentOffers((data?.offers ?? []).map((offer) => ({
          offerId: String(offer.id), requestId: selected.id, technicianId: String(offer.technician_id),
          technician: String(offer.technician_name), status: String(offer.status), createdAt: String(offer.created_at),
        })));
      })
      .catch(() => { if (active) setSentOffers([]); });
    return () => { active = false; };
  }, [screen, selected?.dbId, selected?.id]);

  async function loadDeliveries() {
    setDeliveryLoading(true); setDeliveryError("");
    try {
      const response = await fetch("/api/deliveries", { cache: "no-store" });
      const data = await response.json() as { deliveries?: Delivery[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Teslimatlar yüklenemedi.");
      setDeliveries(data.deliveries ?? []);
      setSelectedDeliveryId((current) => current || data.deliveries?.[0]?.id || "");
    } catch (error) { setDeliveryError(error instanceof Error ? error.message : "Teslimatlar yüklenemedi."); }
    finally { setDeliveryLoading(false); }
  }
  useEffect(() => {
    if (screen === "courier") void loadDeliveries();
    if (screen === "dispatch") fetch("/api/couriers", { cache: "no-store" }).then(async (response) => {
      const data = await response.json() as { couriers?: Courier[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Kuryeler yüklenemedi.");
      setCouriers(data.couriers ?? []);
    }).catch((error: unknown) => setDeliveryError(error instanceof Error ? error.message : "Kuryeler yüklenemedi."));
  }, [screen]);
  async function assignCourier() {
    if (!selected || !courierId || deliveryPending) return;
    setDeliveryPending(true); setDeliveryError("");
    try {
      const response = await fetch(`/api/requests/${selected.dbId}/delivery`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ courierId }) });
      const data = await response.json() as { delivery?: Delivery; error?: string };
      if (!response.ok || !data.delivery) throw new Error(data.error ?? "Kurye atanamadı.");
      const delivery = data.delivery;
      setRequests((current) => current.map((request) => request.dbId === selected.dbId ? { ...request, deliveryStatus: delivery.delivery_status, assignedCourierName: delivery.courier_name } : request));
      setCourierId(""); setNotice("Kurye atandı.");
    } catch (error) { setDeliveryError(error instanceof Error ? error.message : "Kurye atanamadı."); }
    finally { setDeliveryPending(false); }
  }
  async function updateDelivery(delivery: Delivery, status: CourierJobStatus) {
    if (deliveryPending) return;
    setDeliveryPending(true); setDeliveryError("");
    try {
      const response = await fetch(`/api/deliveries/${delivery.id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      const data = await response.json() as { delivery?: Delivery; error?: string };
      if (!response.ok || !data.delivery) throw new Error(data.error ?? "Teslimat durumu güncellenemedi.");
      setDeliveries((current) => current.map((item) => item.id === delivery.id ? data.delivery! : item));
    } catch (error) { setDeliveryError(error instanceof Error ? error.message : "Teslimat durumu güncellenemedi."); }
    finally { setDeliveryPending(false); }
  }
  const selectedOffers = sentOffers.filter((offer) => offer.requestId === selectedId);
  const activeTechnicianJob = requests.find((request) => request.offerId && (request.offerStatus === "pending" || request.offerStatus === "accepted"));
  const customerRequest = requests[0];
  const trackedRequest = screen === "customer" ? customerRequest : screen === "technician" ? activeTechnicianJob : undefined;
  const selectedCustody = selected ? getDeviceCustody(selected) : { holder: "Müşteride" as const, detail: "Yeni talep bekleniyor", kind: "customer" as const };
  const needsTechnician = requests.filter((request) => request.status === "Yeni talep" || request.status === "Usta aranıyor").length;
  const availableTechnicians = technicians.filter((technician) => technician.available).length;
  const profileName = user.name;
  const profileInitials = user.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toLocaleUpperCase("tr-TR");
  const screenTitle = screen === "dispatch" ? role === "Admin" ? "Yönetim" : "Operasyon" : screen === "technician" ? "Usta paneli" : screen === "courier" ? "Kurye paneli" : "Cihaz takibi";

  useEffect(() => {
    if (!trackedRequest?.dbId) {
      setEventHistory([]);
      return;
    }
    let active = true;
    setEventHistory([]);
    fetch(`/api/requests/${trackedRequest.dbId}/events`, { cache: "no-store" })
      .then(async (response) => response.ok ? await response.json() as { events?: Record<string, unknown>[] } : null)
      .then((data) => { if (active) setEventHistory((data?.events ?? []).map(mapRepairEvent)); })
      .catch(() => { if (active) setEventHistory([]); });
    return () => { active = false; };
  }, [trackedRequest?.dbId]);

  async function refreshRequestEvents(requestId: string) {
    try {
      const response = await fetch(`/api/requests/${requestId}/events`, { cache: "no-store" });
      const data = response.ok ? await response.json() as { events?: Record<string, unknown>[] } : null;
      if (trackedRequest?.dbId === requestId) setEventHistory((data?.events ?? []).map(mapRepairEvent));
    } catch {
      if (trackedRequest?.dbId === requestId) setEventHistory([]);
    }
  }

  async function refreshRecentActivity() {
    try {
      const response = await fetch("/api/activity", { cache: "no-store" });
      const data = response.ok ? await response.json() as { events?: Record<string, unknown>[] } : null;
      if (data) setRecentActivity((data.events ?? []).map(mapRepairEvent));
    } catch { /* Keep the last successfully loaded activity list. */ }
  }

  async function updateTechnicianStatus(nextStatus: TechnicianJobStatus) {
    if (!activeTechnicianJob) return;
    const url = nextStatus === "accepted" || nextStatus === "declined"
      ? `/api/offers/${activeTechnicianJob.offerId}`
      : `/api/requests/${activeTechnicianJob.dbId}/status`;
    const status = nextStatus === "accepted" ? "accepted" : nextStatus === "declined" ? "declined" : nextStatus === "repairing" ? "in_repair" : nextStatus === "approval" ? "waiting_customer" : nextStatus === "parts" ? "waiting_parts" : "ready_for_delivery";
    try {
      const response = await fetch(url, { method: nextStatus === "accepted" || nextStatus === "declined" ? "PATCH" : "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "İş durumu kaydedilemedi.");
      setTechnicianJobStatus(nextStatus);
      const rawStatus = nextStatus === "accepted" ? "assigned" : nextStatus === "repairing" ? "in_repair" : nextStatus === "approval" ? "waiting_customer" : nextStatus === "parts" ? "waiting_parts" : nextStatus === "completed" ? "ready_for_delivery" : "reviewing";
      setRequests((current) => current.map((request) => request.dbId === activeTechnicianJob.dbId ? { ...request, statusRaw: rawStatus, offerStatus: nextStatus === "accepted" ? "accepted" : nextStatus === "declined" ? "declined" : request.offerStatus } : request));
      void refreshRequestEvents(activeTechnicianJob.dbId);
      setNotice(nextStatus === "accepted" ? "İş sana atandı." : nextStatus === "declined" ? "Teklif reddedildi." : "İş durumu güncellendi.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "İş durumu kaydedilemedi.");
    }
    window.setTimeout(() => setNotice(""), 3200);
  }
  const filteredRequests = useMemo(() => requests.filter((request) => {
    const matchesQuery = `${request.id} ${request.customer} ${request.device} ${request.issue} ${request.district}`.toLowerCase().includes(query.toLowerCase());
    const matchesFilter = filter === "Tüm talepler" || (filter === "Yeni" ? request.status === "Yeni talep" : filter === "Usta aranıyor" ? request.status === "Usta aranıyor" : request.status === "Atandı");
    return matchesQuery && matchesFilter;
  }), [filter, query, requests]);

  async function sendOffer(technician: Technician) {
    if (!selected) return;
    try {
      const response = await fetch(`/api/requests/${selected.dbId}/offers`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ technicianId: technician.id }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Teklif gönderilemedi.");
      setRequests((current) => current.map((request) => request.dbId === selected.dbId ? { ...request, status: "Teklif gönderildi" } : request));
      setSentOffers((current) => [...current, { offerId: "pending", requestId: selected.id, technicianId: technician.id, technician: technician.name, status: "pending", createdAt: new Date().toISOString() }]);
      void refreshRecentActivity();
      setNotice(`${technician.name} adlı ustaya teklif gönderildi.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Teklif gönderilemedi.");
    }
    window.setTimeout(() => setNotice(""), 3200);
  }

  async function createRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const customer = String(formData.get("customer") || "Yeni Müşteri");
    const response = await fetch("/api/requests", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerName: customer, phone: String(formData.get("phone") ?? "").trim(), device: String(formData.get("device") || "iPhone 13"), issue: String(formData.get("issue") || "Ekran değişimi"), city: "İstanbul", district: String(formData.get("district") || "Kadıköy"), description: String(formData.get("description") ?? "") }),
    });
    const result = await response.json() as { request?: Record<string, unknown>; error?: string };
    if (!response.ok || !result.request) { setNotice(result.error ?? "Talep oluşturulamadı."); return; }
    const newRequest = mapRequest({ ...result.request, customer_name: customer, device: String(formData.get("device") || "iPhone 13"), issue: String(formData.get("issue") || "Ekran değişimi"), district: String(formData.get("district") || "Kadıköy") });
    setRequests((current) => [newRequest, ...current]);
    setSelectedId(newRequest.id);
    setShowCreate(false);
    setNotice("Yeni talep oluşturuldu.");
    void refreshRecentActivity();
    window.setTimeout(() => setNotice(""), 3200);
  }

  return (
    <main className="app-shell">
      <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
        <div className="brand"><div className="brand-mark"><Wrench size={19} strokeWidth={2.2} /></div><span>AloJet<span className="brand-light">Cep</span></span><button className="icon-button nav-close" aria-label="Menüyü kapat" onClick={() => setMobileNav(false)}><X size={18} /></button></div>
        <div className="workspace-label">{screen === "dispatch" ? role === "Admin" ? "YÖNETİM" : "OPERASYON" : screen === "technician" ? "USTA PANELİ" : screen === "courier" ? "KURYE PANELİ" : "MÜŞTERİ"}</div>
        <nav className="main-nav" aria-label="Ana menü">
          {screen === "dispatch" ? <>
            <button className="nav-item active"><Activity size={18} /><span>Genel Bakış</span></button>
            <button className="nav-item"><FileText size={18} /><span>Talepler</span><span className="nav-count">12</span></button>
            <button className="nav-item"><Users size={18} /><span>Ustalar</span><span className="presence-dot" /></button>
            <button className="nav-item"><Smartphone size={18} /><span>Müşteriler</span></button>
          </> : screen === "technician" ? <>
            <button className="nav-item active"><Wrench size={18} /><span>İşlerim</span></button>
            <button className="nav-item"><ClipboardCheck size={18} /><span>İş geçmişim</span></button>
            <button className="nav-item"><UserRound size={18} /><span>Profilim</span></button>
          </> : screen === "courier" ? <>
            <button className="nav-item active"><PackageCheck size={18} /><span>Teslimatlarım</span></button>
            <button className="nav-item"><Navigation size={18} /><span>Günlük rotam</span></button>
            <button className="nav-item"><CheckCircle2 size={18} /><span>Tamamlananlar</span></button>
          </> : <>
            <button className="nav-item active"><Smartphone size={18} /><span>Cihazım</span></button>
            <button className="nav-item"><FileText size={18} /><span>Talep detayları</span></button>
            <button className="nav-item"><Headphones size={18} /><span>Destek</span></button>
          </>}
        </nav>
        {screen === "dispatch" && <>
          <div className="sidebar-divider" />
          <div className="workspace-label">YÖNETİM</div>
          <nav className="main-nav" aria-label="Yönetim menüsü">
            <button className="nav-item"><Activity size={18} /><span>Raporlar</span></button>
            {role === "Admin" && <Link className="nav-item" href="/admin/users"><ShieldCheck size={18} /><span>Kullanıcı ve roller</span></Link>}
            <button className="nav-item"><Settings2 size={18} /><span>Ayarlar</span></button>
          </nav>
        </>}
        <div className="sidebar-bottom">
          <div className="help-card"><div className="help-icon"><Headphones size={18} /></div><div><strong>Yardıma mı ihtiyacın var?</strong><span>Destek ekibine ulaş</span></div><ArrowRight size={15} /></div>
          <button className="profile-row" aria-label="Kullanıcı profili"><div className="avatar avatar-self">{profileInitials}</div><span className="profile-copy"><strong>{profileName}</strong><small>{role} hesabı</small></span><MoreHorizontal size={19} /></button>
        </div>
      </aside>

      {mobileNav && <button className="mobile-scrim" aria-label="Menüyü kapat" onClick={() => setMobileNav(false)} />}

      <section className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-menu" aria-label="Menüyü aç" onClick={() => setMobileNav(true)}><Menu size={20} /></button>
          <div className="breadcrumbs"><span>Çalışma alanı</span><ChevronRight size={14} /><strong>{screenTitle}</strong></div>
          <div className="topbar-actions">
            <span className="role-badge">{role}</span>
            <button className="icon-button notification-button" aria-label="Bildirimler"><Bell size={18} /><span /></button>
            <div className="top-avatar avatar avatar-self">{profileInitials}</div>
          </div>
        </header>

        <div className="content">
          {screen === "dispatch" && requests.length === 0 ? <section className="panel request-empty-state"><span className="empty-state-icon"><FileText size={23}/></span><span className="eyebrow">OPERASYON KUYRUĞU</span><h1>Henüz talep yok.</h1><p>Müşterilerden gelen yeni tamir talepleri burada listelenecek.</p><button className="button button-primary" onClick={() => setShowCreate(true)}><Plus size={17}/> Yeni talep oluştur</button></section> : screen === "dispatch" ? <>
          <div className="page-heading">
            <div><div className="eyebrow"><span className="live-indicator" /> {new Intl.DateTimeFormat("tr-TR", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Istanbul" }).format(new Date()).toLocaleUpperCase("tr-TR")}</div><h1>{role === "Admin" ? "Yönetim özeti" : "Operasyon işleri"}<span className="wave">.</span></h1><p>{role === "Admin" ? "Talepleri ve ekip erişimlerini buradan yönetin." : "Talebi seçin, uygun ustayı bulun ve teklif gönderin."}</p></div>
            <button className="button button-primary" onClick={() => setShowCreate(true)}><Plus size={17} /> Yeni talep oluştur</button>
          </div>

          <div className="metric-grid">
            <article className="metric-card metric-featured"><div className="metric-top"><span>Toplam talep</span><span className="metric-icon icon-lilac"><FileText size={17} /></span></div><div className="metric-value">{requests.length}</div><div className="metric-foot"><span>Operasyon kuyruğundaki işler</span></div></article>
            <article className="metric-card"><div className="metric-top"><span>Usta bekleyen</span><span className="metric-icon icon-amber"><Clock3 size={17} /></span></div><div className="metric-value">{needsTechnician} <span className="metric-note">talep</span></div><div className="metric-foot"><span>Yönlendirme yapılabilir</span></div></article>
            <article className="metric-card"><div className="metric-top"><span>Müsait usta</span><span className="metric-icon icon-green"><Wrench size={17} /></span></div><div className="metric-value">{availableTechnicians} <span className="metric-note">usta</span></div><div className="metric-foot"><span>Teklif alabilir</span></div></article>
          </div>

          <div className="work-grid">
            <section className="requests-panel panel">
              <div className="panel-heading"><div><div className="title-line"><h2>1. Talebi seç</h2><span className="count-pill">{filteredRequests.length}</span></div><p>Seçtiğiniz talebin ayrıntıları sağda açılır.</p></div><button className="button button-secondary button-small"><span>Tüm talepler</span><ArrowRight size={15} /></button></div>
              <div className="table-toolbar">
                <label className="search-box"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Talep, müşteri veya cihaz ara" /></label>
                <div className="toolbar-right"><label className="filter-select"><Filter size={14}/><select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Talepleri filtrele"><option>Tüm talepler</option><option>Yeni</option><option>Usta aranıyor</option><option>Atandı</option></select><ChevronDown size={13}/></label></div>
              </div>
              <div className="request-table-wrap"><table className="request-table"><thead><tr><th>MÜŞTERİ / CİHAZ</th><th>ARIZA</th><th>KONUM</th><th>DURUM / CİHAZ KİMDE</th><th>GELİŞ</th><th><span className="sr-only">İşlem</span></th></tr></thead><tbody>{filteredRequests.map((request) => { const custody = getDeviceCustody(request); const CustodyIcon = custody.kind === "courier" ? Truck : custody.kind === "technician" ? Wrench : Smartphone; return <tr key={request.id} onClick={() => setSelectedId(request.id)} className={selectedId === request.id ? "row-selected" : ""} tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter") setSelectedId(request.id); }}><td><div className="customer-cell"><div className={`avatar avatar-${request.initials.length}`}>{request.initials}</div><div className="customer-info"><strong>{request.customer}{request.priority === "Acil" && <span className="urgent-mark" title="Öncelikli talep">!</span>}</strong><span>{request.id} <i/> {request.device}</span></div></div></td><td className="issue-cell">{request.issue}</td><td><span className="location-cell"><MapPin size={13}/>{request.district}</span></td><td><div className="request-status-stack"><span className={`status-badge ${statusClass[request.status]}`}><i/>{request.status}</span><span className={`custody-chip custody-${custody.kind}`}><CustodyIcon size={14}/><strong>{custody.holder}</strong></span><small>{custody.detail}</small></div></td><td className="time-cell">{request.created}</td><td><button className="row-more" aria-label={`${request.id} seçenekleri`} onClick={(event) => { event.stopPropagation(); setSelectedId(request.id); }}><MoreHorizontal size={17}/></button></td></tr>; })}</tbody></table>{filteredRequests.length === 0 && <div className="empty-results"><Search size={20}/><strong>Sonuç bulunamadı</strong><span>Arama veya filtre kriterlerini değiştirebilirsin.</span></div>}</div>
              <section className="queue-activity" aria-label="Son operasyon hareketleri">
                <div className="queue-activity-heading"><h3>Son hareketler</h3><span>En yeni 3 kayıt</span></div>
                <div className="queue-activity-list">
                  {recentActivity.slice(0, 3).map((event) => <article key={event.id}><span className={`activity-mark ${event.eventType === "request_created" ? "mark-new" : event.eventType === "offer_sent" ? "mark-offer" : "mark-assigned"}`}>{event.eventType === "request_created" ? <Plus size={14}/> : event.eventType === "offer_sent" ? <ArrowRight size={14}/> : <Activity size={14}/>}</span><div><strong>{describeRepairEvent(event)}</strong><span>{event.reference} · {event.device} · {event.issue}</span></div><time>{formatRepairEventTime(event.createdAt)}</time></article>)}
                  {recentActivity.length === 0 && <div className="history-empty"><Clock3 size={21}/><strong>Henüz talep hareketi yok</strong><span>Yeni talepler ve durum değişiklikleri burada görünür.</span></div>}
                </div>
              </section>
              <footer className="table-footer"><span>Toplam <strong>{requests.length}</strong> talepten <strong>{filteredRequests.length}</strong> tanesi gösteriliyor</span><div className="pagination"><button aria-label="Önceki sayfa" disabled><ChevronLeft size={16}/></button><button className="page-current">1</button><button>2</button><button>3</button><span>…</span><button>8</button><button aria-label="Sonraki sayfa"><ChevronRight size={16}/></button></div></footer>
            </section>

            <aside className="matching-panel panel">
              <div className="matching-heading"><div><div className="title-line"><h2>2. Ustaya teklif gönder</h2><span className="live-pill"><span/> CANLI</span></div><p>Seçili talebe uygun ustalar listelenir.</p></div><button className="icon-button matching-more" aria-label="Usta listesi seçenekleri"><MoreHorizontal size={19}/></button></div>
              <div className="selected-request"><div className="selected-request-top"><span className="selected-label">SEÇİLİ TALEP</span><span className="request-code">{selected?.id}</span></div><div className="selected-device"><div className="device-icon"><Smartphone size={20}/></div><div><strong>{selected?.device}</strong><span>{selected?.issue}</span></div><span className={`status-badge compact ${statusClass[selected?.status ?? "Yeni talep"]}`}><i/>{selected?.status}</span></div><div className="selected-meta"><span><UserRound size={13}/>{selected?.customer}</span><span><MapPin size={13}/>{selected?.district}</span>{selected?.imei && <span>IMEI: {selected.imei}</span>}</div></div>
              <div className={`selected-custody custody-${selectedCustody.kind}`}><div className="custody-icon">{selectedCustody.kind === "courier" ? <Truck size={20}/> : selectedCustody.kind === "technician" ? <Wrench size={20}/> : <Smartphone size={20}/>}</div><div><span>CİHAZ ŞU ANDA KİMDE?</span><strong>{selectedCustody.holder}</strong><small>{selectedCustody.detail}</small></div><span className="custody-live"><i/>Güncel</span></div>
              {selected && <WarrantyCheck key={selected.dbId} requestId={selected.dbId} imei={selected.imei} status={selected.warrantyStatus} expiresOn={selected.warrantyExpiresOn} checkedAt={selected.warrantyCheckedAt} onSaved={(value) => { setRequests((current) => current.map((item) => item.dbId === selected.dbId ? { ...item, warrantyStatus: value.status, warrantyExpiresOn: value.expiresOn, warrantyCheckedAt: value.checkedAt } : item)); void refreshRecentActivity(); }} />}
              <div className="delivery-assignment"><h3>Kurye ataması</h3>{selected?.assignedCourierName && <p>Atanan kurye: <strong>{selected.assignedCourierName}</strong></p>}{selected && (!selected.deliveryStatus || ["assigned", "accepted"].includes(selected.deliveryStatus)) && <><label htmlFor="courier-select">Kurye seç</label><select id="courier-select" value={courierId} onChange={(event) => setCourierId(event.target.value)}><option value="">Kurye seçin</option>{couriers.map((courier) => <option key={courier.id} value={courier.id}>{courier.full_name}{courier.district ? ` · ${courier.district}` : ""}</option>)}</select><button className="button button-primary" disabled={!courierId || deliveryPending} aria-busy={deliveryPending} onClick={assignCourier}>{deliveryPending ? "Kaydediliyor…" : selected.deliveryStatus ? "Kuryeyi değiştir" : "Kurye ata"}</button>{couriers.length === 0 && !deliveryError && <p>Atanabilecek kurye bulunamadı.</p>}</>}{deliveryError && <p role="alert">{deliveryError}</p>}</div>
              <div className="match-summary"><span><strong>4</strong> uygun usta bulundu</span><button className="text-button"><SlidersHorizontal size={13}/> Filtrele</button></div>
              <div className="matching-tabs" role="tablist"><button role="tab" aria-selected={tab === "Uygun ustalar"} className={tab === "Uygun ustalar" ? "tab-active" : ""} onClick={() => setTab("Uygun ustalar")}>Uygun ustalar <span>4</span></button><button role="tab" aria-selected={tab === "Teklif geçmişi"} className={tab === "Teklif geçmişi" ? "tab-active" : ""} onClick={() => setTab("Teklif geçmişi")}>Teklif geçmişi</button></div>
              {tab === "Uygun ustalar" ? <div className="technician-list">{technicians.map((technician, index) => { const alreadySent = selectedOffers.some((offer) => offer.technician === technician.name); return <article className={`technician-card ${index === 0 ? "recommended" : ""}`} key={technician.name}><div className="technician-top"><div className={`avatar tech-avatar tech-${index}`}>{technician.initials}</div><div className="technician-identity"><div className="technician-name">{technician.name}{index === 0 && <span className="best-match">EN UYGUN</span>}</div><span>{technician.shop}</span></div><div className="rating"><span>★</span>{technician.rating}</div></div><div className="technician-details"><span><MapPin size={12}/>{technician.district} · {technician.distance}</span><span><Check size={12}/>{technician.jobs} tamamlanan iş</span></div><div className="specialty-list">{technician.specialties.map((specialty) => <span key={specialty}>{specialty}</span>)}</div><div className="technician-action"><span className={technician.available ? "availability available" : "availability unavailable"}><i/>{technician.available ? "Müsait" : "Meşgul"}</span><button className={`button ${alreadySent ? "button-sent" : "button-offer"}`} disabled={!technician.available || alreadySent} onClick={() => sendOffer(technician)}>{alreadySent ? <><Check size={14}/> Gönderildi</> : "Teklif gönder"}</button></div></article>; })}</div> : <div className="history-list">{selectedOffers.length ? selectedOffers.map((offer, index) => <div className="history-item" key={`${offer.requestId}-${offer.technician}`}><div className="history-icon"><Check size={15}/></div><div><strong>{offer.technician}</strong><span>{offer.requestId} için teklif gönderildi</span></div><time>{index === selectedOffers.length - 1 ? "Şimdi" : "Az önce"}</time></div>) : <div className="history-empty"><Clock3 size={21}/><strong>Henüz teklif yok</strong><span>Bu talep için gönderilen teklifler burada görünecek.</span></div>}</div>}
              <div className="manual-note"><div className="manual-note-icon"><UserRound size={14}/></div><span>Teklif gönderimi görevli onayıyla yapılır. Atama, usta kabul ettiğinde tamamlanır.</span></div>
            </aside>
          </div>

          <div className="bottom-strip"><div><span className="bottom-mark"><Activity size={15}/></span><span><strong>Operasyon akışı normal</strong><small>Son güncelleme: az önce</small></span></div><button className="text-button">Aktivite günlüğü <ArrowRight size={14}/></button></div>
          </> : screen === "technician" ? <TechnicianDashboard name={user.name} job={activeTechnicianJob} status={technicianJobStatus} eventHistory={eventHistory} onStatusChange={updateTechnicianStatus} available={technicianAvailable} onAvailabilityChange={async (available) => {
            const response = await fetch("/api/me/availability", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ available }) });
            if (!response.ok) { setNotice("Müsaitlik durumun kaydedilemedi."); return; }
            setTechnicianAvailable(available);
          }} /> : screen === "courier" ? <CourierDashboard deliveries={deliveries} selectedId={selectedDeliveryId} onSelect={setSelectedDeliveryId} loading={deliveryLoading} error={deliveryError} pending={deliveryPending} onRetry={loadDeliveries} onStatusChange={updateDelivery} /> : customerRequest ? <CustomerTracking request={customerRequest} status={mapCustomerJobStatus(customerRequest)} courierStatus={customerRequest.deliveryStatus} eventHistory={eventHistory} onApprove={async () => {
            const response = await fetch(`/api/requests/${customerRequest.dbId}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "in_repair" }) });
            const result = await response.json() as { error?: string };
            if (!response.ok) { setNotice(result.error ?? "Onay kaydedilemedi."); return; }
            setRequests((current) => current.map((request) => request.dbId === customerRequest.dbId ? { ...request, statusRaw: "in_repair" } : request));
            void refreshRequestEvents(customerRequest.dbId);
          }} /> : <section className="panel request-empty-state"><span className="empty-state-icon"><Smartphone size={23}/></span><span className="eyebrow">CİHAZ TAKİBİ</span><h1>Henüz açık talebin yok.</h1><p>Telefonun için yeni bir tamir talebi oluştur.</p><Link className="button button-primary" href="/talep"><Plus size={17}/> Tamir talebi oluştur</Link></section>}
        </div>
      </section>

      {notice && <div className="toast" role="status"><span className="toast-check"><Check size={15}/></span>{notice}<button aria-label="Bildirimi kapat" onClick={() => setNotice("")}><X size={15}/></button></div>}
      {showCreate && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowCreate(false); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-header"><div><span className="modal-kicker">YENİ KAYIT</span><h2 id="modal-title">Tamir talebi oluştur</h2><p>Müşteri adına yeni bir talep kaydı aç.</p></div><button className="icon-button" aria-label="Pencereyi kapat" onClick={() => setShowCreate(false)}><X size={18}/></button></div><form id="request-form" className="modal-body" onSubmit={createRequest}><label>Müşteri adı<input name="customer" defaultValue="Yeni Müşteri" required minLength={2}/></label><label>Müşteri telefonu<input name="phone" type="tel" placeholder="05xx xxx xx xx" required minLength={10}/></label><div className="form-row"><label>Telefon modeli<input name="device" list="staff-phone-models" placeholder="Marka ve model seç veya yaz" maxLength={120} required/><datalist id="staff-phone-models">{Object.entries(phoneModels).flatMap(([brand, models]) => models.map((model) => <option key={`${brand}-${model}`} value={`${brand.replaceAll("_", " ")} ${model}`} />))}</datalist></label><label>Arıza türü<select name="issue" defaultValue="Ekran değişimi"><option>Ekran değişimi</option><option>Pil değişimi</option><option>Şarj soketi</option></select></label></div><label>İlçe<input name="district" defaultValue="Kadıköy" required/></label><label>Arıza açıklaması<textarea name="description" placeholder="Müşterinin belirttiği sorunu kısaca yaz..." rows={3}/></label></form><div className="modal-footer"><button className="button button-secondary" onClick={() => setShowCreate(false)}>Vazgeç</button><button type="submit" form="request-form" className="button button-primary"><Plus size={16}/> Talep oluştur</button></div></section></div>}
    </main>
  );
}

function TechnicianDashboard({
  name,
  job,
  status,
  eventHistory,
  onStatusChange,
  available,
  onAvailabilityChange,
}: {
  name: string;
  job?: RepairRequest;
  status: TechnicianJobStatus;
  eventHistory: RepairEvent[];
  onStatusChange: (status: TechnicianJobStatus) => void;
  available: boolean;
  onAvailabilityChange: (available: boolean) => void;
}) {
  const statusLabels: Record<TechnicianJobStatus, string> = {
    offer: "Yeni teklif",
    accepted: "Kabul edildi",
    repairing: "Tamir sürüyor",
    approval: "Onay bekliyor",
    parts: "Parça bekliyor",
    completed: "Tamamlandı",
    declined: "Reddedildi",
  };
  const primaryAction: Partial<Record<TechnicianJobStatus, { label: string; next: TechnicianJobStatus }>> = {
    offer: { label: "İşi kabul et", next: "accepted" },
    accepted: { label: "Tamire başla", next: "repairing" },
    repairing: { label: "Tamiri tamamla", next: "completed" },
    approval: { label: "Müşteri onayladı · tamire dön", next: "repairing" },
    parts: { label: "Parça geldi · tamire dön", next: "repairing" },
  };
  const action = primaryAction[status];

  if (!job) return <section className="panel request-empty-state"><span className="empty-state-icon"><Wrench size={23}/></span><span className="eyebrow">USTA İŞLERİ</span><h1>Bekleyen teklif yok.</h1><p>Yeni bir iş teklifi geldiğinde burada görüntüleyebilirsin.</p></section>;

  return <>
    <div className="page-heading role-page-heading">
      <div><div className="eyebrow"><span className="live-indicator" /> USTA ÇALIŞMA ALANI</div><h1>Merhaba, {name.split(/\s+/)[0]}<span className="wave">.</span></h1><p>İş tekliflerini yanıtla, tamir sürecini kolayca güncelle.</p></div>
      <button className={`availability-toggle ${available ? "is-available" : "is-unavailable"}`} aria-pressed={available} onClick={() => onAvailabilityChange(!available)}><span className="availability-indicator" />{available ? "Yeni işlere açığım" : "Yeni işlere kapalıyım"}</button>
    </div>

    <div className="role-work-grid">
      <section className="panel role-primary-panel">
        <div className="role-panel-heading"><div><span className="role-kicker">İŞ TEKLİFİ · {job.id}</span><h2>{status === "offer" ? "Yeni bir iş teklifin var" : `${job.customer} · ${job.device}`}</h2><p>{status === "offer" ? "Görevli ekibi bu işi sana yönlendirdi." : "Bu iş sana atandı."}</p></div><span className={`status-badge ${status === "declined" ? "status-new" : status === "completed" ? "status-assigned" : "status-offer"}`}><i />{statusLabels[status]}</span></div>
        <div className="technician-job-summary">
          <div className="job-device-icon"><Smartphone size={25} /></div>
          <div className="job-device-copy"><strong>{job.device}</strong><span>{job.issue}</span></div>
          <span className="job-priority"><span />{job.priority === "Acil" ? "Öncelikli" : "Standart"}</span>
        </div>
        <div className="job-facts-grid">
          <div><span className="fact-icon"><UserRound size={15} /></span><span><small>MÜŞTERİ</small><strong>{job.customer}</strong></span></div>
          <div><span className="fact-icon"><MapPin size={15} /></span><span><small>KONUM</small><strong>{job.district}{job.city ? `, ${job.city}` : ""}</strong></span></div>
          <div><span className="fact-icon"><Clock3 size={15} /></span><span><small>TALEP ZAMANI</small><strong>{job.created}</strong></span></div>
          <div><span className="fact-icon"><BatteryCharging size={15} /></span><span><small>ARIZA</small><strong>{job.issue}</strong></span></div>
        </div>
        <div className="job-description"><strong>Cihaz şu anda: {getDeviceCustody(job).holder}</strong><p>{getDeviceCustody(job).detail}</p></div>
        {job.imei && <div className="job-description"><strong>IMEI</strong><p>{job.imei}</p></div>}
        {job.description && <div className="job-description"><strong>Müşterinin notu</strong><p>{job.description}</p></div>}
        <details className="customer-event-history technician-event-history" open><summary>Talep geçmişi <span>{eventHistory.length}</span></summary><div className="customer-event-list">{eventHistory.length ? eventHistory.slice(0, 10).map((event) => <div key={event.id}><span className="history-icon"><Activity size={14}/></span><div className="repair-event-copy"><p>{describeRepairEvent(event)}</p><small>{event.reference} · {event.device} · {event.issue}</small></div><time>{formatRepairEventTime(event.createdAt)}</time></div>) : <p className="repair-event-empty">Bu işte henüz hareket kaydı yok.</p>}</div></details>
        {status === "accepted" || status === "repairing" ? <div className="technician-tools"><label>Teşhis ve yapılan işlem<textarea defaultValue={status === "repairing" ? "Ekran paneli hasarlı. Değişim ve dokunmatik testi yapılacak." : ""} placeholder="Teşhis bulgularını ve yapılacak işlemi kaydet" /></label><div><button className="button button-secondary" onClick={() => onStatusChange("approval")}>Ek işlem için onay iste</button><button className="button button-secondary" onClick={() => onStatusChange("parts")}>Parça bekliyor</button></div></div> : null}
        {status === "approval" || status === "parts" ? <div className="job-state-message"><Clock3 size={17} /><span>{status === "approval" ? "Ek işlem ve fiyat için müşteri onayı bekleniyor." : "Gerekli yedek parça bekleniyor. Müşteri durumu takip ekranında görebilir."}</span></div> : null}
        {status === "declined" ? <div className="job-state-message"><X size={17} /><span>Bu teklifi reddettin. Fikrini değiştirdiysen tekrar yanıtlayabilirsin.</span><button className="text-button" onClick={() => onStatusChange("offer")}>Teklifi tekrar aç</button></div> : status === "completed" ? <div className="job-state-message job-success"><CheckCircle2 size={18} /><span>Tamir tamamlandı olarak işaretlendi.</span></div> : <div className="job-actions"><span>{status === "offer" ? "Teklifi kabul ettiğinde işin sana atanır." : status === "accepted" ? "İş sende. Cihazı teslim aldığında tamire başlayabilirsin." : "İş bittiğinde durumu görevli ve müşteriyle paylaşılır."}</span><div>{status === "offer" && <button className="button button-danger-outline" onClick={() => onStatusChange("declined")}>Reddet</button>}{action && <button className="button button-primary" onClick={() => onStatusChange(action.next)}>{action.label}<ArrowRight size={15} /></button>}</div></div>}
      </section>

      <aside className="panel role-side-panel">
        <div className="role-panel-heading compact-heading"><div><span className="role-kicker">BUGÜNKÜ PLAN</span><h2>İş sıran</h2></div><button className="icon-button" aria-label="İş listesini görüntüle"><MoreHorizontal size={18} /></button></div>
        <div className="work-order-list">
          <article className="work-order current-order"><span className={`order-marker ${status === "completed" ? "order-done" : status === "repairing" ? "order-progress" : "order-pending"}`}>{status === "completed" ? <Check size={14} /> : status === "repairing" ? <Wrench size={14} /> : <Clock3 size={14} />}</span><div><strong>{job.device} · {job.issue}</strong><span>{job.id} · {job.district}</span><small>{statusLabels[status]}</small></div></article>
        </div>
        <div className="role-empty-note">Başka atanmış iş bulunmuyor.</div>
        <div className="role-info-note"><ShieldCheck size={16} /><span>Teklif süresini ve yeniden yönlendirmeyi görevli yönetir. Yanıtın operasyon panelinde görünür.</span></div>
      </aside>
    </div>
    <div className="bottom-strip"><div><span className="bottom-mark"><Wrench size={15} /></span><span><strong>Usta hesabı açık</strong><small>Son güncelleme: az önce</small></span></div><span className="role-bottom-note">İş durumların anlık olarak güncellenir</span></div>
  </>;
}

function CourierDashboard({ deliveries, selectedId, onSelect, loading, error, pending, onRetry, onStatusChange }: { deliveries: Delivery[]; selectedId: string; onSelect: (id: string) => void; loading: boolean; error: string; pending: boolean; onRetry: () => void; onStatusChange: (delivery: Delivery, status: CourierJobStatus) => void }) {
  const labels: Record<CourierJobStatus, string> = { assigned: "Atandı", accepted: "Kabul edildi", picked_up: "Cihaz alındı", at_shop: "Cihaz ustada", returning: "Müşteriye götürülüyor", delivered: "Teslim edildi" };
  const actions: Partial<Record<CourierJobStatus, { label: string; next: CourierJobStatus }>> = { assigned: { label: "Görevi kabul et", next: "accepted" }, accepted: { label: "Cihazı müşteriden aldım", next: "picked_up" }, picked_up: { label: "Cihazı ustaya teslim ettim", next: "at_shop" }, at_shop: { label: "Cihazı müşteriye götür", next: "returning" }, returning: { label: "Cihazı müşteriye teslim ettim", next: "delivered" } };
  const selected = deliveries.find((item) => item.id === selectedId) ?? deliveries[0];
  const action = selected && actions[selected.delivery_status];
  return <><div className="page-heading"><div><h1>Teslimatlarım</h1><p>Görev seç ve teslimatın aşamasını güncelle.</p></div></div>
    {loading ? <section className="panel delivery-panel" role="status">Teslimatlar yükleniyor…</section> : error && !deliveries.length ? <section className="panel delivery-panel"><p role="alert">{error}</p><button className="button button-secondary" onClick={onRetry}>Tekrar dene</button></section> : !deliveries.length ? <section className="panel request-empty-state"><span className="empty-state-icon"><Truck size={23}/></span><h2>Henüz teslimat atanmadı.</h2><p>Görevli ekip teslimat atadığında burada görünecek.</p></section> : <div className="delivery-grid"><section className="panel delivery-panel"><h2>Görevler</h2><div className="delivery-list">{deliveries.map((delivery) => <button key={delivery.id} className={`delivery-item ${selected?.id === delivery.id ? "is-selected" : ""}`} aria-pressed={selected?.id === delivery.id} onClick={() => onSelect(delivery.id)}><strong>{delivery.reference} · {delivery.device}</strong><span>{delivery.issue}</span><span>{labels[delivery.delivery_status]}</span></button>)}</div></section>{selected && <section className="panel delivery-panel"><h2>{selected.device}</h2><p>{selected.reference} · {selected.issue}</p><p>Durum: <strong>{labels[selected.delivery_status]}</strong></p>{error && <p role="alert">{error}</p>}{selected.delivery_status === "at_shop" && selected.request_status !== "ready_for_delivery" ? <p>Tamir tamamlandığında dönüş teslimatını başlatabilirsin.</p> : action ? <button className="button button-primary" disabled={pending} aria-busy={pending} onClick={() => onStatusChange(selected, action.next)}>{pending ? "Kaydediliyor…" : action.label}</button> : <p>Bu teslimat tamamlandı.</p>}</section>}</div>}
  </>;
}

function CustomerTracking({ request, status, courierStatus, eventHistory, onApprove }: { request: RepairRequest; status: TechnicianJobStatus; courierStatus?: CourierJobStatus; eventHistory: RepairEvent[]; onApprove: () => void }) {
  const statusLabels: Record<TechnicianJobStatus, string> = { offer: "Usta eşleşmesi bekleniyor", accepted: "Usta işi kabul etti", repairing: "Tamir devam ediyor", approval: "Ek işlem için onayınız bekleniyor", parts: "Yedek parça bekleniyor", completed: "Tamir tamamlandı", declined: "Yeni usta aranıyor" };
  const active = courierStatus === "delivered" ? 4 : courierStatus === "returning" || status === "completed" ? 3 : courierStatus === "at_shop" || courierStatus === "picked_up" || status === "repairing" || status === "approval" || status === "parts" ? 2 : courierStatus === "accepted" || status === "accepted" ? 1 : 0;
  const repairStep = courierStatus === "picked_up" ? "Cihaz servise gidiyor" : courierStatus === "at_shop" ? "Cihaz ustada" : status === "approval" ? "Onayınız bekleniyor" : status === "parts" ? "Parça bekleniyor" : status === "completed" ? "Tamir tamamlandı" : "Tamir sürüyor";
  const steps = ["Talep alındı", "Usta bulundu", repairStep, courierStatus === "returning" ? "Kurye cihazınızı getiriyor" : "Teslimat", "Size teslim edildi"];
  const custody = getDeviceCustody(request);
  const CustodyIcon = custody.kind === "courier" ? Truck : custody.kind === "technician" ? Wrench : Smartphone;
  const currentStatus = courierStatus === "delivered" ? "Cihazınız teslim edildi" : courierStatus === "returning" ? "Kurye cihazınızı getiriyor" : courierStatus === "at_shop" ? "Cihaz ustaya teslim edildi" : courierStatus === "picked_up" ? "Cihaz servise götürülüyor" : courierStatus === "accepted" ? "Kurye cihazı almaya geliyor" : status === "completed" ? "Tamir tamamlandı · teslimat bekleniyor" : statusLabels[status];
  return <>
    <div className="page-heading"><div><div className="eyebrow"><span className="live-indicator" /> CİHAZ TAKİP</div><h1>Cihazınızın durumu<span className="wave">.</span></h1><p>Talebinizdeki gelişmeleri buradan takip edebilirsiniz.</p></div><span className="request-code">{request.id}</span></div>
    <section className="panel customer-track-panel"><div className="customer-track-head"><div className="device-icon"><Smartphone size={24}/></div><div><span>{request.id} · {request.device} · {request.issue}</span><h2>{currentStatus}</h2><small>Son güncelleme: {request.created}</small>{request.imei && <small>IMEI: {request.imei}</small>}</div></div>
      <div className={`customer-custody custody-${custody.kind}`}><span className="custody-icon"><CustodyIcon size={19}/></span><span><small>Cihaz şu anda</small><strong>{custody.holder}</strong><span>{custody.detail}</span></span></div>
      <div className="customer-timeline">{steps.map((label, index) => <div key={label} className={`customer-timeline-step ${index < active ? "is-done" : index === active ? "is-current" : ""}`}><span>{index < active ? <Check size={14}/> : index + 1}</span><div><strong>{label}</strong><small>{index === 0 ? "Talep oluşturuldu" : index < active ? "Tamamlandı" : index === active ? "Şu an" : "Sıradaki adım"}</small></div></div>)}</div>
      {status === "approval" && <div className="customer-approval"><strong>Ek işlem onayı gerekiyor</strong><p>Devam etmeden önce ustanın ilettiği ek işlem ve ücret bilgisini incele.</p><button className="button button-primary" onClick={onApprove}>İşlemi onayla</button><button className="button button-secondary" onClick={() => window.alert("Usta ile iletişim için destek ekibimize başvurabilirsin.")}>Ustayla görüş</button></div>}
      <details className="customer-event-history"><summary>Talep geçmişi <span>{eventHistory.length}</span></summary><div className="customer-event-list">{eventHistory.length ? eventHistory.slice(0, 10).map((event) => <div key={event.id}><span className="history-icon"><Activity size={14}/></span><div className="repair-event-copy"><p>{describeRepairEvent(event)}</p><small>{event.reference} · {event.device} · {event.issue}</small></div><time>{formatRepairEventTime(event.createdAt)}</time></div>) : <p className="repair-event-empty">Talebinizde henüz kayıtlı bir hareket yok.</p>}</div></details>
      <div className="customer-track-footer"><ShieldCheck size={18}/><span>Durum değiştikçe bu ekranda güncellenir.</span></div>
    </section>
    <div className="bottom-strip"><div><span className="bottom-mark"><Headphones size={15}/></span><span><strong>Yardıma mı ihtiyacınız var?</strong><small>Talep numaranız {request.id}</small></span></div><button className="text-button">Destek ekibi <ArrowRight size={14}/></button></div>
  </>;
}
