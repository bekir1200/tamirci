"use client";

import Image from "next/image";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import type { CurrentUser } from "@/lib/authorization";
import { phoneModels } from "@/lib/phone-models";
import { DeliveryAddress } from "./delivery-address";
import {
  Activity, ArrowRight, Bell, Check,
  ChevronDown, ChevronLeft, ChevronRight, Clock3, FileText, Filter,
  BatteryCharging, CheckCircle2, ClipboardCheck, Headphones, MapPin, MapPinned,
  Menu, MoreHorizontal, Navigation, PackageCheck, Phone, Plus, Search, Settings2,
  ReceiptText, ShieldCheck, Smartphone, SlidersHorizontal, Truck, UserRound, Users, Wrench, X,
} from "lucide-react";
import {
  RequestStatus, RepairRequest, Technician, SentOffer, RepairEvent, Screen, TechnicianJobStatus, CourierJobStatus, Delivery, Courier, DeviceCustody, statusClass, mapRequest, mapTechnician, mapTechnicianJobStatus, mapRepairEvent, describeRepairEvent, formatRepairEventTime, mapCustomerJobStatus, getDeviceCustody,
} from "./panel-data";

export default function PanelDashboard({ user }: { user: CurrentUser }) {
  const roleName: Record<CurrentUser["role"], "Görevli" | "Admin" | "Usta" | "Kurye" | "Müşteri"> = { admin: "Admin", staff: "Görevli", technician: "Usta", courier: "Kurye", customer: "Müşteri" };
  const role = roleName[user.role];
  const initialScreen: Screen = user.role === "technician" ? "technician" : user.role === "courier" ? "courier" : user.role === "customer" ? "customer" : "dispatch";
  const [requests, setRequests] = useState<RepairRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestsError, setRequestsError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  // /api/live değişim gördüğünde artar; bağlı tüm ekran verileri sessizce yeniden yüklenir.
  const [liveTick, setLiveTick] = useState(0);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Tüm talepler");
  const [sameDistrictOnly, setSameDistrictOnly] = useState(false);
  const [technicianView, setTechnicianView] = useState<"current" | "history">("current");
  const [courierView, setCourierView] = useState<"current" | "completed">("current");
  const [requestPage, setRequestPage] = useState(1);
  const [screen] = useState<Screen>(initialScreen);
  const [technicianJobStatus, setTechnicianJobStatus] = useState<TechnicianJobStatus>("offer");
  const [technicianPending, setTechnicianPending] = useState(false);
  const [approvalPending, setApprovalPending] = useState(false);
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
  const [availabilityPending, setAvailabilityPending] = useState(false);
  const [notice, setNotice] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [detailRequestId, setDetailRequestId] = useState("");
  const [detailEvents, setDetailEvents] = useState<RepairEvent[]>([]);
  const [createPending, setCreatePending] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [tab, setTab] = useState<"Uygun ustalar" | "Teklif geçmişi">("Uygun ustalar");
  const [sentOffers, setSentOffers] = useState<SentOffer[]>([]);
  const [offerPending, setOfferPending] = useState(false);
  const selected = requests.find((request) => request.id === selectedId) ?? requests[0];
  const detailRequest = requests.find((request) => request.id === detailRequestId);

  useEffect(() => {
    let active = true;
    async function loadData(silent = false) {
      if (!silent) { setRequestsLoading(true); setRequestsError(""); }
      try {
        const [requestResponse, technicianResponse, activityResponse] = await Promise.all([
          fetch("/api/requests", { cache: "no-store" }),
          screen === "dispatch" ? fetch("/api/technicians", { cache: "no-store" }) : Promise.resolve(null),
          screen === "dispatch" ? fetch("/api/activity", { cache: "no-store" }) : Promise.resolve(null),
        ]);
        if (!requestResponse.ok) throw new Error("Talepler yüklenemedi. Tekrar deneyin.");
        const requestData = await requestResponse.json() as { requests?: Record<string, unknown>[] };
        if (technicianResponse && !technicianResponse.ok) throw new Error("Usta listesi yüklenemedi. Bağlantıyı kontrol edip tekrar deneyin.");
        if (activityResponse && !activityResponse.ok) throw new Error("Son hareketler yüklenemedi. Bağlantıyı kontrol edip tekrar deneyin.");
        if (!active) return;
        const mapped = (requestData?.requests ?? []).map(mapRequest);
        setRequests(mapped);
        setSelectedId((current) => current || mapped[0]?.id || "");
        if (technicianResponse) {
          const data = await technicianResponse.json() as { technicians?: Record<string, unknown>[] };
          if (active) setTechnicians((data.technicians ?? []).map(mapTechnician));
        }
        if (activityResponse) {
          const data = await activityResponse.json() as { events?: Record<string, unknown>[] };
          if (active) setRecentActivity((data.events ?? []).map(mapRepairEvent));
        }
      } catch {
        if (active && !silent) setRequestsError("Talepler yüklenemedi. Bağlantıyı kontrol edip tekrar deneyin.");
      } finally {
        if (active && !silent) setRequestsLoading(false);
      }
    }
    void loadData(liveTick > 0);
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void loadData(true); }, 15000);
    return () => { active = false; window.clearInterval(timer); };
  }, [screen, reloadKey, liveTick]);

  // Değişim işaretini kısa aralıklarla kontrol eder; yalnızca değişiklik olduğunda veri çeker.
  useEffect(() => {
    let active = true;
    let lastStamp: string | null = null;
    async function checkLive() {
      if (document.visibilityState !== "visible") return;
      try {
        const response = await fetch("/api/live", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json() as { stamp?: string };
        if (!active || !data.stamp) return;
        if (lastStamp !== null && data.stamp !== lastStamp) setLiveTick((tick) => tick + 1);
        lastStamp = data.stamp;
      } catch {
        // Ağ hatasında bir sonraki kontrol denenir.
      }
    }
    void checkLive();
    const timer = window.setInterval(() => void checkLive(), 3000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  useEffect(() => {
    if (screen !== "dispatch" || !selected?.dbId) return;
    let active = true;
    const loadOffers = () => fetch(`/api/requests/${selected.dbId}/offers`, { cache: "no-store" })
      .then(async (response) => response.ok ? await response.json() as { offers?: Record<string, unknown>[] } : null)
      .then((data) => {
        if (!active) return;
        setSentOffers((data?.offers ?? []).map((offer) => ({
          offerId: String(offer.id), requestId: selected.id, technicianId: String(offer.technician_id),
          technician: String(offer.technician_name), status: String(offer.status), createdAt: String(offer.created_at),
        })));
      })
      .catch(() => { if (active) setSentOffers([]); });
    void loadOffers();
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void loadOffers(); }, 15000);
    return () => { active = false; window.clearInterval(timer); };
  }, [screen, selected?.dbId, selected?.id, liveTick]);

  async function loadDeliveries(silent = false) {
    if (!silent) { setDeliveryLoading(true); setDeliveryError(""); }
    try {
      const response = await fetch("/api/deliveries", { cache: "no-store" });
      const data = await response.json() as { deliveries?: Delivery[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Teslimatlar yüklenemedi.");
      setDeliveries(data.deliveries ?? []);
      setSelectedDeliveryId((current) => current || data.deliveries?.[0]?.id || "");
    } catch (error) { if (!silent) setDeliveryError(error instanceof Error ? error.message : "Teslimatlar yüklenemedi."); }
    finally { if (!silent) setDeliveryLoading(false); }
  }
  useEffect(() => {
    if (screen === "courier") void loadDeliveries();
    if (screen === "dispatch") fetch("/api/couriers", { cache: "no-store" }).then(async (response) => {
      const data = await response.json() as { couriers?: Courier[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Kuryeler yüklenemedi.");
      setCouriers(data.couriers ?? []);
    }).catch((error: unknown) => setDeliveryError(error instanceof Error ? error.message : "Kuryeler yüklenemedi."));
  }, [screen]);
  useEffect(() => {
    if (screen === "courier" && liveTick > 0 && !deliveryPending) void loadDeliveries(true);
  }, [liveTick]);
  useEffect(() => {
    if (screen !== "courier" || deliveryPending) return;
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void loadDeliveries(true); }, 15000);
    return () => window.clearInterval(timer);
  }, [screen, deliveryPending]);
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
  const technicianJobs = requests.filter((request) => request.offerId && (technicianView === "history" ? ["declined", "cancelled"].includes(request.offerStatus ?? "") || ["ready_for_delivery", "completed", "cancelled"].includes(request.statusRaw) : ["pending", "accepted"].includes(request.offerStatus ?? "") && !["ready_for_delivery", "completed", "cancelled"].includes(request.statusRaw)));
  const activeTechnicianJob = technicianJobs.find((request) => request.id === selectedId) ?? technicianJobs[0];
  const customerRequest = requests.find((request) => request.id === selectedId) ?? requests[0];
  const trackedRequest = screen === "customer" ? customerRequest : screen === "technician" ? activeTechnicianJob : undefined;
  const selectedCustody = selected ? getDeviceCustody(selected) : { holder: "Müşteride" as const, detail: "Yeni talep bekleniyor", kind: "customer" as const };
  const needsTechnician = requests.filter((request) => request.status === "Yeni talep" || request.status === "Usta aranıyor").length;
  const availableTechnicians = technicians.filter((technician) => technician.available).length;
  const visibleTechnicians = technicians.filter((technician) => !sameDistrictOnly || Boolean(selected?.district && technician.district && technician.district.toLocaleLowerCase("tr-TR") === selected.district.toLocaleLowerCase("tr-TR")));
  const visibleAvailableTechnicians = visibleTechnicians.filter((technician) => technician.available).length;
  const profileName = user.name;
  const profileInitials = user.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toLocaleUpperCase("tr-TR");
  const screenTitle = screen === "dispatch" ? role === "Admin" ? "Yönetim" : "Operasyon" : screen === "technician" ? "Usta paneli" : screen === "courier" ? "Kurye paneli" : "Cihaz takibi";

  function goToPanel(selector: string, focusInput = false) {
    setMobileNav(false);
    const target = document.querySelector<HTMLElement>(selector);
    if (!target) { setNotice("Bu alanda henüz gösterilecek kayıt yok."); return; }
    if (target instanceof HTMLDetailsElement) target.open = true;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    if (focusInput) target.querySelector<HTMLInputElement>("input")?.focus();
  }

  useEffect(() => { setEventHistory([]); }, [trackedRequest?.dbId]);

  useEffect(() => {
    if (!trackedRequest?.dbId) {
      setEventHistory([]);
      return;
    }
    let active = true;
    const loadEvents = () => fetch(`/api/requests/${trackedRequest.dbId}/events`, { cache: "no-store" })
      .then(async (response) => response.ok ? await response.json() as { events?: Record<string, unknown>[] } : null)
      .then((data) => { if (active) setEventHistory((data?.events ?? []).map(mapRepairEvent)); })
      .catch(() => { if (active) setEventHistory([]); });
    void loadEvents();
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void loadEvents(); }, 15000);
    return () => { active = false; window.clearInterval(timer); };
  }, [trackedRequest?.dbId, liveTick]);

  useEffect(() => {
    if (!detailRequest?.dbId) { setDetailEvents([]); return; }
    let active = true;
    fetch(`/api/requests/${detailRequest.dbId}/events`, { cache: "no-store" })
      .then(async (response) => response.ok ? await response.json() as { events?: Record<string, unknown>[] } : null)
      .then((data) => { if (active) setDetailEvents((data?.events ?? []).map(mapRepairEvent)); })
      .catch(() => { if (active) setDetailEvents([]); });
    return () => { active = false; };
  }, [detailRequest?.dbId, liveTick]);

  useEffect(() => {
    if (!detailRequestId) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setDetailRequestId(""); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [detailRequestId]);

  useEffect(() => {
    if (screen === "technician") setTechnicianJobStatus(mapTechnicianJobStatus(activeTechnicianJob));
  }, [screen, activeTechnicianJob?.dbId, activeTechnicianJob?.statusRaw, activeTechnicianJob?.offerStatus]);

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

  async function updateTechnicianStatus(nextStatus: TechnicianJobStatus, note?: string) {
    if (!activeTechnicianJob || technicianPending) return;
    setTechnicianPending(true);
    const url = nextStatus === "accepted" || nextStatus === "declined"
      ? `/api/offers/${activeTechnicianJob.offerId}`
      : `/api/requests/${activeTechnicianJob.dbId}/status`;
    const status = nextStatus === "accepted" ? "accepted" : nextStatus === "declined" ? "declined" : nextStatus === "diagnosing" ? "diagnosing" : nextStatus === "review" ? "quote_review" : nextStatus === "repairing" ? "in_repair" : nextStatus === "parts" ? "waiting_parts" : "ready_for_delivery";
    try {
      const response = await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, ...(note ? { note } : {}) }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "İş durumu kaydedilemedi.");
      setTechnicianJobStatus(nextStatus);
      const rawStatus = nextStatus === "accepted" ? "assigned" : nextStatus === "diagnosing" ? "diagnosing" : nextStatus === "review" ? "quote_review" : nextStatus === "repairing" ? "in_repair" : nextStatus === "parts" ? "waiting_parts" : nextStatus === "completed" ? "ready_for_delivery" : "reviewing";
      setRequests((current) => current.map((request) => request.dbId === activeTechnicianJob.dbId ? { ...request, statusRaw: rawStatus, repairNotes: note || request.repairNotes, offerStatus: nextStatus === "accepted" ? "accepted" : nextStatus === "declined" ? "declined" : request.offerStatus } : request));
      void refreshRequestEvents(activeTechnicianJob.dbId);
      setNotice(nextStatus === "accepted" ? "İş sana atandı." : nextStatus === "declined" ? "Teklif reddedildi." : "İş durumu güncellendi.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "İş durumu kaydedilemedi.");
    } finally {
      setTechnicianPending(false);
    }
    window.setTimeout(() => setNotice(""), 3200);
  }
  async function saveRepairNote(note: string) {
    if (!activeTechnicianJob || technicianPending) return;
    setTechnicianPending(true);
    try {
      const response = await fetch(`/api/requests/${activeTechnicianJob.dbId}/notes`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note }) });
      const data = await response.json() as { note?: string; error?: string };
      if (!response.ok || !data.note) throw new Error(data.error ?? "İşlem notu kaydedilemedi.");
      setRequests((current) => current.map((request) => request.dbId === activeTechnicianJob.dbId ? { ...request, repairNotes: data.note } : request));
      void refreshRequestEvents(activeTechnicianJob.dbId);
      setNotice("İşlem notu kaydedildi.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "İşlem notu kaydedilemedi."); }
    finally { setTechnicianPending(false); }
  }
  const filteredRequests = useMemo(() => requests.filter((request) => {
    const matchesQuery = `${request.id} ${request.customer} ${request.device} ${request.issue} ${request.district}`.toLowerCase().includes(query.toLowerCase());
    const matchesFilter = filter === "Tüm talepler" || request.status === filter;
    return matchesQuery && matchesFilter;
  }), [filter, query, requests]);
  const pageCount = Math.max(1, Math.ceil(filteredRequests.length / 10));
  const currentPage = Math.min(requestPage, pageCount);
  const visibleRequests = filteredRequests.slice((currentPage - 1) * 10, currentPage * 10);

  async function sendOffer(technician: Technician) {
    if (!selected || offerPending) return;
    setOfferPending(true);
    try {
      const response = await fetch(`/api/requests/${selected.dbId}/offers`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ technicianId: technician.id }),
      });
      const result = await response.json() as { error?: string; offer?: { id: string; status: string; created_at: string } };
      if (!response.ok) throw new Error(result.error ?? "Teklif gönderilemedi.");
      setRequests((current) => current.map((request) => request.dbId === selected.dbId ? { ...request, status: "Teklif gönderildi", statusRaw: "offered" } : request));
      if (result.offer) setSentOffers((current) => [...current, { offerId: result.offer!.id, requestId: selected.id, technicianId: technician.id, technician: technician.name, status: result.offer!.status, createdAt: result.offer!.created_at }]);
      void refreshRecentActivity();
      setNotice(`${technician.name} adlı ustaya teklif gönderildi.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Teklif gönderilemedi.");
    } finally {
      setOfferPending(false);
    }
    window.setTimeout(() => setNotice(""), 3200);
  }

  async function createRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (createPending) return;
    setCreatePending(true);
    const formData = new FormData(event.currentTarget);
    const customer = String(formData.get("customer") || "Yeni Müşteri");
    try {
    const response = await fetch("/api/requests", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerName: customer, customerEmail: String(formData.get("customerEmail") ?? "").trim(), phone: String(formData.get("phone") ?? "").trim(), device: String(formData.get("device") ?? "").trim(), issue: String(formData.get("issue") ?? "").trim(), city: String(formData.get("city") ?? "").trim(), district: String(formData.get("district") ?? "").trim(), deliveryAddress: String(formData.get("deliveryAddress") ?? "").trim(), description: String(formData.get("description") ?? "") }),
    });
    const result = await response.json() as { request?: Record<string, unknown>; error?: string };
    if (!response.ok || !result.request) { setNotice(result.error ?? "Talep oluşturulamadı."); return; }
    const newRequest = mapRequest({ ...result.request, customer_name: customer, device: String(formData.get("device") || "iPhone 13"), issue: String(formData.get("issue") || "Ekran değişimi"), district: String(formData.get("district") ?? ""), city: String(formData.get("city") ?? ""), delivery_address: String(formData.get("deliveryAddress") ?? "") });
    setRequests((current) => [newRequest, ...current]);
    setSelectedId(newRequest.id);
    setShowCreate(false);
    setNotice("Yeni talep oluşturuldu.");
    void refreshRecentActivity();
    window.setTimeout(() => setNotice(""), 3200);
    } catch {
      setNotice("Talep oluşturulamadı. Bağlantıyı kontrol edip tekrar dene.");
    } finally {
      setCreatePending(false);
    }
  }

  return (
    <main className="app-shell">
      <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
        <div className="brand"><Image className="brand-mark-image" src="/brand/alojetcep-emblem.png" alt="" width={40} height={40} /><span>AloJet<span className="brand-light">Cep</span></span><button className="icon-button nav-close" aria-label="Menüyü kapat" onClick={() => setMobileNav(false)}><X size={18} /></button></div>
        <div className="workspace-label">{screen === "dispatch" ? role === "Admin" ? "YÖNETİM" : "OPERASYON" : screen === "technician" ? "USTA PANELİ" : screen === "courier" ? "KURYE PANELİ" : "MÜŞTERİ"}</div>
        <nav className="main-nav" aria-label="Ana menü">
          {screen === "dispatch" ? <>
            <button className="nav-item active" onClick={() => { setMobileNav(false); window.scrollTo({ top: 0, behavior: "smooth" }); }}><Activity size={18} /><span>Genel Bakış</span></button>
            <Link className="nav-item" href="/panel/talepler" onClick={() => setMobileNav(false)}><FileText size={18} /><span>Talepler</span><span className="nav-count">{requests.length}</span></Link>
            <Link className="nav-item" href="/panel/ustalar" onClick={() => setMobileNav(false)}><Users size={18} /><span>Ustalar</span><span className="presence-dot" /></Link>
            <button className="nav-item" onClick={() => goToPanel(".table-toolbar", true)}><Smartphone size={18} /><span>Müşteri ara</span></button>
          </> : screen === "technician" ? <>
            <button className={`nav-item ${technicianView === "current" ? "active" : ""}`} onClick={() => { setTechnicianView("current"); setMobileNav(false); }}><Wrench size={18} /><span>İşlerim</span></button>
            <button className={`nav-item ${technicianView === "history" ? "active" : ""}`} onClick={() => { setTechnicianView("history"); setMobileNav(false); }}><ClipboardCheck size={18} /><span>İş geçmişim</span></button>
            <Link className="nav-item" href="/panel/faturalar" onClick={() => setMobileNav(false)}><FileText size={18} /><span>Faturalarım</span></Link>
            <button className="nav-item" onClick={() => { setMobileNav(false); setShowProfile(true); }}><UserRound size={18} /><span>Profilim</span></button>
          </> : screen === "courier" ? <>
            <button className={`nav-item ${courierView === "current" ? "active" : ""}`} onClick={() => { setCourierView("current"); setMobileNav(false); }}><PackageCheck size={18} /><span>Teslimatlarım</span></button>
            <button className={`nav-item ${courierView === "completed" ? "active" : ""}`} onClick={() => { setCourierView("completed"); setMobileNav(false); }}><CheckCircle2 size={18} /><span>Tamamlananlar</span></button>
          </> : <>
            <button className="nav-item active" onClick={() => { setMobileNav(false); window.scrollTo({ top: 0, behavior: "smooth" }); }}><Smartphone size={18} /><span>Cihazım</span></button>
            <button className="nav-item" onClick={() => goToPanel(".customer-event-history")}><FileText size={18} /><span>Talep geçmişi</span></button>
            <Link className="nav-item" href="/panel/faturalar" onClick={() => setMobileNav(false)}><ReceiptText size={18} /><span>Faturalarım</span></Link>
          </>}
        </nav>
        {screen === "dispatch" && <>
          <div className="sidebar-divider" />
          <div className="workspace-label">YÖNETİM</div>
          <nav className="main-nav" aria-label="Yönetim menüsü">
            <button className="nav-item" onClick={() => goToPanel(".metric-grid")}><Activity size={18} /><span>Operasyon özeti</span></button>
            {role === "Admin" && <Link className="nav-item" href="/admin/users"><ShieldCheck size={18} /><span>Kullanıcı ve roller</span></Link>}
            {role === "Admin" && <Link className="nav-item" href="/panel/faturalar"><ReceiptText size={18} /><span>Fatura ve maliyetler</span></Link>}
            <button className="nav-item" onClick={() => { setMobileNav(false); setShowProfile(true); }}><Settings2 size={18} /><span>Hesabım</span></button>
          </nav>
        </>}
        <div className="sidebar-bottom">

          <button className="profile-row" aria-label="Kullanıcı profili" onClick={() => { setMobileNav(false); setShowProfile(true); }}><div className="avatar avatar-self">{profileInitials}</div><span className="profile-copy"><strong>{profileName}</strong><small>{role} hesabı</small></span><MoreHorizontal size={19} /></button>
        </div>
      </aside>

      {mobileNav && <button className="mobile-scrim" aria-label="Menüyü kapat" onClick={() => setMobileNav(false)} />}

      <section className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-menu" aria-label="Menüyü aç" onClick={() => setMobileNav(true)}><Menu size={20} /></button>
          <div className="breadcrumbs"><span>Çalışma alanı</span><ChevronRight size={14} /><strong>{screenTitle}</strong></div>
          <div className="topbar-actions">
            <span className="role-badge">{role}</span>
            {screen !== "courier" && <button className="icon-button notification-button" aria-label="Son hareketler" onClick={() => setShowActivity(true)}><Bell size={18} /></button>}
            <div className="top-avatar avatar avatar-self">{profileInitials}</div>
          </div>
        </header>

        <div className="content">
          {screen === "customer" && requests.length > 1 && <label className="panel-request-picker">Takip etmek istediğin talep<select value={customerRequest?.id ?? ""} onChange={(event) => setSelectedId(event.target.value)}>{requests.map((request) => <option key={request.dbId} value={request.id}>{request.id} · {request.device}</option>)}</select></label>}
          {screen === "technician" && technicianJobs.length > 1 && <label className="panel-request-picker">İş seç<select value={activeTechnicianJob?.id ?? ""} onChange={(event) => { const job = technicianJobs.find((item) => item.id === event.target.value); setSelectedId(event.target.value); setTechnicianJobStatus(mapTechnicianJobStatus(job)); }}>{technicianJobs.map((request) => <option key={request.dbId} value={request.id}>{request.id} · {request.device} · {request.customer}</option>)}</select></label>}
          {requestsLoading && screen !== "courier" ? <section className="panel request-empty-state" role="status"><h1>Bilgiler yükleniyor.</h1></section> : requestsError && screen !== "courier" ? <section className="panel request-empty-state" role="alert"><h1>Bilgiler yüklenemedi.</h1><p>{requestsError}</p><button className="button button-primary" onClick={() => setReloadKey((current) => current + 1)}>Tekrar dene</button></section> : screen === "dispatch" && requests.length === 0 ? <section className="panel request-empty-state"><span className="empty-state-icon"><FileText size={23}/></span><span className="eyebrow">OPERASYON KUYRUĞU</span><h1>Henüz talep yok.</h1><p>Müşterilerden gelen yeni tamir talepleri burada listelenecek.</p><button className="button button-primary" onClick={() => setShowCreate(true)}><Plus size={17}/> Yeni talep oluştur</button></section> : screen === "dispatch" ? <>
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
              <div className="panel-heading"><div><div className="title-line"><h2>1. Talebi seç</h2><span className="count-pill">{filteredRequests.length}</span></div><p>Seçtiğiniz talebin ayrıntıları sağda açılır.</p></div><button className="button button-secondary button-small" onClick={() => { setQuery(""); setFilter("Tüm talepler"); setRequestPage(1); }}><span>Tüm talepler</span><ArrowRight size={15} /></button></div>
              <div className="table-toolbar">
                <label className="search-box"><Search size={16} /><input value={query} onChange={(event) => { setQuery(event.target.value); setRequestPage(1); }} placeholder="Talep, müşteri veya cihaz ara" /></label>
                <div className="toolbar-right"><label className="filter-select"><Filter size={14}/><select value={filter} onChange={(event) => { setFilter(event.target.value); setRequestPage(1); }} aria-label="Talepleri filtrele"><option>Tüm talepler</option><option>Yeni talep</option><option>Usta aranıyor</option><option>Teklif gönderildi</option><option>Atandı</option><option>Tamir sürüyor</option><option>Onay bekliyor</option><option>Parça bekliyor</option><option>Teslimata hazır</option><option>Tamamlandı</option></select><ChevronDown size={13}/></label></div>
              </div>
              <div className="request-table-wrap"><table className="request-table"><thead><tr><th>MÜŞTERİ / CİHAZ</th><th>ARIZA</th><th>KONUM</th><th>DURUM / CİHAZ KİMDE</th><th>GELİŞ</th><th><span className="sr-only">İşlem</span></th></tr></thead><tbody>{visibleRequests.map((request) => { const custody = getDeviceCustody(request); const CustodyIcon = custody.kind === "courier" ? Truck : custody.kind === "technician" ? Wrench : Smartphone; return <tr key={request.id} onClick={() => { setSelectedId(request.id); setDetailRequestId(request.id); }} className={selectedId === request.id ? "row-selected" : ""} tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter") { setSelectedId(request.id); setDetailRequestId(request.id); } }}><td data-label="Müşteri / cihaz"><div className="customer-cell"><div className={`avatar avatar-${request.initials.length}`}>{request.initials}</div><div className="customer-info"><strong>{request.customer}{request.priority === "Acil" && <span className="urgent-mark" title="Öncelikli talep">!</span>}</strong><span>{request.id} <i/> {request.device}</span></div></div></td><td data-label="Arıza" className="issue-cell">{request.issue}</td><td data-label="Konum"><span className="location-cell"><MapPin size={13}/>{request.district}</span></td><td data-label="Durum / cihaz kimde"><div className="request-status-stack"><span className={`status-badge ${statusClass[request.status]}`}><i/>{request.status}</span><span className={`custody-chip custody-${custody.kind}`}><CustodyIcon size={14}/><strong>{custody.holder}</strong></span><small>{custody.detail}</small></div></td><td data-label="Geliş" className="time-cell">{request.created}</td><td data-label="İşlem"><button className="row-more" aria-label={`${request.id} detaylarını aç`} onClick={(event) => { event.stopPropagation(); setSelectedId(request.id); setDetailRequestId(request.id); }}><MoreHorizontal size={17}/></button></td></tr>; })}</tbody></table>{filteredRequests.length === 0 && <div className="empty-results"><Search size={20}/><strong>Sonuç bulunamadı</strong><span>Arama veya filtre kriterlerini değiştirebilirsin.</span></div>}</div>
              <section className="queue-activity" aria-label="Son operasyon hareketleri">
                <div className="queue-activity-heading"><h3>Son hareketler</h3><span>En yeni 3 kayıt</span></div>
                <div className="queue-activity-list">
                  {recentActivity.slice(0, 3).map((event) => <article key={event.id}><span className={`activity-mark ${event.eventType === "request_created" ? "mark-new" : event.eventType === "offer_sent" ? "mark-offer" : "mark-assigned"}`}>{event.eventType === "request_created" ? <Plus size={14}/> : event.eventType === "offer_sent" ? <ArrowRight size={14}/> : <Activity size={14}/>}</span><div><strong>{describeRepairEvent(event)}</strong><span>{event.reference} · {event.device} · {event.issue}</span></div><time>{formatRepairEventTime(event.createdAt)}</time></article>)}
                  {recentActivity.length === 0 && <div className="history-empty"><Clock3 size={21}/><strong>Henüz talep hareketi yok</strong><span>Yeni talepler ve durum değişiklikleri burada görünür.</span></div>}
                </div>
              </section>
              <footer className="table-footer"><span>Listelenen <strong>{requests.length}</strong> talepten <strong>{filteredRequests.length}</strong> tanesi filtreye uyuyor</span><div className="pagination"><button aria-label="Önceki sayfa" disabled={currentPage <= 1} onClick={() => setRequestPage(currentPage - 1)}><ChevronLeft size={16}/></button><span>Sayfa {currentPage} / {pageCount}</span><button aria-label="Sonraki sayfa" disabled={currentPage >= pageCount} onClick={() => setRequestPage(currentPage + 1)}><ChevronRight size={16}/></button></div></footer>
            </section>

            <aside className="matching-panel panel">
              <div className="matching-heading"><div><div className="title-line"><h2>2. Ustaya teklif gönder</h2><span className="live-pill"><span/> CANLI</span></div><p>Ustaların müsaitliğini ve ilçesini kontrol edip teklif gönder.</p></div></div>
              <div className="selected-request"><div className="selected-request-top"><span className="selected-label">SEÇİLİ TALEP</span><span className="request-code">{selected?.id}</span></div><div className="selected-device"><div className="device-icon"><Smartphone size={20}/></div><div><strong>{selected?.device}</strong><span>{selected?.issue}</span></div><span className={`status-badge compact ${statusClass[selected?.status ?? "Yeni talep"]}`}><i/>{selected?.status}</span></div><div className="selected-meta"><span><UserRound size={13}/>{selected?.customer}</span><span><MapPin size={13}/>{selected?.district}</span>{selected?.imei && <span>IMEI: {selected.imei}</span>}</div></div>
              <div className={`selected-custody custody-${selectedCustody.kind}`}><div className="custody-icon">{selectedCustody.kind === "courier" ? <Truck size={20}/> : selectedCustody.kind === "technician" ? <Wrench size={20}/> : <Smartphone size={20}/>}</div><div><span>CİHAZ ŞU ANDA KİMDE?</span><strong>{selectedCustody.holder}</strong><small>{selectedCustody.detail}</small></div><span className="custody-live"><i/>Güncel</span></div>
              {selected?.statusRaw === "quote_review" && <QuoteReviewPanel key={selected.dbId} request={selected} onDone={(message) => { setLiveTick((tick) => tick + 1); setNotice(message); window.setTimeout(() => setNotice(""), 3200); }} />}<div className="delivery-assignment"><h3>Kurye ataması</h3>{selected && <DeliveryAddress key={selected.dbId} requestId={selected.dbId} initialAddress={selected.deliveryAddress} disabled={["completed", "cancelled"].includes(selected.statusRaw)} onSaved={(address) => { setRequests((current) => current.map((item) => item.dbId === selected.dbId ? { ...item, deliveryAddress: address } : item)); void refreshRecentActivity(); }} />}{selected?.assignedCourierName && <p>Atanan kurye: <strong>{selected.assignedCourierName}</strong></p>}{selected && !selected.deliveryStatus && selected.statusRaw !== "approved" && <p>Müşteri teklifi onaylayınca kurye atanabilir.</p>}{selected && (selected.deliveryStatus ? ["assigned", "accepted", "at_shop"].includes(selected.deliveryStatus) : selected.statusRaw === "approved") && <><label htmlFor="courier-select">Kurye seç</label><select id="courier-select" value={courierId} onChange={(event) => setCourierId(event.target.value)}><option value="">Kurye seçin</option>{couriers.map((courier) => <option key={courier.id} value={courier.id}>{courier.full_name}{courier.district ? ` · ${courier.district}` : ""}</option>)}</select><button className="button button-primary" disabled={!courierId || deliveryPending} aria-busy={deliveryPending} onClick={assignCourier}>{deliveryPending ? "Kaydediliyor…" : selected.deliveryStatus ? "Kuryeyi değiştir" : "Kurye ata"}</button>{couriers.length === 0 && !deliveryError && <p>Atanabilecek kurye bulunamadı.</p>}</>}{deliveryError && <p role="alert">{deliveryError}</p>}</div>
              <div className="match-summary"><span><strong>{visibleAvailableTechnicians}</strong> müsait usta bulundu</span><button className="text-button" aria-pressed={sameDistrictOnly} onClick={() => setSameDistrictOnly((current) => !current)}><SlidersHorizontal size={13}/> {sameDistrictOnly ? "Tüm ilçeler" : "Aynı ilçe"}</button></div>
              <div className="matching-tabs" role="tablist"><button role="tab" aria-selected={tab === "Uygun ustalar"} className={tab === "Uygun ustalar" ? "tab-active" : ""} onClick={() => setTab("Uygun ustalar")}>Ustalar <span>{visibleAvailableTechnicians}</span></button><button role="tab" aria-selected={tab === "Teklif geçmişi"} className={tab === "Teklif geçmişi" ? "tab-active" : ""} onClick={() => setTab("Teklif geçmişi")}>Teklif geçmişi</button></div>
              {tab === "Uygun ustalar" ? <div className="technician-list">{visibleTechnicians.map((technician, index) => { const alreadySent = selectedOffers.some((offer) => offer.technicianId === technician.id); return <article className="technician-card" key={technician.id}><div className="technician-top"><div className={`avatar tech-avatar tech-${index}`}>{technician.initials}</div><div className="technician-identity"><div className="technician-name">{technician.name}</div><span>{technician.shop}</span></div></div><div className="technician-details"><span><MapPin size={12}/>{technician.district || "Konum belirtilmemiş"}</span></div><div className="specialty-list">{technician.specialties.map((specialty) => <span key={specialty}>{specialty}</span>)}</div><div className="technician-action"><span className={technician.available ? "availability available" : "availability unavailable"}><i/>{technician.available ? "Müsait" : "Meşgul"}</span><button className={`button ${alreadySent ? "button-sent" : "button-offer"}`} disabled={!technician.available || alreadySent || offerPending || !selected || !["new", "reviewing", "offered"].includes(selected.statusRaw)} onClick={() => sendOffer(technician)}>{alreadySent ? <><Check size={14}/> Gönderildi</> : "Teklif gönder"}</button></div></article>; })}</div> : <div className="history-list">{selectedOffers.length ? selectedOffers.map((offer) => <div className="history-item" key={`${offer.requestId}-${offer.technician}`}><div className="history-icon"><Check size={15}/></div><div><strong>{offer.technician}</strong><span>{offer.status === "accepted" ? "Kabul edildi" : offer.status === "declined" ? "Reddedildi" : offer.status === "cancelled" ? "Kapatıldı" : "Yanıt bekleniyor"}</span></div><time>{formatRepairEventTime(offer.createdAt)}</time></div>) : <div className="history-empty"><Clock3 size={21}/><strong>Henüz teklif yok</strong><span>Bu talep için gönderilen teklifler burada görünecek.</span></div>}</div>}
              <div className="manual-note"><div className="manual-note-icon"><UserRound size={14}/></div><span>Teklif gönderimi görevli onayıyla yapılır. Atama, usta kabul ettiğinde tamamlanır.</span></div>
            </aside>
          </div>

          <div className="bottom-strip"><div><span className="bottom-mark"><Activity size={15}/></span><span><strong>Operasyon hareketleri</strong><small>Son kayıtları incele</small></span></div><button className="text-button" onClick={() => setShowActivity(true)}>Aktivite günlüğü <ArrowRight size={14}/></button></div>
          </> : screen === "technician" ? <TechnicianDashboard history={technicianView === "history"} name={user.name} job={activeTechnicianJob} status={technicianJobStatus} eventHistory={eventHistory} onStatusChange={updateTechnicianStatus} onSaveNote={saveRepairNote} pending={technicianPending} available={technicianAvailable} availabilityPending={availabilityPending} onAvailabilityChange={async (available) => {
            if (availabilityPending) return;
            setAvailabilityPending(true);
            try {
            const response = await fetch("/api/me/availability", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ available }) });
            if (!response.ok) { setNotice("Müsaitlik durumun kaydedilemedi."); return; }
            setTechnicianAvailable(available);
            } catch { setNotice("Müsaitlik durumun kaydedilemedi."); }
            finally { setAvailabilityPending(false); }
          }} /> : screen === "courier" ? <CourierDashboard deliveries={deliveries.filter((delivery) => courierView === "completed" ? delivery.delivery_status === "delivered" : delivery.delivery_status !== "delivered")} selectedId={selectedDeliveryId} onSelect={setSelectedDeliveryId} loading={deliveryLoading} error={deliveryError} pending={deliveryPending} onRetry={() => void loadDeliveries()} onStatusChange={updateDelivery} /> : customerRequest ? <CustomerTracking request={customerRequest} status={mapCustomerJobStatus(customerRequest)} courierStatus={customerRequest.deliveryStatus} eventHistory={eventHistory} pending={approvalPending} onApprove={async () => {
            if (approvalPending) return;
            setApprovalPending(true);
            try {
            const response = await fetch(`/api/requests/${customerRequest.dbId}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "approved" }) });
            const result = await response.json() as { error?: string };
            if (!response.ok) { setNotice(result.error ?? "Onay kaydedilemedi."); return; }
            setRequests((current) => current.map((request) => request.dbId === customerRequest.dbId ? { ...request, statusRaw: "approved" } : request));
            void refreshRequestEvents(customerRequest.dbId);
            setNotice("İşlem onayınız kaydedildi.");
            } catch { setNotice("Onay kaydedilemedi. Tekrar deneyin."); }
            finally { setApprovalPending(false); }
          }} /> : <section className="panel request-empty-state"><span className="empty-state-icon"><Smartphone size={23}/></span><span className="eyebrow">CİHAZ TAKİBİ</span><h1>Henüz açık talebin yok.</h1><p>Telefonun için yeni bir tamir talebi oluştur.</p><Link className="button button-primary" href="/talep"><Plus size={17}/> Tamir talebi oluştur</Link></section>}
        </div>
      </section>

      {notice && <div className="toast" role="status"><span className="toast-check"><Check size={15}/></span>{notice}<button aria-label="Bildirimi kapat" onClick={() => setNotice("")}><X size={15}/></button></div>}
      {showActivity && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowActivity(false); }} onKeyDown={(event) => { if (event.key === "Escape") setShowActivity(false); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="activity-title"><div className="modal-header"><div><h2 id="activity-title">Son hareketler</h2><p>{screen === "dispatch" ? "Operasyondaki son kayıtlar" : "Seçili talebin geçmişi"}</p></div><button className="icon-button" aria-label="Pencereyi kapat" onClick={() => setShowActivity(false)}><X size={18}/></button></div><div className="modal-body">{(screen === "dispatch" ? recentActivity : eventHistory).length ? (screen === "dispatch" ? recentActivity : eventHistory).map((event) => <div key={event.id}><strong>{describeRepairEvent(event)}</strong><p>{event.reference} · {formatRepairEventTime(event.createdAt)}</p></div>) : <p>Henüz hareket bulunmuyor.</p>}</div><div className="modal-footer"><button className="button button-secondary" onClick={() => setShowActivity(false)}>Kapat</button></div></section></div>}
      {showProfile && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowProfile(false); }} onKeyDown={(event) => { if (event.key === "Escape") setShowProfile(false); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="profile-title"><div className="modal-header"><div><h2 id="profile-title">Hesabım</h2><p>Hesap bilgilerin ve oturumun</p></div><button className="icon-button" aria-label="Pencereyi kapat" onClick={() => setShowProfile(false)}><X size={18}/></button></div><div className="modal-body"><p><strong>Ad soyad:</strong> {user.name}</p><p><strong>E-posta:</strong> {user.email}</p><p><strong>Rol:</strong> {role}</p></div><div className="modal-footer"><button className="button button-secondary" onClick={() => setShowProfile(false)}>Kapat</button><button className="button button-primary" onClick={() => void signOut({ callbackUrl: "/giris" })}>Çıkış yap</button></div></section></div>}
      {showCreate && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowCreate(false); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-header"><div><span className="modal-kicker">YENİ KAYIT</span><h2 id="modal-title">Tamir talebi oluştur</h2><p>Müşteri adına yeni bir talep kaydı aç.</p></div><button className="icon-button" aria-label="Pencereyi kapat" onClick={() => setShowCreate(false)}><X size={18}/></button></div><form id="request-form" className="modal-body" onSubmit={createRequest}><label>Müşteri adı<input name="customer" placeholder="Ad soyad" required minLength={2} maxLength={80}/></label><label>Müşteri e-postası (isteğe bağlı)<input name="customerEmail" type="email" placeholder="Hesap e-postası" maxLength={254}/><small>Girildiğinde talep müşterinin hesabında görünür.</small></label><label>Müşteri telefonu<input name="phone" type="tel" placeholder="05xx xxx xx xx" required minLength={10}/></label><div className="form-row"><label>Telefon modeli<input name="device" list="staff-phone-models" placeholder="Marka ve model seç veya yaz" maxLength={120} required/><datalist id="staff-phone-models">{Object.entries(phoneModels).flatMap(([brand, models]) => models.map((model) => <option key={`${brand}-${model}`} value={`${brand.replaceAll("_", " ")} ${model}`} />))}</datalist></label><label>Arıza türü<select name="issue" defaultValue="Ekran değişimi"><option>Ekran değişimi</option><option>Pil değişimi</option><option>Şarj soketi</option></select></label></div><div className="form-row"><label>İl<input name="city" placeholder="İl" maxLength={50} required minLength={2}/></label><label>İlçe<input name="district" placeholder="İlçe" maxLength={50} required minLength={2}/></label></div><label>Cihazın alınacağı adres (isteğe bağlı)<textarea name="deliveryAddress" placeholder="Mahalle, sokak, bina ve daire" maxLength={300} rows={3}/></label><label>Arıza açıklaması<textarea name="description" placeholder="Müşterinin belirttiği sorunu kısaca yaz..." maxLength={500} rows={3}/></label></form><div className="modal-footer"><button className="button button-secondary" onClick={() => setShowCreate(false)}>Vazgeç</button><button type="submit" form="request-form" className="button button-primary" disabled={createPending} aria-busy={createPending}><Plus size={16}/> {createPending ? "Kaydediliyor…" : "Talep oluştur"}</button></div></section></div>}
      {detailRequest && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDetailRequestId(""); }}><section className="modal request-detail-modal" role="dialog" aria-modal="true" aria-labelledby="request-detail-title"><div className="modal-header"><div><span className="modal-kicker">TALEP DETAYI · {detailRequest.id}</span><h2 id="request-detail-title">{detailRequest.customer}</h2><p>{detailRequest.device} · {detailRequest.issue}</p></div><button className="icon-button" aria-label="Detayları kapat" onClick={() => setDetailRequestId("")}><X size={18}/></button></div><div className="modal-body request-detail-body"><div className="request-detail-status"><span className={`status-badge ${statusClass[detailRequest.status]}`}><i/>{detailRequest.status}</span><span className={`custody-chip custody-${getDeviceCustody(detailRequest).kind}`}><strong>{getDeviceCustody(detailRequest).holder}</strong> · {getDeviceCustody(detailRequest).detail}</span></div><div className="request-detail-grid"><p><strong>Talep numarası</strong><span>{detailRequest.id}</span></p><p><strong>Talep zamanı</strong><span>{detailRequest.created}</span></p><p><strong>Telefon</strong><span>{detailRequest.customerPhone || "Belirtilmemiş"}</span></p><p><strong>E-posta</strong><span>{detailRequest.customerEmail || "Belirtilmemiş"}</span></p><p><strong>Konum</strong><span>{detailRequest.district}{detailRequest.city ? `, ${detailRequest.city}` : ""}</span></p><p><strong>Atanan usta</strong><span>{detailRequest.assignedTechnician || "Henüz atanmadı"}</span></p><p><strong>Kurye</strong><span>{detailRequest.assignedCourierName || "Atanmadı"}</span></p><p><strong>IMEI</strong><span>{detailRequest.imei || "Girilmemiş"}</span></p><p><strong>Garanti</strong><span>{detailRequest.warrantyStatus || "Sorgulanmadı"}{detailRequest.warrantyExpiresOn ? ` · ${detailRequest.warrantyExpiresOn}` : ""}</span></p></div><div className="request-detail-copy"><strong>Müşterinin arıza açıklaması</strong><p>{detailRequest.description || "Ek açıklama yok."}</p></div><div className="request-detail-copy"><strong>Usta işlem notu</strong><p>{detailRequest.repairNotes || "Henüz işlem notu yok."}</p></div><div className="request-detail-copy"><strong>Teslimat adresi</strong><p>{detailRequest.deliveryAddress || "Adres henüz eklenmedi."}</p></div><div className="request-detail-history"><strong>Teklif geçmişi</strong>{selectedOffers.length ? selectedOffers.map((offer) => <p key={offer.offerId}>{offer.technician} · {offer.status === "accepted" ? "Kabul edildi" : offer.status === "declined" ? "Reddedildi" : offer.status === "cancelled" ? "Kapatıldı" : "Yanıt bekliyor"} · {formatRepairEventTime(offer.createdAt)}</p>) : <p>Henüz teklif gönderilmedi.</p>}</div><div className="request-detail-history"><strong>Son hareketler</strong>{detailEvents.length ? detailEvents.slice(0, 8).map((event) => <p key={event.id}>{describeRepairEvent(event)} · {formatRepairEventTime(event.createdAt)}</p>) : <p>Bu talepte henüz hareket yok.</p>}</div></div><div className="modal-footer"><button className="button button-secondary" onClick={() => setDetailRequestId("")}>Kapat</button><button className="button button-primary" onClick={() => setDetailRequestId("")}>Talep seçili kalsın</button></div></section></div>}
    </main>
  );
}

function TechnicianDashboard({
  history,
  name,
  job,
  status,
  eventHistory,
  onStatusChange,
  onSaveNote,
  pending,
  available,
  availabilityPending,
  onAvailabilityChange,
}: {
  history: boolean;
  name: string;
  job?: RepairRequest;
  status: TechnicianJobStatus;
  eventHistory: RepairEvent[];
  onStatusChange: (status: TechnicianJobStatus, note?: string) => void;
  onSaveNote: (note: string) => void;
  pending: boolean;
  available: boolean;
  availabilityPending: boolean;
  onAvailabilityChange: (available: boolean) => void;
}) {
  const [repairNote, setRepairNote] = useState(job?.repairNotes ?? "");
  useEffect(() => { setRepairNote(job?.repairNotes ?? ""); }, [job?.dbId, job?.repairNotes]);
  const statusLabels: Record<TechnicianJobStatus, string> = {
    offer: "Yeni teklif",
    accepted: "Kabul edildi",
    diagnosing: "Teşhis yapılıyor",
    review: "Görevli onayında",
    approved: "Müşteri onayladı",
    repairing: "Tamir sürüyor",
    approval: "Onay bekliyor",
    parts: "Parça bekliyor",
    completed: "Tamamlandı",
    declined: "Reddedildi",
    cancelled: "İptal edildi",
    offer_closed: "Teklif kapatıldı",
  };
  const primaryAction: Partial<Record<TechnicianJobStatus, { label: string; next: TechnicianJobStatus }>> = {
    offer: { label: "İşi kabul et", next: "accepted" },
    accepted: { label: "Teşhise başla", next: "diagnosing" },
    approved: { label: "Tamire başla", next: "repairing" },
    repairing: { label: "Tamiri tamamla", next: "completed" },
    parts: { label: "Parça geldi · tamire dön", next: "repairing" },
  };
  const action = primaryAction[status];
  const awaitingDelivery = status === "approved" && Boolean(job?.deliveryStatus && job.deliveryStatus !== "at_shop");

  if (!job) return <section className="panel request-empty-state"><span className="empty-state-icon"><Wrench size={23}/></span><span className="eyebrow">USTA İŞLERİ</span><h1>{history ? "Henüz tamamlanan iş yok." : "Bekleyen teklif yok."}</h1><p>{history ? "Tamamladığın işler burada görüntülenir." : "Yeni bir iş teklifi geldiğinde burada görüntüleyebilirsin."}</p><button className={`availability-toggle ${available ? "is-available" : "is-unavailable"}`} aria-pressed={available} disabled={availabilityPending} aria-busy={availabilityPending} onClick={() => onAvailabilityChange(!available)}><span className="availability-indicator" />{available ? "Yeni işlere açığım" : "Yeni işlere kapalıyım"}</button></section>;

  return <>
    <div className="page-heading role-page-heading">
      <div><div className="eyebrow"><span className="live-indicator" /> USTA ÇALIŞMA ALANI</div><h1>Merhaba, {name.split(/\s+/)[0]}<span className="wave">.</span></h1><p>İş tekliflerini yanıtla, tamir sürecini kolayca güncelle.</p></div>
      <button className={`availability-toggle ${available ? "is-available" : "is-unavailable"}`} aria-pressed={available} disabled={availabilityPending} aria-busy={availabilityPending} onClick={() => onAvailabilityChange(!available)}><span className="availability-indicator" />{available ? "Yeni işlere açığım" : "Yeni işlere kapalıyım"}</button>
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
        {awaitingDelivery && <div className="job-state-message"><Truck size={17}/><span>Kurye cihazı atölyeye teslim ettiğinde tamire başlayabilirsin.</span></div>}
        {job.description && <div className="job-description"><strong>Müşterinin notu</strong><p>{job.description}</p></div>}
        <details className="customer-event-history technician-event-history" open><summary>Talep geçmişi <span>{eventHistory.length}</span></summary><div className="customer-event-list">{eventHistory.length ? eventHistory.slice(0, 10).map((event) => <div key={event.id}><span className="history-icon"><Activity size={14}/></span><div className="repair-event-copy"><p>{describeRepairEvent(event)}</p><small>{event.reference} · {event.device} · {event.issue}</small></div><time>{formatRepairEventTime(event.createdAt)}</time></div>) : <p className="repair-event-empty">Bu işte henüz hareket kaydı yok.</p>}</div></details>
        {status === "diagnosing" || status === "repairing" ? <div className="technician-tools"><label>Teşhis ve yapılacak işlem<textarea value={repairNote} onChange={(event) => setRepairNote(event.target.value)} maxLength={1000} placeholder="Teşhis bulgularını ve yapılacak işlemi yaz" /></label><div><button className="button button-secondary" disabled={pending || repairNote.trim().length < 3} onClick={() => onSaveNote(repairNote.trim())}>Notu kaydet</button>{status === "diagnosing" && <button className="button button-primary" disabled={pending || repairNote.trim().length < 3} onClick={() => onStatusChange("review", repairNote.trim())}>Teklifi görevliye gönder</button>}{status === "repairing" && <><button className="button button-secondary" disabled={pending || repairNote.trim().length < 3} onClick={() => onStatusChange("review", repairNote.trim())}>Ek iş teklifi gönder</button><button className="button button-secondary" disabled={pending} onClick={() => onStatusChange("parts")}>Parça bekliyor</button></>}</div></div> : null}
        {status === "review" ? <div className="job-state-message"><Clock3 size={17} /><span>Teklifin görevli onayında. Onaylanınca müşteriye iletilecek.</span></div> : status === "approval" || status === "parts" ? <div className="job-state-message"><Clock3 size={17} /><span>{status === "approval" ? "Yapılacak işlem için müşteri onayı bekleniyor." : "Gerekli yedek parça bekleniyor. Müşteri durumu takip ekranında görebilir."}</span></div> : null}
        {status === "offer_closed" ? <div className="job-state-message"><X size={17} /><span>Bu teklif kapatıldı.</span></div> : status === "cancelled" ? <div className="job-state-message"><X size={17} /><span>Bu talep iptal edildi.</span></div> : status === "declined" ? <div className="job-state-message"><X size={17} /><span>Bu teklifi reddettin.</span></div> : status === "completed" ? <div className="job-state-message job-success"><CheckCircle2 size={18} /><span>Tamir tamamlandı olarak işaretlendi.</span></div> : <div className="job-actions"><span>{status === "offer" ? "Teklifi kabul ettiğinde işin sana atanır." : status === "accepted" ? "İş sende. Teşhise başlayabilirsin." : status === "diagnosing" ? "Teşhisi yazıp teklifi görevliye gönder." : status === "review" ? "Teklif görevlinin onayında." : status === "approved" ? "Müşteri onayladı. Cihaz dükkâna gelince tamire başlayabilirsin." :"İş bittiğinde durumu görevli ve müşteriyle paylaşılır."}</span><div>{status === "offer" && <button className="button button-danger-outline" disabled={pending} onClick={() => onStatusChange("declined")}>Reddet</button>}{action && <button className="button button-primary" disabled={pending || awaitingDelivery} onClick={() => onStatusChange(action.next)}>{action.label}<ArrowRight size={15} /></button>}</div></div>}
      </section>

      <aside className="panel role-side-panel">
        <div className="role-panel-heading compact-heading"><div><span className="role-kicker">İŞ DETAYI</span><h2>Seçili iş</h2></div></div>
        <div className="work-order-list">
          <article className="work-order current-order"><span className={`order-marker ${status === "completed" ? "order-done" : status === "repairing" ? "order-progress" : "order-pending"}`}>{status === "completed" ? <Check size={14} /> : status === "repairing" ? <Wrench size={14} /> : <Clock3 size={14} />}</span><div><strong>{job.device} · {job.issue}</strong><span>{job.id} · {job.district}</span><small>{statusLabels[status]}</small></div></article>
        </div>
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
  const cannotPickup = selected?.delivery_status === "accepted" && (!selected.delivery_address || !selected.shop_address);
  return <><div className="page-heading"><div><h1>Teslimatlarım</h1><p>Görev seç ve teslimatın aşamasını güncelle.</p></div></div>
    {loading ? <section className="panel delivery-panel" role="status">Teslimatlar yükleniyor…</section> : error && !deliveries.length ? <section className="panel delivery-panel"><p role="alert">{error}</p><button className="button button-secondary" onClick={onRetry}>Tekrar dene</button></section> : !deliveries.length ? <section className="panel request-empty-state"><span className="empty-state-icon"><Truck size={23}/></span><h2>Henüz teslimat atanmadı.</h2><p>Görevli ekip teslimat atadığında burada görünecek.</p></section> : <div className="delivery-grid"><section className="panel delivery-panel"><h2>Görevler</h2><div className="delivery-list">{deliveries.map((delivery) => <button key={delivery.id} className={`delivery-item ${selected?.id === delivery.id ? "is-selected" : ""}`} aria-pressed={selected?.id === delivery.id} onClick={() => onSelect(delivery.id)}><strong>{delivery.reference} · {delivery.device}</strong><span>{delivery.issue}</span><span>{labels[delivery.delivery_status]}</span></button>)}</div></section>{selected && <section className="panel delivery-panel"><h2>{selected.device}</h2><p>{selected.reference} · {selected.issue}</p><p>Durum: <strong>{labels[selected.delivery_status]}</strong></p><div className="delivery-contact"><h3>Müşteriden al / müşteriye teslim et</h3><p>{selected.customer_name || "Müşteri"} · {selected.district || ""}{selected.city ? `, ${selected.city}` : ""}</p><p>{selected.delivery_address || "Açık adres henüz kaydedilmedi."}</p>{selected.customer_phone && <a href={`tel:${selected.customer_phone.replace(/[^+0-9]/g, "")}`}>Müşteriyi ara</a>}<h3>Atölye</h3><p>{selected.shop_name || "Atanmış usta bekleniyor"}</p><p>{selected.shop_address ? `${selected.shop_address}${selected.shop_district ? `, ${selected.shop_district}` : ""}${selected.shop_city ? `, ${selected.shop_city}` : ""}` : "Atölye adresi henüz kaydedilmedi."}</p>{selected.shop_phone && <a href={`tel:${selected.shop_phone.replace(/[^+0-9]/g, "")}`}>Atölyeyi ara</a>}</div>{error && <p role="alert">{error}</p>}{cannotPickup && <p>Cihaz alınmadan önce müşteri ve atölye adreslerinin tamamlanması gerekiyor.</p>}{selected.delivery_status === "at_shop" && selected.request_status !== "ready_for_delivery" ? <p>Tamir tamamlandığında dönüş teslimatını başlatabilirsin.</p> : action ? <button className="button button-primary" disabled={pending || cannotPickup} aria-busy={pending} onClick={() => onStatusChange(selected, action.next)}>{pending ? "Kaydediliyor…" : action.label}</button> : <p>Bu teslimat tamamlandı.</p>}</section>}</div>}
  </>;
}

function CustomerTracking({ request, status, courierStatus, eventHistory, pending, onApprove }: { request: RepairRequest; status: TechnicianJobStatus; courierStatus?: CourierJobStatus; eventHistory: RepairEvent[]; pending: boolean; onApprove: () => void }) {
  const statusLabels: Record<TechnicianJobStatus, string> = { offer: "Usta eşleşmesi bekleniyor", accepted: "Usta işi kabul etti", diagnosing: "Usta teşhis yapıyor", review: "Teklif görevlinin onayında", approved: "Onayınız alındı, kurye bekleniyor",repairing: "Tamir devam ediyor", approval: "Ek işlem için onayınız bekleniyor", parts: "Yedek parça bekleniyor", completed: "Tamir tamamlandı", declined: "Yeni usta aranıyor", cancelled: "Talep iptal edildi", offer_closed: "Teklif kapatıldı" };
  const active = courierStatus === "delivered" ? 4 : courierStatus === "returning" || status === "completed" ? 3 : courierStatus === "at_shop" || courierStatus === "picked_up" || status === "repairing" || status === "approval" || status === "parts" ? 2 : courierStatus === "accepted" || ["accepted", "diagnosing", "review", "approved"].includes(status) ? 1 : 0;
  const repairStep = status === "approval" ? "Onayınız bekleniyor" : status === "parts" ? "Parça bekleniyor" : status === "completed" ? "Tamir tamamlandı" : courierStatus === "picked_up" ? "Cihaz servise gidiyor" : courierStatus === "at_shop" ? "Cihaz ustada" : "Tamir sürüyor";
  const steps = ["Talep alındı", "Usta bulundu", repairStep, courierStatus === "returning" ? "Kurye cihazınızı getiriyor" : "Teslimat", "Size teslim edildi"];
  const custody = getDeviceCustody(request);
  const CustodyIcon = custody.kind === "courier" ? Truck : custody.kind === "technician" ? Wrench : Smartphone;
  const currentStatus = status === "cancelled" ? "Talebiniz iptal edildi" : courierStatus === "delivered" ? "Cihazınız teslim edildi" : courierStatus === "returning" ? "Kurye cihazınızı getiriyor" : status === "approval" ? statusLabels.approval : status === "parts" ? statusLabels.parts : status === "completed" ? "Tamir tamamlandı · teslimat bekleniyor" : status === "repairing" ? statusLabels.repairing : courierStatus === "at_shop" ? "Cihaz ustaya teslim edildi" : courierStatus === "picked_up" ? "Cihaz servise götürülüyor" : courierStatus === "accepted" ? "Kurye cihazı almaya geliyor" : statusLabels[status];
  return <>
    <div className="page-heading"><div><div className="eyebrow"><span className="live-indicator" /> CİHAZ TAKİP</div><h1>Cihazınızın durumu<span className="wave">.</span></h1><p>Talebinizdeki gelişmeleri buradan takip edebilirsiniz.</p></div><span className="request-code">{request.id}</span></div>
    <section className="panel customer-track-panel"><div className="customer-track-head"><div className="device-icon"><Smartphone size={24}/></div><div><span>{request.id} · {request.device} · {request.issue}</span><h2>{currentStatus}</h2><small>Son güncelleme: {request.created}</small>{request.imei && <small>IMEI: {request.imei}</small>}</div></div>
      <div className={`customer-custody custody-${custody.kind}`}><span className="custody-icon"><CustodyIcon size={19}/></span><span><small>Cihaz şu anda</small><strong>{custody.holder}</strong><span>{custody.detail}</span></span></div>
      <div className="customer-timeline">{steps.map((label, index) => <div key={label} className={`customer-timeline-step ${index < active ? "is-done" : index === active ? "is-current" : ""}`}><span>{index < active ? <Check size={14}/> : index + 1}</span><div><strong>{label}</strong><small>{index === 0 ? "Talep oluşturuldu" : index < active ? "Tamamlandı" : index === active ? "Şu an" : "Sıradaki adım"}</small></div></div>)}</div>
      {status === "approval" && <div className="customer-approval"><strong>Ek işlem onayı gerekiyor</strong><p>Devam etmeden önce ustanın ilettiği işlem açıklamasını incele.</p><p>{request.repairNotes || "İşlem açıklaması bulunamadı. Destek ekibiyle görüş."}</p><button className="button button-primary" disabled={!request.repairNotes || pending} aria-busy={pending} onClick={onApprove}>{pending ? "Kaydediliyor…" : "İşlemi onayla"}</button></div>}
      <details className="customer-event-history"><summary>Talep geçmişi <span>{eventHistory.length}</span></summary><div className="customer-event-list">{eventHistory.length ? eventHistory.slice(0, 10).map((event) => <div key={event.id}><span className="history-icon"><Activity size={14}/></span><div className="repair-event-copy"><p>{describeRepairEvent(event)}</p><small>{event.reference} · {event.device} · {event.issue}</small></div><time>{formatRepairEventTime(event.createdAt)}</time></div>) : <p className="repair-event-empty">Talebinizde henüz kayıtlı bir hareket yok.</p>}</div></details>
      <div className="customer-track-footer"><ShieldCheck size={18}/><span>Durum değiştikçe bu ekranda güncellenir.</span></div>
    </section>

  </>;
}

function QuoteReviewPanel({ request, onDone }: { request: RepairRequest; onDone: (message: string) => void }) {
  const [note, setNote] = useState(request.repairNotes ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function send(status: "waiting_customer" | "diagnosing") {
    if (pending) return;
    setPending(true); setError("");
    try {
      const response = await fetch(`/api/requests/${request.dbId}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, note: note.trim() }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Teklif işlemi kaydedilemedi.");
      onDone(status === "waiting_customer" ? "Teklif müşteriye gönderildi." : "Teklif ustaya geri gönderildi.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Teklif işlemi kaydedilemedi.");
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="panel delivery-assignment quote-review">
      <h3>Usta teklifi</h3>
      <p>Teklifi kontrol et, gerekirse düzenle ve müşteriye gönder.</p>
      <textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={1000} rows={4} aria-label="Usta teklifi" />
      <div className="quote-review-actions">
        <button className="button button-secondary" disabled={pending || note.trim().length < 3} onClick={() => void send("diagnosing")}>Ustaya geri gönder</button>
        <button className="button button-primary" disabled={pending || note.trim().length < 3} aria-busy={pending} onClick={() => void send("waiting_customer")}>{pending ? "Gönderiliyor…" : "Müşteriye gönder"}</button>
      </div>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
