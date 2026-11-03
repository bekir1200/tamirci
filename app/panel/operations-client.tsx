"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Clock3, FileText, MapPin, Phone, Search, Smartphone, Users, Wrench } from "lucide-react";
import type { AppRole } from "@/types/next-auth";

type RequestRow = {
  id: string; reference: string; customer_name: string; customer_email?: string | null; customer_phone: string;
  device: string; issue: string; description?: string; repair_notes?: string | null; imei?: string | null; warranty_status?: string | null;
  warranty_expires_on?: string | null; delivery_address?: string | null; city: string; district: string;
  status: string; priority: string; created_at: string; technician_name?: string | null;
  delivery_status?: string | null; assigned_courier_name?: string | null;
};
type TechnicianRow = {
  id: string; full_name: string; email: string; shop_name?: string | null; shop_address?: string | null;
  shop_phone?: string | null; city?: string | null; district?: string | null; specialties: string[];
  available: boolean; active_jobs: number; completed_jobs: number;
};
type OfferRow = { id: string; status: string; created_at: string; responded_at?: string | null; technician_name: string };
type EventRow = { id: string; event_type: string; to_status?: string | null; created_at: string; actor_name?: string | null; technician_name?: string | null };

const statusLabels: Record<string, string> = { new: "Yeni talep", reviewing: "Usta aranıyor", offered: "Teklif gönderildi", assigned: "Ustaya atandı", in_repair: "Tamir sürüyor", waiting_customer: "Müşteri onayı bekliyor", waiting_parts: "Parça bekliyor", ready_for_delivery: "Teslimata hazır", with_courier: "Kuryede", completed: "Tamamlandı", cancelled: "İptal edildi" };
const offerLabels: Record<string, string> = { pending: "Yanıt bekliyor", accepted: "Kabul edildi", declined: "Reddedildi", cancelled: "Kapatıldı" };
const dateTime = (value?: string | null) => value ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" }).format(new Date(value)) : "Belirtilmemiş";

export default function OperationsClient({ mode, role }: { mode: "requests" | "technicians"; role: AppRole }) {
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [technicians, setTechnicians] = useState<TechnicianRow[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [selectedTechnicianId, setSelectedTechnicianId] = useState("");
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const selectedRequest = requests.find((item) => item.id === selectedRequestId) ?? requests[0];
  const selectedTechnician = technicians.find((item) => item.id === selectedTechnicianId) ?? technicians[0];

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      if (mode === "requests") {
        const response = await fetch("/api/requests", { cache: "no-store" });
        const data = await response.json() as { requests?: RequestRow[]; error?: string };
        if (!response.ok) throw new Error(data.error ?? "Talepler yüklenemedi.");
        setRequests(data.requests ?? []);
        setSelectedRequestId((current) => current || data.requests?.[0]?.id || "");
      } else {
        const response = await fetch("/api/technicians", { cache: "no-store" });
        const data = await response.json() as { technicians?: TechnicianRow[]; error?: string };
        if (!response.ok) throw new Error(data.error ?? "Ustalar yüklenemedi.");
        setTechnicians(data.technicians ?? []);
        setSelectedTechnicianId((current) => current || data.technicians?.[0]?.id || "");
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Kayıtlar yüklenemedi."); }
    finally { setLoading(false); }
  }, [mode]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (mode !== "requests" || !selectedRequest?.id) { setOffers([]); setEvents([]); return; }
    let active = true;
    Promise.all([
      fetch(`/api/requests/${selectedRequest.id}/offers`, { cache: "no-store" }).then((r) => r.ok ? r.json() as Promise<{ offers?: OfferRow[] }> : { offers: [] }),
      fetch(`/api/requests/${selectedRequest.id}/events`, { cache: "no-store" }).then((r) => r.ok ? r.json() as Promise<{ events?: EventRow[] }> : { events: [] }),
    ]).then(([offerData, eventData]) => { if (active) { setOffers(offerData.offers ?? []); setEvents(eventData.events ?? []); } })
      .catch(() => { if (active) { setOffers([]); setEvents([]); } });
    return () => { active = false; };
  }, [mode, selectedRequest?.id]);

  const title = mode === "requests" ? "Talep yönetimi" : "Usta rehberi";
  const filteredRequests = requests.filter((item) => `${item.reference} ${item.customer_name} ${item.device} ${item.issue} ${item.district} ${item.status}`.toLocaleLowerCase("tr-TR").includes(search.toLocaleLowerCase("tr-TR")));
  const filteredTechnicians = technicians.filter((item) => `${item.full_name} ${item.shop_name ?? ""} ${item.city ?? ""} ${item.district ?? ""} ${item.specialties.join(" ")}`.toLocaleLowerCase("tr-TR").includes(search.toLocaleLowerCase("tr-TR")));

  return <main className="operations-page">
    <header className="operations-header"><Link href="/panel"><ArrowLeft size={18}/> Panele dön</Link><span>AloJetCep · {role === "admin" ? "Admin" : "Görevli"}</span></header>
    <div className="operations-main">
      <div className="operations-title"><div><span className="request-eyebrow">{role === "admin" ? "YÖNETİM ALANI" : "OPERASYON ALANI"}</span><h1>{title}</h1><p>{mode === "requests" ? "Talepleri seç, müşteri ve cihaz bilgileriyle tam işlem geçmişini görüntüle." : "Usta profillerini, uzmanlıklarını, müsaitliklerini ve iş yüklerini incele."}</p></div><Link className="button button-secondary" href={mode === "requests" ? "/panel/ustalar" : "/panel/talepler"}>{mode === "requests" ? <><Users size={16}/> Ustaları aç</> : <><FileText size={16}/> Talepleri aç</>}</Link></div>
      <div className="operations-toolbar"><label><Search size={18}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={mode === "requests" ? "Talep, müşteri veya cihaz ara" : "Usta, atölye veya uzmanlık ara"}/></label><span>{mode === "requests" ? `${filteredRequests.length} talep` : `${filteredTechnicians.length} usta`}</span><button className="button button-secondary" onClick={() => void load()}>Yenile</button></div>
      {error && <p className="operations-error" role="alert">{error}</p>}
      {loading ? <div className="operations-empty">Kayıtlar yükleniyor…</div> : mode === "requests" ? <div className="operations-grid"><section className="operations-list" aria-label="Talepler">{filteredRequests.map((item) => <button key={item.id} className={`operations-row ${selectedRequest?.id === item.id ? "is-selected" : ""}`} onClick={() => setSelectedRequestId(item.id)} aria-pressed={selectedRequest?.id === item.id}><span className="operations-row-icon"><Smartphone size={19}/></span><span className="operations-row-copy"><strong>{item.reference} · {item.customer_name}</strong><span>{item.device} · {item.issue}</span><small>{item.district}, {item.city} · {dateTime(item.created_at)}</small></span><span className={`operations-pill ${item.status === "completed" ? "is-done" : ""}`}>{statusLabels[item.status] ?? item.status}</span></button>)}{!filteredRequests.length && <div className="operations-empty">Eşleşen talep bulunamadı.</div>}</section>
        {selectedRequest && <section className="operations-detail"><div className="operations-detail-heading"><div><span className="request-eyebrow">TALEP DETAYI</span><h2>{selectedRequest.reference}</h2></div><span className="operations-pill">{statusLabels[selectedRequest.status] ?? selectedRequest.status}</span></div><h3>{selectedRequest.device} · {selectedRequest.issue}</h3><div className="operations-facts"><p><strong>Müşteri</strong><span>{selectedRequest.customer_name}</span></p><p><strong>Telefon</strong><a href={`tel:${selectedRequest.customer_phone?.replace(/[^+\d]/g, "")}`}><Phone size={14}/>{selectedRequest.customer_phone || "Belirtilmemiş"}</a></p><p><strong>E-posta</strong><span>{selectedRequest.customer_email || "Belirtilmemiş"}</span></p><p><strong>Konum</strong><span><MapPin size={14}/>{selectedRequest.district}, {selectedRequest.city}</span></p><p><strong>Talep zamanı</strong><span>{dateTime(selectedRequest.created_at)}</span></p><p><strong>Atanan usta</strong><span>{selectedRequest.technician_name || "Henüz atanmadı"}</span></p><p><strong>Cihaz durumu</strong><span>{selectedRequest.delivery_status === "picked_up" ? "Kuryede" : selectedRequest.delivery_status === "at_shop" ? "Ustada" : selectedRequest.delivery_status === "delivered" ? "Müşteride" : "Teslim alım bekleniyor"}{selectedRequest.assigned_courier_name ? ` · ${selectedRequest.assigned_courier_name}` : ""}</span></p><p><strong>Öncelik</strong><span>{selectedRequest.priority === "urgent" ? "Acil" : "Normal"}</span></p>{selectedRequest.imei && <p><strong>IMEI</strong><span>{selectedRequest.imei}</span></p>}{selectedRequest.warranty_status && <p><strong>Garanti sorgusu</strong><span>{selectedRequest.warranty_status}{selectedRequest.warranty_expires_on ? ` · ${selectedRequest.warranty_expires_on}` : ""}</span></p>}</div><div className="operations-description"><strong>Arıza açıklaması</strong><p>{selectedRequest.description || "Müşteri ek açıklama bırakmadı."}</p></div><div className="operations-description"><strong>Usta işlem notu</strong><p>{selectedRequest.repair_notes || "Henüz işlem notu yok."}</p></div><div className="operations-description"><strong>Teslimat adresi</strong><p>{selectedRequest.delivery_address || "Adres henüz eklenmedi."}</p></div><div className="operations-history"><h3><Clock3 size={17}/> Teklif geçmişi</h3>{offers.length ? offers.map((offer) => <div key={offer.id}><span>{offer.technician_name}</span><strong>{offerLabels[offer.status] ?? offer.status}</strong><small>{dateTime(offer.responded_at || offer.created_at)}</small></div>) : <p>Bu talep için henüz teklif kaydı yok.</p>}</div><div className="operations-history"><h3><Clock3 size={17}/> Son hareketler</h3>{events.length ? events.slice(0, 8).map((event) => <div key={event.id}><span>{event.actor_name || event.technician_name || "Ekip"} · {event.event_type.replaceAll("_", " ")}</span><small>{dateTime(event.created_at)}</small></div>) : <p>Bu talepte henüz hareket yok.</p>}</div></section>}</div>
      : <div className="technician-directory">{filteredTechnicians.map((item) => <button key={item.id} className={`technician-directory-card ${selectedTechnician?.id === item.id ? "is-selected" : ""}`} onClick={() => setSelectedTechnicianId(item.id)} aria-pressed={selectedTechnician?.id === item.id}><span className="directory-avatar"><Wrench size={19}/></span><strong>{item.full_name}</strong><span>{item.shop_name || "Atölye bilgisi eklenmemiş"}</span><span>{item.city || ""}{item.district ? ` · ${item.district}` : ""}</span><span className={`operations-pill ${item.available ? "is-done" : ""}`}>{item.available ? "Müsait" : "Meşgul"}</span><span className="directory-specialties">{item.specialties.length ? item.specialties.join(" · ") : "Uzmanlık belirtilmemiş"}</span><span className="directory-jobs">{item.active_jobs} açık iş · {item.completed_jobs} tamamlanan</span></button>)}{!filteredTechnicians.length && <div className="operations-empty">Eşleşen usta bulunamadı.</div>}{selectedTechnician && <section className="operations-detail technician-profile"><span className="request-eyebrow">USTA PROFİLİ</span><h2>{selectedTechnician.full_name}</h2><p>{selectedTechnician.shop_name || "Atölye belirtilmemiş"}</p><div className="operations-facts"><p><strong>Durum</strong><span>{selectedTechnician.available ? "Yeni işlere açık" : "Şu anda müsait değil"}</span></p><p><strong>Uzmanlıklar</strong><span>{selectedTechnician.specialties.join(", ") || "Belirtilmemiş"}</span></p><p><strong>Telefon</strong><a href={`tel:${selectedTechnician.shop_phone?.replace(/[^+\d]/g, "")}`}><Phone size={14}/>{selectedTechnician.shop_phone || "Belirtilmemiş"}</a></p><p><strong>E-posta</strong><span>{selectedTechnician.email}</span></p><p><strong>Adres</strong><span>{selectedTechnician.shop_address || "Atölye adresi belirtilmemiş"}</span></p><p><strong>Konum</strong><span><MapPin size={14}/>{selectedTechnician.district || ""}{selectedTechnician.city ? `, ${selectedTechnician.city}` : ""}</span></p><p><strong>Açık işler</strong><span>{selectedTechnician.active_jobs}</span></p><p><strong>Tamamlanan işler</strong><span>{selectedTechnician.completed_jobs}</span></p></div></section>}</div>}
    </div>
  </main>;
}
