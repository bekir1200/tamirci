"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";

async function postJson(url: string, payload: unknown) {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const data = (await response.json().catch(() => ({}))) as { error?: string; message?: string; ok?: boolean };
  return { ok: response.ok, data };
}

export function RequestResetForm() {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();
    setPending(true); setError(""); setMessage("");
    try {
      const { ok, data } = await postJson("/api/parola/unuttum", { email });
      if (!ok) setError(data.error ?? "İşlem tamamlanamadı.");
      else setMessage(data.message ?? "Bağlantı gönderildi.");
    } catch {
      setError("Sunucuya ulaşılamadı. Biraz sonra tekrar dene.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="credentials-form" onSubmit={submit}>
      <label className="credentials-field">
        <span>E-posta</span>
        <input name="email" type="email" autoComplete="email" placeholder="ornek@eposta.com" required maxLength={254} />
      </label>
      {error && <p className="credentials-message" role="alert">{error}</p>}
      {message && <p className="credentials-success" role="status">{message}</p>}
      <button className="credentials-submit" type="submit" disabled={pending}>
        {pending ? <LoaderCircle className="credentials-spinner" size={20} /> : <ArrowRight size={19} />}
        {pending ? "Gönderiliyor…" : "Sıfırlama bağlantısı gönder"}
      </button>
      <Link className="login-back" href="/giris">Girişe dön</Link>
    </form>
  );
}

export function NewPasswordForm({ token }: { token: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const password = String(data.get("password") ?? "");
    const confirmation = String(data.get("passwordConfirmation") ?? "");
    if (password !== confirmation) { setError("Parola tekrarı eşleşmiyor."); return; }
    setPending(true); setError("");
    try {
      const result = await postJson("/api/parola/sifirla", { token, password });
      if (!result.ok) setError(result.data.error ?? "Parola güncellenemedi.");
      else setDone(true);
    } catch {
      setError("Sunucuya ulaşılamadı. Biraz sonra tekrar dene.");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="credentials-form">
        <p className="credentials-success" role="status">Parolan güncellendi. Yeni parolanla giriş yapabilirsin.</p>
        <Link className="credentials-submit" href="/giris">Girişe git <ArrowRight size={19} /></Link>
      </div>
    );
  }

  return (
    <form className="credentials-form" onSubmit={submit}>
      <label className="credentials-field">
        <span>Yeni parola</span>
        <input name="password" type="password" autoComplete="new-password" placeholder="En az 10 karakter" required minLength={10} maxLength={128} />
      </label>
      <label className="credentials-field">
        <span>Parola tekrarı</span>
        <input name="passwordConfirmation" type="password" autoComplete="new-password" required minLength={10} maxLength={128} />
      </label>
      {error && <p className="credentials-message" role="alert">{error}</p>}
      <button className="credentials-submit" type="submit" disabled={pending}>
        {pending ? <LoaderCircle className="credentials-spinner" size={20} /> : <ArrowRight size={19} />}
        {pending ? "Kaydediliyor…" : "Parolayı kaydet"}
      </button>
    </form>
  );
}
