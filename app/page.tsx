"use client";

import { useMemo, useState } from "react";
import {
  Activity, ArrowDown, ArrowDownUp, ArrowRight, Bell, Check, CheckCheck,
  ChevronDown, ChevronLeft, ChevronRight, Clock3, Command, FileText, Filter,
  BatteryCharging, CheckCircle2, ClipboardCheck, Headphones, MapPin, MapPinned,
  Menu, MoreHorizontal, Navigation, PackageCheck, Phone, Plus, Search, Settings2,
  ShieldCheck, Smartphone, SlidersHorizontal, Truck, UserRound, Users, Wrench, X,
} from "lucide-react";

type RequestStatus = "Yeni talep" | "Usta aranıyor" | "Teklif gönderildi" | "Atandı";
type RepairRequest = {
  id: string; customer: string; initials: string; device: string; issue: string;
  district: string; created: string; status: RequestStatus; priority: "Normal" | "Acil";
};
type Technician = {
  name: string; initials: string; shop: string; district: string; distance: string;
  specialties: string[]; rating: string; jobs: number; available: boolean;
};
type SentOffer = { requestId: string; technician: string };
type Screen = "dispatch" | "technician" | "courier" | "customer";
type TechnicianJobStatus = "offer" | "accepted" | "repairing" | "approval" | "parts" | "completed" | "declined";
type CourierJobStatus = "assigned" | "accepted" | "picked-up" | "at-shop" | "returning" | "completed";
type DeviceCustody = { holder: "Müşteride" | "Kuryede" | "Ustada"; detail: string; kind: "customer" | "courier" | "technician" };

const initialRequests: RepairRequest[] = [
  { id: "CT-2408", customer: "Ece Yılmaz", initials: "EY", device: "iPhone 13", issue: "Ekran değişimi", district: "Kadıköy", created: "4 dk önce", status: "Yeni talep", priority: "Acil" },
  { id: "CT-2407", customer: "Mert Aydın", initials: "MA", device: "Samsung S22", issue: "Şarj soketi", district: "Üsküdar", created: "12 dk önce", status: "Usta aranıyor", priority: "Normal" },
  { id: "CT-2406", customer: "Selin Kaya", initials: "SK", device: "iPhone 12", issue: "Pil değişimi", district: "Beşiktaş", created: "26 dk önce", status: "Teklif gönderildi", priority: "Normal" },
  { id: "CT-2405", customer: "Can Demir", initials: "CD", device: "Xiaomi 12T", issue: "Arka kapak", district: "Ataşehir", created: "43 dk önce", status: "Atandı", priority: "Normal" },
  { id: "CT-2404", customer: "Deniz Arslan", initials: "DA", device: "iPhone 14 Pro", issue: "Kamera arızası", district: "Kadıköy", created: "1 sa önce", status: "Usta aranıyor", priority: "Normal" },
  { id: "CT-2403", customer: "Bora Şahin", initials: "BŞ", device: "Samsung A54", issue: "Ekran değişimi", district: "Maltepe", created: "2 sa önce", status: "Atandı", priority: "Normal" },
];

const technicians: Technician[] = [
  { name: "Okan Yıldız", initials: "OY", shop: "Kadıköy Teknik", district: "Kadıköy", distance: "1,2 km", specialties: ["iPhone", "Ekran"], rating: "4.9", jobs: 128, available: true },
  { name: "Burak Çetin", initials: "BÇ", shop: "Mobil Atölye", district: "Moda", distance: "2,4 km", specialties: ["iPhone", "Samsung"], rating: "4.8", jobs: 96, available: true },
  { name: "Emre Koç", initials: "EK", shop: "FixLab Kadıköy", district: "Acıbadem", distance: "3,1 km", specialties: ["Ekran", "Pil"], rating: "4.7", jobs: 74, available: true },
  { name: "Tolga Akın", initials: "TA", shop: "Akın GSM", district: "Üsküdar", distance: "4,6 km", specialties: ["Samsung", "Xiaomi"], rating: "4.6", jobs: 52, available: false },
];

const statusClass: Record<RequestStatus, string> = {
  "Yeni talep": "status-new", "Usta aranıyor": "status-search", "Teklif gönderildi": "status-offer", "Atandı": "status-assigned",
};

function getDeviceCustody(requestId: string, courierStatus: CourierJobStatus): DeviceCustody {
  if (requestId === "CT-2408") {
    if (courierStatus === "picked-up" || courierStatus === "returning") return { holder: "Kuryede", detail: courierStatus === "returning" ? "Müşteriye teslim ediliyor" : "Kadıköy Teknik'e götürülüyor", kind: "courier" };
    if (courierStatus === "at-shop") return { holder: "Ustada", detail: "Kadıköy Teknik · Okan Yıldız", kind: "technician" };
    if (courierStatus === "completed") return { holder: "Müşteride", detail: "Teslimat tamamlandı", kind: "customer" };
    return { holder: "Müşteride", detail: courierStatus === "accepted" ? "Kurye cihazı almaya gidiyor" : "Kurye görevi bekleniyor", kind: "customer" };
  }
  const sampleCustody: Record<string, DeviceCustody> = {
    "CT-2407": { holder: "Müşteride", detail: "Kurye ataması bekleniyor", kind: "customer" },
    "CT-2406": { holder: "Ustada", detail: "Mobil Atölye · Burak Çetin", kind: "technician" },
    "CT-2405": { holder: "Ustada", detail: "Akın GSM · Tolga Akın", kind: "technician" },
    "CT-2404": { holder: "Müşteride", detail: "Usta ve kurye bekleniyor", kind: "customer" },
    "CT-2403": { holder: "Kuryede", detail: "Maltepe'ye teslim ediliyor", kind: "courier" },
  };
  return sampleCustody[requestId] ?? { holder: "Müşteride", detail: "Teslim alma bekleniyor", kind: "customer" };
}

export default function Home() {
  const [requests, setRequests] = useState(initialRequests);
  const [selectedId, setSelectedId] = useState("CT-2408");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Tüm talepler");
  const [role, setRole] = useState<"Görevli" | "Admin" | "Usta" | "Kurye" | "Müşteri">("Görevli");
  const [screen, setScreen] = useState<Screen>("dispatch");
  const [technicianJobStatus, setTechnicianJobStatus] = useState<TechnicianJobStatus>("offer");
  const [courierJobStatus, setCourierJobStatus] = useState<CourierJobStatus>("assigned");
  const [eventHistory, setEventHistory] = useState(["Talep oluşturuldu · Bugün 10:18", "Usta teklifi gönderildi · Bugün 10:22"]);
  const [technicianAvailable, setTechnicianAvailable] = useState(true);
  const [notice, setNotice] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [tab, setTab] = useState<"Uygun ustalar" | "Teklif geçmişi">("Uygun ustalar");
  const [sentOffers, setSentOffers] = useState<SentOffer[]>([]);

  const selected = requests.find((request) => request.id === selectedId) ?? requests[0];
  const selectedOffers = sentOffers.filter((offer) => offer.requestId === selectedId);
  const selectedCustody = getDeviceCustody(selectedId, courierJobStatus);
  const profileName = role === "Usta" ? "Okan Yıldız" : role === "Kurye" ? "Mert Can" : role === "Müşteri" ? "Ece Yılmaz" : "Ayşe Demir";
  const profileInitials = role === "Usta" ? "OY" : role === "Kurye" ? "MC" : role === "Müşteri" ? "EY" : "AD";
  const screenTitle = screen === "dispatch" ? "Genel Bakış" : screen === "technician" ? "Usta paneli" : screen === "courier" ? "Kurye paneli" : "Cihaz takibi";

  function changeRole(nextRole: "Görevli" | "Admin" | "Usta" | "Kurye" | "Müşteri") {
    setRole(nextRole);
    setScreen(nextRole === "Usta" ? "technician" : nextRole === "Kurye" ? "courier" : nextRole === "Müşteri" ? "customer" : "dispatch");
    setMobileNav(false);
  }
  function updateTechnicianStatus(nextStatus: TechnicianJobStatus) {
    setTechnicianJobStatus(nextStatus);
    const labels: Record<TechnicianJobStatus, string> = { offer: "Usta teklifi yeniden açıldı", accepted: "Usta işi kabul etti", repairing: "Tamir başladı/devam ediyor", approval: "Müşteri onayı istendi", parts: "Yedek parça bekleniyor", completed: "Tamir tamamlandı", declined: "Usta teklifi reddetti" };
    setEventHistory((current) => [`${labels[nextStatus]} · Şimdi`, ...current]);
  }
  function updateCourierStatus(nextStatus: CourierJobStatus) {
    setCourierJobStatus(nextStatus);
    const labels: Record<CourierJobStatus, string> = { assigned: "Kurye görevi oluşturuldu", accepted: "Kurye görevi kabul etti", "picked-up": "Cihaz müşteriden alındı", "at-shop": "Cihaz atölyeye teslim edildi", returning: "Tamir edilen cihaz kurye tarafından alındı", completed: "Cihaz müşteriye teslim edildi" };
    setEventHistory((current) => [`${labels[nextStatus]} · Şimdi`, ...current]);
  }
  const filteredRequests = useMemo(() => requests.filter((request) => {
    const matchesQuery = `${request.id} ${request.customer} ${request.device} ${request.issue} ${request.district}`.toLowerCase().includes(query.toLowerCase());
    const matchesFilter = filter === "Tüm talepler" || (filter === "Yeni" ? request.status === "Yeni talep" : filter === "Usta aranıyor" ? request.status === "Usta aranıyor" : request.status === "Atandı");
    return matchesQuery && matchesFilter;
  }), [filter, query, requests]);

  function sendOffer(technician: Technician) {
    setSentOffers((current) => current.some((offer) => offer.requestId === selectedId && offer.technician === technician.name) ? current : [...current, { requestId: selectedId, technician: technician.name }]);
    setRequests((current) => current.map((request) => request.id === selectedId ? { ...request, status: "Teklif gönderildi" } : request));
    setNotice(`${technician.name} adlı ustaya teklif gönderildi.`);
    window.setTimeout(() => setNotice(""), 3200);
  }

  function createRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextNumber = 2408 + requests.length - initialRequests.length + 1;
    const customer = String(formData.get("customer") || "Yeni Müşteri");
    const newRequest: RepairRequest = { id: `CT-${nextNumber}`, customer, initials: customer.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toLocaleUpperCase("tr-TR"), device: String(formData.get("device") || "iPhone 13"), issue: String(formData.get("issue") || "Ekran değişimi"), district: String(formData.get("district") || "Kadıköy"), created: "Şimdi", status: "Yeni talep", priority: "Normal" };
    setRequests((current) => [newRequest, ...current]);
    setSelectedId(newRequest.id);
    setShowCreate(false);
    setNotice("Yeni talep oluşturuldu.");
    window.setTimeout(() => setNotice(""), 3200);
  }

  return (
    <main className="app-shell">
      <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
        <div className="brand"><div className="brand-mark"><Wrench size={19} strokeWidth={2.2} /></div><span>Cep<span className="brand-light">Tamir</span></span><button className="icon-button nav-close" aria-label="Menüyü kapat" onClick={() => setMobileNav(false)}><X size={18} /></button></div>
        <div className="workspace-label">{screen === "dispatch" ? "OPERASYON" : screen === "technician" ? "USTA PANELİ" : screen === "courier" ? "KURYE PANELİ" : "MÜŞTERİ"}</div>
        <nav className="main-nav" aria-label="Ana menü">
          {screen === "dispatch" ? <>
            <button className="nav-item active"><Activity size={18} /><span>Genel Bakış</span></button>
            <button className="nav-item"><FileText size={18} /><span>Talepler</span><span className="nav-count">12</span></button>
            <button className="nav-item"><Users size={18} /><span>Ustalar</span><span className="presence-dot" /></button>
            <button className="nav-item"><Smartphone size={18} /><span>Müşteriler</span></button>
          </> : screen === "technician" ? <>
            <button className="nav-item active"><Wrench size={18} /><span>İşlerim</span><span className="nav-count">3</span></button>
            <button className="nav-item"><ClipboardCheck size={18} /><span>İş geçmişim</span></button>
            <button className="nav-item"><UserRound size={18} /><span>Profilim</span></button>
          </> : screen === "courier" ? <>
            <button className="nav-item active"><PackageCheck size={18} /><span>Teslimatlarım</span><span className="nav-count">1</span></button>
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
            {role === "Admin" && <button className="nav-item"><ShieldCheck size={18} /><span>Kullanıcı ve roller</span></button>}
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
            <label className="role-switch"><span>Görünüm</span><select value={role} onChange={(event) => changeRole(event.target.value as "Görevli" | "Admin" | "Usta" | "Kurye" | "Müşteri")} aria-label="Rol görünümünü seç"><option>Görevli</option><option>Admin</option><option>Usta</option><option>Kurye</option><option>Müşteri</option></select><ChevronDown size={13} /></label>
            <button className="icon-button notification-button" aria-label="Bildirimler"><Bell size={18} /><span /></button>
            <div className="top-avatar avatar avatar-self">{profileInitials}</div>
          </div>
        </header>

        <div className="content">
          {screen === "dispatch" ? <>
          <div className="page-heading">
            <div><div className="eyebrow"><span className="live-indicator" /> {new Intl.DateTimeFormat("tr-TR", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Istanbul" }).format(new Date()).toLocaleUpperCase("tr-TR")}</div><h1>Merhaba, Ayşe<span className="wave">.</span></h1><p>Bugün operasyonunda neler oluyor, birlikte bakalım.</p></div>
            <button className="button button-primary" onClick={() => setShowCreate(true)}><Plus size={17} /> Yeni talep oluştur</button>
          </div>

          <div className="metric-grid">
            <article className="metric-card metric-featured"><div className="metric-top"><span>Bugünkü talepler</span><span className="metric-icon icon-lilac"><FileText size={17} /></span></div><div className="metric-value">24 <span className="metric-change positive"><ArrowDown size={13} /> 12%</span></div><div className="metric-foot"><span>Geçen haftaya göre</span><div className="sparkline spark-purple"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div></div></article>
            <article className="metric-card"><div className="metric-top"><span>Usta bekleyen</span><span className="metric-icon icon-amber"><Clock3 size={17} /></span></div><div className="metric-value">8 <span className="metric-note">talep</span></div><div className="metric-foot"><span>3 talep 30 dk üzeri</span><span className="foot-alert">Takip et</span></div></article>
            <article className="metric-card"><div className="metric-top"><span>Aktif ustalar</span><span className="metric-icon icon-green"><Wrench size={17} /></span></div><div className="metric-value">16 <span className="metric-note">/ 21 usta</span></div><div className="metric-foot"><span className="online-copy"><span className="presence-dot" /> 16 çevrimiçi</span><span className="foot-muted">şu anda</span></div></article>
            <article className="metric-card"><div className="metric-top"><span>Atama oranı</span><span className="metric-icon icon-blue"><CheckCheck size={17} /></span></div><div className="metric-value">87<span className="metric-percent">%</span> <span className="metric-change positive"><ArrowDown size={13} /> 4%</span></div><div className="metric-foot"><span>Son 7 gün</span><div className="mini-bars"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div></div></article>
          </div>

          <div className="work-grid">
            <section className="requests-panel panel">
              <div className="panel-heading"><div><div className="title-line"><h2>Son talepler</h2><span className="count-pill">{filteredRequests.length}</span></div><p>Gelen tamir taleplerini görüntüle ve yönet.</p></div><button className="button button-secondary button-small"><span>Tüm talepler</span><ArrowRight size={15} /></button></div>
              <div className="table-toolbar">
                <label className="search-box"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Talep, müşteri veya cihaz ara" /><kbd><Command size={11}/> K</kbd></label>
                <div className="toolbar-right"><label className="filter-select"><Filter size={14}/><select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Talepleri filtrele"><option>Tüm talepler</option><option>Yeni</option><option>Usta aranıyor</option><option>Atandı</option></select><ChevronDown size={13}/></label><button className="icon-button table-sort" aria-label="Sıralama seçenekleri"><ArrowDownUp size={16}/></button></div>
              </div>
              <div className="request-table-wrap"><table className="request-table"><thead><tr><th>MÜŞTERİ / CİHAZ</th><th>ARIZA</th><th>KONUM</th><th>DURUM / CİHAZ KİMDE</th><th>GELİŞ</th><th><span className="sr-only">İşlem</span></th></tr></thead><tbody>{filteredRequests.map((request) => { const custody = getDeviceCustody(request.id, courierJobStatus); const CustodyIcon = custody.kind === "courier" ? Truck : custody.kind === "technician" ? Wrench : Smartphone; return <tr key={request.id} onClick={() => setSelectedId(request.id)} className={selectedId === request.id ? "row-selected" : ""} tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter") setSelectedId(request.id); }}><td><div className="customer-cell"><div className={`avatar avatar-${request.initials.length}`}>{request.initials}</div><div className="customer-info"><strong>{request.customer}{request.priority === "Acil" && <span className="urgent-mark" title="Öncelikli talep">!</span>}</strong><span>{request.id} <i/> {request.device}</span></div></div></td><td className="issue-cell">{request.issue}</td><td><span className="location-cell"><MapPin size={13}/>{request.district}</span></td><td><div className="request-status-stack"><span className={`status-badge ${statusClass[request.status]}`}><i/>{request.status}</span><span className={`custody-chip custody-${custody.kind}`}><CustodyIcon size={14}/><strong>{custody.holder}</strong></span><small>{custody.detail}</small></div></td><td className="time-cell">{request.created}</td><td><button className="row-more" aria-label={`${request.id} seçenekleri`} onClick={(event) => { event.stopPropagation(); setSelectedId(request.id); }}><MoreHorizontal size={17}/></button></td></tr>; })}</tbody></table>{filteredRequests.length === 0 && <div className="empty-results"><Search size={20}/><strong>Sonuç bulunamadı</strong><span>Arama veya filtre kriterlerini değiştirebilirsin.</span></div>}</div>
              <section className="queue-activity" aria-label="Son operasyon hareketleri">
                <div className="queue-activity-heading"><h3>Son hareketler</h3><span>Bugün</span></div>
                <div className="queue-activity-list">
                  <article><span className="activity-mark mark-new"><Plus size={13}/></span><div><strong>Ece Yılmaz yeni talep açtı</strong><span>CT-2408 · Ekran değişimi</span></div><time>4 dk önce</time></article>
                  <article><span className="activity-mark mark-offer"><ArrowRight size={13}/></span><div><strong>Selin Kaya’ya teklif gönderildi</strong><span>CT-2406 · Kadıköy Teknik</span></div><time>26 dk önce</time></article>
                  <article><span className="activity-mark mark-assigned"><Check size={13}/></span><div><strong>Can Demir’in talebi atandı</strong><span>CT-2405 · Akın GSM</span></div><time>43 dk önce</time></article>
                </div>
              </section>
              <footer className="table-footer"><span>Toplam <strong>{requests.length}</strong> talepten <strong>{filteredRequests.length}</strong> tanesi gösteriliyor</span><div className="pagination"><button aria-label="Önceki sayfa" disabled><ChevronLeft size={16}/></button><button className="page-current">1</button><button>2</button><button>3</button><span>…</span><button>8</button><button aria-label="Sonraki sayfa"><ChevronRight size={16}/></button></div></footer>
            </section>

            <aside className="matching-panel panel">
              <div className="matching-heading"><div><div className="title-line"><h2>Usta yönlendir</h2><span className="live-pill"><span/> CANLI</span></div><p>Seçili talep için uygun ustalar.</p></div><button className="icon-button matching-more" aria-label="Usta listesi seçenekleri"><MoreHorizontal size={19}/></button></div>
              <div className="selected-request"><div className="selected-request-top"><span className="selected-label">SEÇİLİ TALEP</span><span className="request-code">{selected?.id}</span></div><div className="selected-device"><div className="device-icon"><Smartphone size={20}/></div><div><strong>{selected?.device}</strong><span>{selected?.issue}</span></div><span className={`status-badge compact ${statusClass[selected?.status ?? "Yeni talep"]}`}><i/>{selected?.status}</span></div><div className="selected-meta"><span><UserRound size={13}/>{selected?.customer}</span><span><MapPin size={13}/>{selected?.district}</span></div></div>
              <div className={`selected-custody custody-${selectedCustody.kind}`}><div className="custody-icon">{selectedCustody.kind === "courier" ? <Truck size={20}/> : selectedCustody.kind === "technician" ? <Wrench size={20}/> : <Smartphone size={20}/>}</div><div><span>CİHAZ ŞU ANDA KİMDE?</span><strong>{selectedCustody.holder}</strong><small>{selectedCustody.detail}</small></div><span className="custody-live"><i/>Güncel</span></div>
              <div className="match-summary"><span><strong>4</strong> uygun usta bulundu</span><button className="text-button"><SlidersHorizontal size={13}/> Filtrele</button></div>
              <div className="matching-tabs" role="tablist"><button role="tab" aria-selected={tab === "Uygun ustalar"} className={tab === "Uygun ustalar" ? "tab-active" : ""} onClick={() => setTab("Uygun ustalar")}>Uygun ustalar <span>4</span></button><button role="tab" aria-selected={tab === "Teklif geçmişi"} className={tab === "Teklif geçmişi" ? "tab-active" : ""} onClick={() => setTab("Teklif geçmişi")}>Teklif geçmişi</button></div>
              {tab === "Uygun ustalar" ? <div className="technician-list">{technicians.map((technician, index) => { const alreadySent = selectedOffers.some((offer) => offer.technician === technician.name); return <article className={`technician-card ${index === 0 ? "recommended" : ""}`} key={technician.name}><div className="technician-top"><div className={`avatar tech-avatar tech-${index}`}>{technician.initials}</div><div className="technician-identity"><div className="technician-name">{technician.name}{index === 0 && <span className="best-match">EN UYGUN</span>}</div><span>{technician.shop}</span></div><div className="rating"><span>★</span>{technician.rating}</div></div><div className="technician-details"><span><MapPin size={12}/>{technician.district} · {technician.distance}</span><span><Check size={12}/>{technician.jobs} tamamlanan iş</span></div><div className="specialty-list">{technician.specialties.map((specialty) => <span key={specialty}>{specialty}</span>)}</div><div className="technician-action"><span className={technician.available ? "availability available" : "availability unavailable"}><i/>{technician.available ? "Müsait" : "Meşgul"}</span><button className={`button ${alreadySent ? "button-sent" : "button-offer"}`} disabled={!technician.available || alreadySent} onClick={() => sendOffer(technician)}>{alreadySent ? <><Check size={14}/> Gönderildi</> : "Teklif gönder"}</button></div></article>; })}</div> : <div className="history-list">{selectedOffers.length ? selectedOffers.map((offer, index) => <div className="history-item" key={`${offer.requestId}-${offer.technician}`}><div className="history-icon"><Check size={15}/></div><div><strong>{offer.technician}</strong><span>{offer.requestId} için teklif gönderildi</span></div><time>{index === selectedOffers.length - 1 ? "Şimdi" : "Az önce"}</time></div>) : <div className="history-empty"><Clock3 size={21}/><strong>Henüz teklif yok</strong><span>Bu talep için gönderilen teklifler burada görünecek.</span></div>}</div>}
              <div className="manual-note"><div className="manual-note-icon"><UserRound size={14}/></div><span>Teklif gönderimi görevli onayıyla yapılır. Atama, usta kabul ettiğinde tamamlanır.</span></div>
            </aside>
          </div>

          <div className="bottom-strip"><div><span className="bottom-mark"><Activity size={15}/></span><span><strong>Operasyon akışı normal</strong><small>Son güncelleme: az önce</small></span></div><button className="text-button">Aktivite günlüğü <ArrowRight size={14}/></button></div>
          </> : screen === "technician" ? <TechnicianDashboard status={technicianJobStatus} onStatusChange={updateTechnicianStatus} available={technicianAvailable} onAvailabilityChange={setTechnicianAvailable} /> : screen === "courier" ? <CourierDashboard status={courierJobStatus} onStatusChange={updateCourierStatus} /> : <CustomerTracking status={technicianJobStatus} courierStatus={courierJobStatus} eventHistory={eventHistory} onApprove={() => updateTechnicianStatus("repairing")} />}
        </div>
      </section>

      {notice && <div className="toast" role="status"><span className="toast-check"><Check size={15}/></span>{notice}<button aria-label="Bildirimi kapat" onClick={() => setNotice("")}><X size={15}/></button></div>}
      {showCreate && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowCreate(false); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-header"><div><span className="modal-kicker">YENİ KAYIT</span><h2 id="modal-title">Tamir talebi oluştur</h2><p>Müşteri adına yeni bir talep kaydı aç.</p></div><button className="icon-button" aria-label="Pencereyi kapat" onClick={() => setShowCreate(false)}><X size={18}/></button></div><form id="request-form" className="modal-body" onSubmit={createRequest}><label>Müşteri adı<input name="customer" defaultValue="Yeni Müşteri" required/></label><div className="form-row"><label>Telefon modeli<select name="device" defaultValue="iPhone 13"><option>iPhone 13</option><option>iPhone 14</option><option>Samsung S22</option></select></label><label>Arıza türü<select name="issue" defaultValue="Ekran değişimi"><option>Ekran değişimi</option><option>Pil değişimi</option><option>Şarj soketi</option></select></label></div><label>İlçe<input name="district" defaultValue="Kadıköy" required/></label><label>Arıza açıklaması<textarea name="description" placeholder="Müşterinin belirttiği sorunu kısaca yaz..." rows={3}/></label></form><div className="modal-footer"><button className="button button-secondary" onClick={() => setShowCreate(false)}>Vazgeç</button><button type="submit" form="request-form" className="button button-primary"><Plus size={16}/> Talep oluştur</button></div></section></div>}
    </main>
  );
}

function TechnicianDashboard({
  status,
  onStatusChange,
  available,
  onAvailabilityChange,
}: {
  status: TechnicianJobStatus;
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

  return <>
    <div className="page-heading role-page-heading">
      <div><div className="eyebrow"><span className="live-indicator" /> USTA ÇALIŞMA ALANI</div><h1>Merhaba, Okan<span className="wave">.</span></h1><p>İş tekliflerini yanıtla, tamir sürecini kolayca güncelle.</p></div>
      <button className={`availability-toggle ${available ? "is-available" : "is-unavailable"}`} aria-pressed={available} onClick={() => onAvailabilityChange(!available)}><span className="availability-indicator" />{available ? "Yeni işlere açığım" : "Yeni işlere kapalıyım"}</button>
    </div>

    <div className="metric-grid role-metrics">
      <article className="metric-card"><div className="metric-top"><span>Yanıt bekleyen</span><span className="metric-icon icon-amber"><Clock3 size={17} /></span></div><div className="metric-value">{status === "offer" ? "1" : "0"} <span className="metric-note">teklif</span></div><div className="metric-foot"><span>Yanıt süresini admin yönetir</span></div></article>
      <article className="metric-card"><div className="metric-top"><span>Devam eden işler</span><span className="metric-icon icon-blue"><Wrench size={17} /></span></div><div className="metric-value">{status === "accepted" || status === "repairing" ? "1" : "2"} <span className="metric-note">iş</span></div><div className="metric-foot"><span>Bugünkü iş listen</span></div></article>
      <article className="metric-card"><div className="metric-top"><span>Bu ay tamamlanan</span><span className="metric-icon icon-green"><CheckCircle2 size={17} /></span></div><div className="metric-value">28 <span className="metric-note">iş</span></div><div className="metric-foot"><span>Son iş: bugün 10:24</span></div></article>
    </div>

    <div className="role-work-grid">
      <section className="panel role-primary-panel">
        <div className="role-panel-heading"><div><span className="role-kicker">İŞ TEKLİFİ · CT-2408</span><h2>{status === "offer" ? "Yeni bir iş teklifin var" : "Ece Yılmaz · iPhone 13"}</h2><p>Görevli tarafından sana gönderildi · 4 dk önce</p></div><span className={`status-badge ${status === "declined" ? "status-new" : status === "completed" ? "status-assigned" : "status-offer"}`}><i />{statusLabels[status]}</span></div>
        <div className="technician-job-summary">
          <div className="job-device-icon"><Smartphone size={25} /></div>
          <div className="job-device-copy"><strong>iPhone 13</strong><span>Ekran değişimi</span></div>
          <span className="job-priority"><span />Öncelikli</span>
        </div>
        <div className="job-facts-grid">
          <div><span className="fact-icon"><UserRound size={15} /></span><span><small>MÜŞTERİ</small><strong>Ece Yılmaz</strong></span></div>
          <div><span className="fact-icon"><MapPin size={15} /></span><span><small>KONUM</small><strong>Kadıköy, İstanbul</strong></span></div>
          <div><span className="fact-icon"><Clock3 size={15} /></span><span><small>TALEP ZAMANI</small><strong>Bugün, 10:18</strong></span></div>
          <div><span className="fact-icon"><BatteryCharging size={15} /></span><span><small>ARIZA</small><strong>Ekran görüntü vermiyor</strong></span></div>
        </div>
        <div className="job-description"><strong>Müşterinin notu</strong><p>Telefon yere düştükten sonra ekran karardı. Cihaz açılıyor, ses geliyor.</p></div>
        {status === "accepted" || status === "repairing" ? <div className="technician-tools"><label>Teşhis ve yapılan işlem<textarea defaultValue={status === "repairing" ? "Ekran paneli hasarlı. Değişim ve dokunmatik testi yapılacak." : ""} placeholder="Teşhis bulgularını ve yapılacak işlemi kaydet" /></label><div><button className="button button-secondary" onClick={() => onStatusChange("approval")}>Ek işlem için onay iste</button><button className="button button-secondary" onClick={() => onStatusChange("parts")}>Parça bekliyor</button></div></div> : null}
        {status === "approval" || status === "parts" ? <div className="job-state-message"><Clock3 size={17} /><span>{status === "approval" ? "Ek işlem ve fiyat için müşteri onayı bekleniyor." : "Gerekli yedek parça bekleniyor. Müşteri durumu takip ekranında görebilir."}</span></div> : null}
        {status === "declined" ? <div className="job-state-message"><X size={17} /><span>Bu teklifi reddettin. Fikrini değiştirdiysen tekrar yanıtlayabilirsin.</span><button className="text-button" onClick={() => onStatusChange("offer")}>Teklifi tekrar aç</button></div> : status === "completed" ? <div className="job-state-message job-success"><CheckCircle2 size={18} /><span>Tamir tamamlandı olarak işaretlendi.</span></div> : <div className="job-actions"><span>{status === "offer" ? "Teklifi kabul ettiğinde işin sana atanır." : status === "accepted" ? "İş sende. Cihazı teslim aldığında tamire başlayabilirsin." : "İş bittiğinde durumu görevli ve müşteriyle paylaşılır."}</span><div>{status === "offer" && <button className="button button-danger-outline" onClick={() => onStatusChange("declined")}>Reddet</button>}{action && <button className="button button-primary" onClick={() => onStatusChange(action.next)}>{action.label}<ArrowRight size={15} /></button>}</div></div>}
      </section>

      <aside className="panel role-side-panel">
        <div className="role-panel-heading compact-heading"><div><span className="role-kicker">BUGÜNKÜ PLAN</span><h2>İş sıran</h2></div><button className="icon-button" aria-label="İş listesini görüntüle"><MoreHorizontal size={18} /></button></div>
        <div className="work-order-list">
          <article className="work-order current-order"><span className="order-marker order-pending"><Clock3 size={14} /></span><div><strong>iPhone 13 · Ekran</strong><span>CT-2408 · Kadıköy</span><small>{status === "offer" ? "Teklif yanıtını bekliyor" : statusLabels[status]}</small></div></article>
          <article className="work-order"><span className="order-marker order-progress"><Wrench size={14} /></span><div><strong>Samsung S22 · Şarj soketi</strong><span>CT-2399 · Üsküdar</span><small>Parça kontrolü</small></div></article>
          <article className="work-order"><span className="order-marker order-done"><Check size={14} /></span><div><strong>iPhone 12 · Pil</strong><span>CT-2394 · Beşiktaş</span><small>Tamamlandı · 10:24</small></div></article>
        </div>
        <div className="role-info-note"><ShieldCheck size={16} /><span>Teklif süresini ve yeniden yönlendirmeyi görevli yönetir. Yanıtın operasyon panelinde görünür.</span></div>
      </aside>
    </div>
    <div className="bottom-strip"><div><span className="bottom-mark"><Wrench size={15} /></span><span><strong>Usta hesabı açık</strong><small>Son güncelleme: az önce</small></span></div><span className="role-bottom-note">İş durumların anlık olarak güncellenir</span></div>
  </>;
}

function CourierDashboard({ status, onStatusChange }: { status: CourierJobStatus; onStatusChange: (status: CourierJobStatus) => void }) {
  const [proofPhoto, setProofPhoto] = useState(false);
  const [proofCode, setProofCode] = useState("");
  const [conditionChecked, setConditionChecked] = useState(false);
  const progress: Record<CourierJobStatus, number> = { assigned: 0, accepted: 1, "picked-up": 2, "at-shop": 3, returning: 4, completed: 5 };
  const courierLabels: Record<CourierJobStatus, string> = {
    assigned: "Yeni görev",
    accepted: "Görev kabul edildi",
    "picked-up": "Cihaz alındı",
    "at-shop": "Atölyeye teslim edildi",
    returning: "Müşteriye dönüyor",
    completed: "Teslimat tamamlandı",
  };
  const nextAction: Partial<Record<CourierJobStatus, { label: string; next: CourierJobStatus }>> = {
    assigned: { label: "Görevi kabul et", next: "accepted" },
    accepted: { label: "Müşteriden cihazı al", next: "picked-up" },
    "picked-up": { label: "Ustaya teslim ettim", next: "at-shop" },
    "at-shop": { label: "Tamir edilen cihazı aldım", next: "returning" },
    returning: { label: "Müşteriye teslim ettim", next: "completed" },
  };
  const action = nextAction[status];
  const requiresProof = status === "accepted" || status === "picked-up" || status === "at-shop" || status === "returning";
  const proofReady = proofPhoto && proofCode === "4821" && conditionChecked;
  const steps = ["Görevi kabul et", "Müşteriden al", "Ustaya bırak", "Ustadan al", "Müşteriye teslim et"];

  return <>
    <div className="page-heading role-page-heading">
      <div><div className="eyebrow"><span className="live-indicator" /> KURYE ÇALIŞMA ALANI</div><h1>Merhaba, Mert<span className="wave">.</span></h1><p>Telefonu güvenle al, ustaya ulaştır, onarım sonrası müşteriye teslim et.</p></div>
      <span className={`status-badge courier-status-badge ${status === "completed" ? "status-assigned" : "status-search"}`}><i />{courierLabels[status]}</span>
    </div>

    <div className="metric-grid role-metrics courier-metrics">
      <article className="metric-card"><div className="metric-top"><span>Bugünkü görevler</span><span className="metric-icon icon-blue"><ClipboardCheck size={17} /></span></div><div className="metric-value">4 <span className="metric-note">teslimat</span></div><div className="metric-foot"><span>2 bölge · Kadıköy ve Üsküdar</span></div></article>
      <article className="metric-card"><div className="metric-top"><span>Aktif görev</span><span className="metric-icon icon-amber"><Truck size={17} /></span></div><div className="metric-value">{status === "completed" ? "0" : "1"} <span className="metric-note">cihaz</span></div><div className="metric-foot"><span>CT-2408 · iPhone 13</span></div></article>
      <article className="metric-card"><div className="metric-top"><span>Tamamlanan</span><span className="metric-icon icon-green"><CheckCircle2 size={17} /></span></div><div className="metric-value">{status === "completed" ? "4" : "3"} <span className="metric-note">bugün</span></div><div className="metric-foot"><span>Günlük teslimat hedefin</span></div></article>
    </div>

    <div className="role-work-grid courier-work-grid">
      <section className="panel role-primary-panel courier-primary-panel">
        <div className="role-panel-heading"><div><span className="role-kicker">AKTİF GÖREV · CT-2408</span><h2>{status === "completed" ? "Teslimat tamamlandı" : "Cihaz teslimat akışı"}</h2><p>Görevli tarafından oluşturuldu · Bugün 10:22</p></div><span className="status-badge status-search"><i />{courierLabels[status]}</span></div>
        <div className="courier-stepper" aria-label="Teslimat ilerlemesi">{steps.map((step, index) => <div className={`courier-step ${index < progress[status] ? "step-complete" : index === progress[status] ? "step-current" : ""}`} key={step}><span>{index < progress[status] ? <Check size={14} /> : index + 1}</span><small>{step}</small></div>)}</div>
        <div className="courier-route">
          <article className={`route-stop ${progress[status] >= 2 ? "route-stop-complete" : ""}`}><span className="route-point pickup-point"><MapPin size={17} /></span><div className="route-stop-copy"><span>MÜŞTERİDEN ALIŞ</span><strong>Ece Yılmaz</strong><p>Caferağa Mahallesi, Kadıköy</p></div><button className="icon-button route-contact" aria-label="Müşteriyi ara"><Phone size={16} /></button></article>
          <div className="route-connector"><span>1,2 km</span><i /></div>
          <article className={`route-stop ${progress[status] >= 3 ? "route-stop-complete" : ""}`}><span className="route-point shop-point"><Wrench size={17} /></span><div className="route-stop-copy"><span>TAMİR ATÖLYESİ</span><strong>Kadıköy Teknik</strong><p>Okan Yıldız · Kadıköy</p></div><button className="icon-button route-contact" aria-label="Atölyeyi ara"><Phone size={16} /></button></article>
          <div className="route-connector"><span>1,2 km</span><i /></div>
          <article className={`route-stop ${status === "completed" ? "route-stop-complete" : ""}`}><span className="route-point return-point"><MapPinned size={17} /></span><div className="route-stop-copy"><span>MÜŞTERİYE TESLİMAT</span><strong>Ece Yılmaz</strong><p>Caferağa Mahallesi, Kadıköy</p></div></article>
        </div>
        {requiresProof && <div className="proof-box"><strong>Teslim kanıtı</strong><label className="proof-upload">Fotoğraf ekle<input type="file" accept="image/*" capture="environment" onChange={(event) => setProofPhoto(Boolean(event.currentTarget.files?.length))} /></label><label>Tek kullanımlık teslim kodu<input inputMode="numeric" placeholder="Demo kodu: 4821" maxLength={4} value={proofCode} onChange={(event) => setProofCode(event.target.value.replace(/\D/g, ""))} /></label><label className="proof-check"><input type="checkbox" checked={conditionChecked} onChange={(event) => setConditionChecked(event.target.checked)} />Cihazın dış durumunu ve aksesuarları kontrol ettim</label><small>Prototip doğrulama: bu adım için 4821 kodu ve bir fotoğraf seçimi gerekir.</small></div>}
        <div className="courier-primary-action">{status === "completed" ? <div className="job-state-message job-success"><CheckCircle2 size={18} /><span>Cihaz müşteriye teslim edildi. Görev tamamlandı.</span></div> : <><span><ShieldCheck size={16} /> {requiresProof ? proofReady ? "Teslim kanıtı hazır." : "İlerlemeden önce fotoğraf, kod ve kontrol onayı gerekli." : "Görevi kabul ederek başla."}</span><button className="button button-primary" disabled={requiresProof && !proofReady} onClick={() => { if (action) { onStatusChange(action.next); setProofPhoto(false); setProofCode(""); setConditionChecked(false); } }}>{action?.label}<ArrowRight size={15} /></button></>}</div>
      </section>

      <aside className="panel role-side-panel courier-side-panel">
        <div className="role-panel-heading compact-heading"><div><span className="role-kicker">GÖREV DETAYI</span><h2>Taşınacak cihaz</h2></div><span className="request-code">CT-2408</span></div>
        <div className="courier-device-card"><div className="device-icon"><Smartphone size={22} /></div><div><strong>iPhone 13</strong><span>Ekran değişimi</span></div><span className="device-seal"><PackageCheck size={16} /></span></div>
        <div className="courier-facts"><div><span>TALEP SAHİBİ</span><strong>Ece Yılmaz</strong></div><div><span>ATANAN USTA</span><strong>Okan Yıldız</strong></div><div><span>TESLİMAT BÖLGESİ</span><strong>Kadıköy</strong></div></div>
        <div className="courier-note"><ShieldCheck size={16} /><span>Cihazı teslim alırken dış durumunu müşteriyle birlikte kontrol et. Teslim adımını uygulamada onayla.</span></div>
        <button className="button button-secondary courier-map-button"><Navigation size={15} />Rotayı görüntüle</button>
      </aside>
    </div>
    <div className="bottom-strip"><div><span className="bottom-mark"><Truck size={15} /></span><span><strong>Kurye hesabı açık</strong><small>Konum paylaşımı prototipte etkin değil</small></span></div><span className="role-bottom-note">Teslimat durumunu her adımda güncelle</span></div>
  </>;
}

function CustomerTracking({ status, courierStatus, eventHistory, onApprove }: { status: TechnicianJobStatus; courierStatus: CourierJobStatus; eventHistory: string[]; onApprove: () => void }) {
  const statusLabels: Record<TechnicianJobStatus, string> = { offer: "Usta eşleşmesi bekleniyor", accepted: "Usta işi kabul etti", repairing: "Tamir devam ediyor", approval: "Ek işlem için onayınız bekleniyor", parts: "Yedek parça bekleniyor", completed: "Tamir tamamlandı", declined: "Yeni usta aranıyor" };
  const active = status === "completed" ? 5 : status === "repairing" || status === "approval" || status === "parts" ? 3 : status === "accepted" ? 2 : 1;
  const steps = ["Talep alındı", "Usta bulundu", "Cihaz serviste", status === "approval" ? "Onayınız bekleniyor" : status === "parts" ? "Parça bekleniyor" : "Tamir ediliyor", "Tamamlandı", "Teslim edildi"];
  return <>
    <div className="page-heading"><div><div className="eyebrow"><span className="live-indicator" /> CİHAZ TAKİP</div><h1>Cihazınızın durumu<span className="wave">.</span></h1><p>Talebinizdeki gelişmeleri buradan takip edebilirsiniz.</p></div><span className="request-code">CT-2408</span></div>
    <section className="panel customer-track-panel"><div className="customer-track-head"><div className="device-icon"><Smartphone size={24}/></div><div><span>iPhone 13 · Ekran değişimi</span><h2>{statusLabels[status]}</h2><small>Son güncelleme: az önce</small></div><span className="status-badge status-offer"><i/>{statusLabels[status]}</span></div>
      <div className="customer-timeline">{steps.map((label, index) => <div key={label} className={`customer-timeline-step ${index < active ? "is-done" : index === active ? "is-current" : ""}`}><span>{index < active ? <Check size={14}/> : index + 1}</span><div><strong>{label}</strong><small>{index === 0 ? "Bugün, 10:18" : index < active ? "Tamamlandı" : index === active ? "Şu an" : "Sıradaki adım"}</small></div></div>)}</div>
      {status === "approval" && <div className="customer-approval"><strong>Ek işlem onayı gerekiyor</strong><p>Usta ek bir işlem ve ücret bilgisi iletti. Bu prototipte fiyat gösterimi ve onay kaydı örnek amaçlıdır.</p><button className="button button-primary" onClick={onApprove}>İşlemi onayla</button><button className="button button-secondary" onClick={() => window.alert("Destek iletişimi sonraki aşamada bağlanacak.")}>Ustayla görüş</button></div>}
      <section className="customer-event-history"><h3>Son hareketler</h3>{eventHistory.slice(0, 6).map((event, index) => <div key={`${event}-${index}`}><span className="history-icon"><Activity size={14}/></span><p>{event}</p></div>)}</section>
      <div className="customer-track-footer"><ShieldCheck size={18}/><span>Kurye durumu: {courierStatus === "completed" ? "Müşteriye teslim edildi" : courierStatus === "assigned" ? "Görev bekliyor" : "Kurye sürecinde"}. Gerçek bildirim gönderimi entegrasyon gerektirir.</span></div>
    </section>
    <div className="bottom-strip"><div><span className="bottom-mark"><Headphones size={15}/></span><span><strong>Yardıma mı ihtiyacınız var?</strong><small>Talep numaranız CT-2408</small></span></div><button className="text-button">Destek ekibi <ArrowRight size={14}/></button></div>
  </>;
}
