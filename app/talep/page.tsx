"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Clock3, ShieldCheck, Smartphone, Wrench } from "lucide-react";
import { phoneModels } from "@/lib/phone-models";
import { PhoneCombobox } from "./phone-combobox";

const issues = ["Ekran değişimi", "Pil değişimi", "Şarj soketi", "Kamera arızası", "Ses / mikrofon sorunu", "Diğer"];

export default function RepairRequestPage() {
  const [submittedId, setSubmittedId] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [catalogModels, setCatalogModels] = useState<string[]>([]);

  useEffect(() => {
    setCatalogModels([]);
    if (brand.trim().length < 2 || model.trim().length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ brand: brand.trim(), q: model.trim() });
        const response = await fetch(`/api/phone-models?${params}`, { signal: controller.signal });
        if (!response.ok) return;
        const data = await response.json() as { models?: string[] };
        setCatalogModels(Array.isArray(data.models) ? data.models : []);
      } catch { /* Local suggestions and manual entry remain available. */ }
    }, 400);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [brand, model]);

  async function submitRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("customer") ?? "").trim();
    setSaving(true);
    setFormError("");
    setNeedsSignIn(false);

    try {
      const response = await fetch("/api/requests", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: name, phone: String(data.get("phone") ?? "").trim(),
          device: `${String(data.get("brand") ?? "")} ${String(data.get("model") ?? "")}`.trim(),
          issue: String(data.get("issue") ?? "").trim(), city: String(data.get("city") ?? "").trim(),
          district: String(data.get("district") ?? "").trim(), description: String(data.get("description") ?? "").trim(), imei: String(data.get("imei") ?? "").trim(), deliveryAddress: String(data.get("deliveryAddress") ?? "").trim(),
        }),
      });
      const result = await response.json() as { request?: { reference?: string }; error?: string };
      if (response.status === 401) {
        setNeedsSignIn(true);
        setFormError("Talep oluşturmak için önce hesabına giriş yap.");
        return;
      }
      if (!response.ok || !result.request?.reference) throw new Error(result.error ?? "Talep oluşturulamadı. Bilgilerini kontrol edip tekrar dene.");
      setSubmittedId(result.request.reference);
      form.reset();
      setBrand("");
      setModel("");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Talep oluşturulamadı. Tekrar dene.");
      form.querySelector<HTMLElement>("[data-form-error]")?.focus();
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="request-page">
      <header className="request-header">
        <Link className="landing-brand" href="/" aria-label="AloJetCep ana sayfa">
          <span className="landing-brand-icon"><Wrench size={19} strokeWidth={2.4} /></span>
          <span>AloJetCep<span className="landing-brand-dot">.</span></span>
        </Link>
        <Link className="request-back" href="/"><ArrowLeft size={17} /> Ana sayfaya dön</Link>
      </header>

      <div className="request-layout">
        <section className="request-main" aria-labelledby="request-title">
          <div className="request-intro">
            <span className="request-eyebrow"><span /> ÜCRETSİZ TALEP OLUŞTUR</span>
            <h1 id="request-title">Telefonunda ne sorun var?</h1>
            <p>Bilgileri paylaş, ekibimiz talebini inceleyip sana uygun ustalara yönlendirsin.</p>
          </div>

          {submittedId ? (
            <section className="request-success" role="status" aria-live="polite">
              <span className="request-success-icon"><CheckCircle2 size={30} /></span>
              <span className="request-eyebrow">BİLGİLERİN HAZIR</span>
              <h2>Talep bilgilerin kaydedildi.</h2>
              <p>Talep numaranı not et. Ekibimiz bilgilerini inceleyip seninle iletişime geçecek.</p>
              <div className="request-reference"><span>Talep numaran</span><strong>{submittedId}</strong></div>
              <div className="request-success-actions">
                <Link className="request-submit" href="/">Ana sayfaya dön <ArrowRight size={18} /></Link>
                <button className="request-another" type="button" onClick={() => setSubmittedId("")}>Yeni talep oluştur</button>
              </div>
            </section>
          ) : (
            <form className="customer-request-form" onSubmit={submitRequest}>
              <div className="request-form-section">
                <div className="request-section-title"><span>01</span><div><h2>Cihaz bilgileri</h2><p>Ustanın doğru hazırlık yapmasına yardımcı olur.</p></div></div>
                <div className="request-form-grid">
                  <PhoneCombobox label="Marka" name="brand" value={brand} onChange={(value) => { setBrand(value); setModel(""); }} options={Object.keys(phoneModels).map((item) => item.replaceAll("_", " "))} placeholder="Marka seç veya yaz" maxLength={50} />
                  <PhoneCombobox label="Model" name="model" value={model} onChange={setModel} options={[...new Set([...(phoneModels[brand.replaceAll(" ", "_")] ?? []), ...catalogModels])]} placeholder="Model seç veya yaz" maxLength={60} />
                  <label className="request-field request-field-full"><span>IMEI numarası <small>İsteğe bağlı</small></span><input name="imei" type="text" inputMode="numeric" pattern="[0-9]{15}" maxLength={15} placeholder="15 haneli IMEI numarası" title="IMEI 15 rakamdan oluşmalı." /><small>Telefonunda *#06# tuşlayarak IMEI numaranı görebilirsin.</small></label>
                  <label className="request-field request-field-full"><span>Arıza türü</span><span className="request-select-wrap"><select name="issue" defaultValue="" required><option value="" disabled>Arıza seç</option>{issues.map((issue) => <option key={issue}>{issue}</option>)}</select><span aria-hidden="true" className="request-select-chevron" /></span></label>
                  <label className="request-field request-field-full"><span>Arızayı kısaca anlat <small>İsteğe bağlı</small></span><textarea name="description" placeholder="Ne zaman başladı, neler denedin?" rows={3} maxLength={500} /></label>
                </div>
              </div>

              <div className="request-form-section">
                <div className="request-section-title"><span>02</span><div><h2>Sana nasıl ulaşalım?</h2><p>Talebinle ilgili bilgi vermek için kullanacağız.</p></div></div>
                <div className="request-form-grid">
                  <label className="request-field"><span>Ad soyad</span><input name="customer" autoComplete="name" placeholder="Adın ve soyadın" minLength={2} maxLength={80} required /></label>
                  <label className="request-field"><span>Telefon numarası</span><input name="phone" type="tel" autoComplete="tel" inputMode="tel" placeholder="05xx xxx xx xx" pattern="[+]?[0-9 ()-]{10,20}" title="Geçerli bir telefon numarası gir." required /></label>
                  <label className="request-field"><span>İl</span><input name="city" autoComplete="address-level1" placeholder="İl" maxLength={50} required /></label>
                  <label className="request-field"><span>İlçe</span><input name="district" autoComplete="address-level2" placeholder="İlçe" maxLength={50} required /></label>
                  <label className="request-field request-field-full"><span>Cihazın alınacağı adres <small>Kurye istersen</small></span><textarea name="deliveryAddress" autoComplete="street-address" placeholder="Mahalle, sokak, bina ve daire" rows={3} maxLength={300} /></label>
                </div>
              </div>

              <label className="request-consent"><input type="checkbox" name="contactConsent" required /><span>Bu talep hakkında benimle iletişime geçilmesini kabul ediyorum.</span></label>
              <p className="request-form-error" data-form-error tabIndex={-1} role="alert" hidden={!formError}>{formError}{needsSignIn && <> <a href="/giris?mod=kayit&amp;next=%2Ftalep">Giriş yap veya hesap oluştur</a></>}</p>
              <button className="request-submit" type="submit" disabled={saving} aria-busy={saving}>
                {saving ? "Talebin kaydediliyor" : "Tamir talebimi oluştur"}{saving ? <span className="request-spinner" aria-hidden="true" /> : <ArrowRight size={18} />}
              </button>
              <p className="request-storage-note">Talep oluşturmak ücretsizdir. Ekibimiz talebini inceleyip sana bilgi verir.</p>
              <p className="request-storage-note">Telefon verilerinin bir bölümü <a href="https://github.com/GetTechAPI/TechAPI">TechAPI</a> tarafından sağlanır (<a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>).</p>
            </form>
          )}
        </section>

        <aside className="request-aside" aria-label="Talep süreci hakkında bilgi">
          <div className="request-aside-card">
            <span className="request-aside-icon"><Smartphone size={22} /></span>
            <h2>Süreç nasıl ilerleyecek?</h2>
            <div className="request-promise"><span><Check size={15} /></span><p><strong>Ekibimiz inceler</strong><small>Bilgilerin görevli tarafından kontrol edilir.</small></p></div>
            <div className="request-promise"><span><Wrench size={15} /></span><p><strong>Uygun ustaya yönlendirilirsin</strong><small>Teklif, onay sonrası ustaya gönderilir.</small></p></div>
            <div className="request-promise"><span><Clock3 size={15} /></span><p><strong>Ekibimiz sana bilgi verir</strong><small>Talebinle ilgili gelişmeleri paylaşırız.</small></p></div>
          </div>
          <div className="request-privacy"><ShieldCheck size={19} /><p><strong>Kontrollü yönlendirme</strong><span>Ödeme ve randevu bu aşamada alınmaz. Talebin önce ekip tarafından değerlendirilir.</span></p></div>
        </aside>
      </div>
    </main>
  );
}
