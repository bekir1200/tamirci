"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, FileText, LockKeyhole, Plus, ReceiptText, RefreshCw } from "lucide-react";
import type { AppRole } from "@/types/next-auth";
import PanelSidebar from "../panel-sidebar";

type Bill = {
  id: string; request_id: string; reference: string; device: string; document_type: "customer_sale" | "technician_purchase";
  issuer_name?: string | null; recipient_name?: string | null; document_number?: string | null; document_date?: string | null;
  total_amount: string; tax_amount?: string | null; document_status: string; customer_sale_amount?: string | null;
  technician_cost_amount?: string | null; created_at: string;
};
type Job = { id: string; reference: string; device: string; status?: string };

const money = (value: string | number | null | undefined) => `${Number(value ?? 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`;
const docTypeLabel = (type: Bill["document_type"]) => type === "customer_sale" ? "Müşteri satış faturası" : "Usta hizmet faturası";
const statusLabel: Record<string, string> = { draft: "Taslak", recorded: "Kaydedildi", sent: "Gönderildi", accepted: "Kabul edildi", rejected: "Reddedildi", cancelled: "İptal edildi" };

export default function BillingClient({ role, name }: { role: AppRole; name: string }) {
  const [bills, setBills] = useState<Bill[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [kind, setKind] = useState<Bill["document_type"]>(role === "technician" ? "technician_purchase" : "customer_sale");

  const refresh = useCallback(async () => {
    setBusy(true);
    try {
      const [docsResponse, jobsResponse] = await Promise.all([
        fetch("/api/financials", { cache: "no-store" }), fetch("/api/requests", { cache: "no-store" }),
      ]);
      const docsData = await docsResponse.json() as { documents?: Bill[]; error?: string };
      const jobsData = await jobsResponse.json() as { requests?: Record<string, unknown>[] };
      if (!docsResponse.ok) throw new Error(docsData.error ?? "Faturalar yüklenemedi.");
      setBills(docsData.documents ?? []);
      setJobs((jobsData.requests ?? []).map((row) => ({ id: String(row.id), reference: String(row.reference), device: String(row.device), status: String(row.status ?? "") })));
    } catch (error) { setNotice(error instanceof Error ? error.message : "Kayıtlar yüklenemedi."); }
    finally { setBusy(false); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setNotice("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const body = {
      requestId: String(form.get("requestId") ?? ""), documentType: kind,
      documentNumber: String(form.get("documentNumber") ?? ""), documentDate: String(form.get("documentDate") ?? "") || null,
      totalAmount: Number(form.get("totalAmount")), taxAmount: String(form.get("taxAmount") ?? "") || null,
      status: role === "admin" ? String(form.get("status") ?? "recorded") : "recorded",
    };
    try {
      const response = await fetch("/api/financials", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Fatura kaydedilemedi.");
      formElement.reset();
      setNotice("Fatura kaydı eklendi."); await refresh();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Fatura kaydedilemedi."); }
    finally { setSaving(false); }
  }

  const canRecord = role === "admin" || role === "technician";
  return <div className="subpage-layout"><PanelSidebar role={role} name={name} active="billing"/><main className="billing-page subpage-main">
    <header className="billing-header"><Link href="/panel"><ArrowLeft size={18}/> Panele dön</Link><span>AloJetCep · Finans</span></header>
    <div className="billing-main">
      <div className="billing-title"><span className="request-eyebrow"><ReceiptText size={15}/> FATURA VE HAKEDİŞ</span><h1>{role === "customer" ? "Faturalarım" : role === "technician" ? "Hizmet faturalarım" : "Fatura ve maliyet kayıtları"}</h1><p>{role === "customer" ? "AloJetCep tarafından düzenlenen satış faturalarını görüntüle." : role === "technician" ? "AloJetCep’e kestiğin hizmet faturalarını ve ilgili işlerini takip et." : "Müşteri satış faturalarını ve ustaların hizmet faturalarını iş emri bazında takip et."}</p></div>
      {role === "admin" && <div className="billing-privacy"><LockKeyhole size={18}/><span>Usta maliyeti ve marj bilgileri bu yönetim ekranıyla sınırlıdır. Müşteri ve usta API yanıtları birbirinden ayrıdır.</span></div>}
      {canRecord && <form className="billing-form" onSubmit={submit}>
        <div className="billing-form-heading"><div><h2><Plus size={19}/> Fatura kaydı ekle</h2><p>Bu kayıt entegratöre belge göndermez; mevcut belge bilgisini ve tutarını kaydeder.</p></div></div>
        <div className="billing-form-grid">
          <label>Belge türü<select value={kind} onChange={(event) => setKind(event.target.value as Bill["document_type"])}>{role === "admin" && <option value="customer_sale">Müşteriye satış faturası</option>}<option value="technician_purchase">Ustadan alınan hizmet faturası</option></select></label>
          <label>İş emri<select name="requestId" required defaultValue=""><option value="" disabled>İş emri seç</option>{jobs.map((job) => <option key={job.id} value={job.id}>{job.reference} · {job.device}</option>)}</select></label>
          <label>Fatura numarası<input name="documentNumber" maxLength={80} placeholder="Örn. AJC2026…" /></label>
          <label>Fatura tarihi<input name="documentDate" type="date" /></label>
          <label>Toplam tutar (₺)<input name="totalAmount" type="number" min="0" step="0.01" required /></label>
          <label>KDV tutarı (₺)<input name="taxAmount" type="number" min="0" step="0.01" /></label>
          {role === "admin" && <label>Belge durumu<select name="status" defaultValue="recorded"><option value="draft">Taslak</option><option value="recorded">Kaydedildi</option><option value="sent">Gönderildi</option><option value="accepted">Kabul edildi</option><option value="rejected">Reddedildi</option><option value="cancelled">İptal edildi</option></select></label>}
        </div>
        <button className="button button-primary" disabled={saving}>{saving ? "Kaydediliyor…" : "Fatura bilgisini kaydet"}</button>
      </form>}
      {notice && <p className="billing-notice" role="status">{notice}</p>}
      <section className="billing-list"><div className="billing-list-heading"><div><h2>İşlem kayıtları</h2><p>{bills.length} belge kaydı</p></div><button className="button button-secondary" onClick={() => void refresh()} aria-label="Faturaları yenile"><RefreshCw size={16}/> Yenile</button></div>
        {busy ? <p className="billing-empty">Kayıtlar yükleniyor…</p> : bills.length === 0 ? <div className="billing-empty"><FileText size={24}/><strong>Henüz fatura kaydı yok</strong><span>Bir iş emrine bağlı fatura bilgileri burada görünür.</span></div> : <div className="billing-cards">{bills.map((bill) => <article className="billing-card" key={bill.id}>
          <div className="billing-card-top"><span className="billing-kind">{docTypeLabel(bill.document_type)}</span><span className="billing-status">{statusLabel[bill.document_status] ?? bill.document_status}</span></div>
          <strong>{bill.reference} · {bill.device}</strong>
          <div className="billing-card-meta"><span>{bill.document_number || "Fatura no girilmemiş"}</span><span>{bill.document_date ? new Intl.DateTimeFormat("tr-TR").format(new Date(`${bill.document_date.slice(0,10)}T12:00:00`)) : "Tarih girilmemiş"}</span></div>
          <div className="billing-card-bottom"><span>Belge toplamı <strong>{money(bill.total_amount)}</strong></span>{role === "admin" && <><span>Müşteri satış tutarı<strong>{money(bill.customer_sale_amount)}</strong></span><span>Usta maliyeti<strong>{money(bill.technician_cost_amount)}</strong></span><span>Brüt fark<strong>{money(Number(bill.customer_sale_amount ?? 0) - Number(bill.technician_cost_amount ?? 0))}</strong></span></>}</div>
        </article>)}</div>}
      </section>
      <p className="billing-footnote">Gerçek e-Fatura/e-Arşiv gönderimi bu ekrana henüz bağlı değil. Entegratör bağlantısı yapıldığında belge numarası, gönderim sonucu ve dosya erişimi otomatik eşleştirilecek.</p>
    </div>
  </main></div>;
}
