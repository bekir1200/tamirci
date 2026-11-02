"use client";

import { useEffect, useState } from "react";

type Props = { requestId: string; imei?: string; status?: string; expiresOn?: string; checkedAt?: string; onSaved: (value: { status: string; expiresOn: string; checkedAt: string }) => void };

export function WarrantyCheck({ requestId, imei, status, expiresOn, checkedAt, onSaved }: Props) {
  const [value, setValue] = useState(status ?? "unknown");
  const [expiry, setExpiry] = useState(expiresOn?.slice(0, 10) ?? "");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => { setValue(status ?? "unknown"); setExpiry(expiresOn?.slice(0, 10) ?? ""); setMessage(""); }, [requestId, status, expiresOn]);
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true); setMessage("");
    try {
      const response = await fetch(`/api/requests/${requestId}/warranty`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: value, expiresOn: expiry }) });
      const data = await response.json() as { error?: string; warranty?: { warranty_status: string; warranty_expires_on: string | null; warranty_checked_at: string } };
      if (!response.ok || !data.warranty) throw new Error(data.error ?? "Garanti bilgisi kaydedilemedi.");
      onSaved({ status: data.warranty.warranty_status, expiresOn: data.warranty.warranty_expires_on ?? "", checkedAt: data.warranty.warranty_checked_at });
      setMessage("Garanti bilgisi kaydedildi.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Garanti bilgisi kaydedilemedi."); }
    finally { setPending(false); }
  }
  return <form className="warranty-check" onSubmit={save}>
    <h3>Garanti sorgusu</h3>
    <p>{imei ? `IMEI: ${imei}` : "Bu talepte IMEI bulunmuyor."}</p>
    <a href="https://iunlocker.com/" target="_blank" rel="noopener noreferrer">iunlocker’da sorgula ↗</a>
    <p>Sonucu kontrol ettikten sonra aşağıya kaydet.</p>
    <label>Garanti durumu<select value={value} onChange={(event) => setValue(event.target.value)}><option value="unknown">Belirsiz</option><option value="in_warranty">Garanti kapsamında</option><option value="out_of_warranty">Garanti dışında</option></select></label>
    <label>Garanti bitiş tarihi <span>(isteğe bağlı)</span><input type="date" value={expiry} onChange={(event) => setExpiry(event.target.value)} /></label>
    {checkedAt && <small>Son kontrol: {new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Istanbul" }).format(new Date(checkedAt))}</small>}
    <button type="submit" className="button button-secondary" disabled={pending}>{pending ? "Kaydediliyor…" : "Sonucu kaydet"}</button>
    {message && <p role="status">{message}</p>}
  </form>;
}
