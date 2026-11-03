"use client";
import { useEffect, useState } from "react";

export function DeliveryAddress({ requestId, initialAddress, disabled, onSaved }: { requestId: string; initialAddress?: string; disabled: boolean; onSaved: (address: string) => void }) {
  const [address, setAddress] = useState(initialAddress ?? "");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => { setAddress(initialAddress ?? ""); setMessage(""); }, [requestId, initialAddress]);
  async function save() {
    if (pending) return;
    setPending(true); setMessage("");
    try {
      const response = await fetch(`/api/requests/${requestId}/address`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ address }) });
      const data = await response.json() as { error?: string; address?: string };
      if (!response.ok || !data.address) throw new Error(data.error ?? "Adres kaydedilemedi.");
      onSaved(data.address); setMessage("Adres kaydedildi.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Adres kaydedilemedi."); }
    finally { setPending(false); }
  }
  return <div className="delivery-address"><label htmlFor="delivery-address">Cihazın alınacağı açık adres</label><textarea id="delivery-address" value={address} onChange={(event) => setAddress(event.target.value)} maxLength={300} rows={3} disabled={disabled || pending} placeholder="Mahalle, sokak, bina ve daire"/><button type="button" className="button button-secondary" disabled={disabled || pending || address.trim().length < 5 || address.trim() === (initialAddress ?? "")} onClick={() => void save()}>{pending ? "Kaydediliyor…" : "Adresi kaydet"}</button>{message && <p role="status">{message}</p>}</div>;
}
