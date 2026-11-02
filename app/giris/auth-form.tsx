"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { ArrowRight, LoaderCircle, UserRoundPlus } from "lucide-react";

type AuthFormProps = { mode: "login" | "register"; error?: string };

const messages: Record<string, string> = {
  CredentialsSignin: "E-posta veya parola hatalı.",
  Configuration: "Giriş ayarları tamamlanmamış. Biraz sonra tekrar dene.",
  Default: "İşlem tamamlanamadı. Bilgilerini kontrol edip tekrar dene.",
};

function redirectTarget() {
  const candidate = new URLSearchParams(window.location.search).get("next");
  return candidate?.startsWith("/") && !candidate.startsWith("//") ? candidate : "/panel";
}

export default function AuthForm({ mode, error }: AuthFormProps) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState(error ? messages[error] ?? messages.Default : "");
  const [success, setSuccess] = useState(false);

  async function submit(formData: FormData) {
    setPending(true);
    setMessage("");
    setSuccess(false);

    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const confirmation = String(formData.get("passwordConfirmation") ?? "");

    if (mode === "register") {
      if (name.length < 2) {
        setMessage("Ad soyad en az 2 karakter olmalı.");
        setPending(false);
        return;
      }
      if (password.length < 10) {
        setMessage("Parolan en az 10 karakter olmalı.");
        setPending(false);
        return;
      }
      if (password !== confirmation) {
        setMessage("Parola tekrarı eşleşmiyor.");
        setPending(false);
        return;
      }

      try {
        const response = await fetch("/api/kayit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });
        const result = (await response.json()) as { error?: string };
        if (!response.ok) {
          setMessage(result.error ?? messages.Default);
          setPending(false);
          return;
        }
        setSuccess(true);
        const login = await signIn("credentials", { email, password, redirect: false });
        if (login?.error) setMessage("Hesabın oluştu, ancak oturum açılamadı. Giriş sekmesinden devam et.");
        else window.location.assign(redirectTarget());
      } catch {
        setMessage("Sunucuya ulaşılamadı. Biraz sonra tekrar dene.");
      }
      setPending(false);
      return;
    }

    try {
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) setMessage(messages[result.error] ?? messages.Default);
      else window.location.assign(redirectTarget());
    } catch {
      setMessage("Sunucuya ulaşılamadı. Biraz sonra tekrar dene.");
    }
    setPending(false);
  }

  return (
    <form className="credentials-form" action={submit}>
      {mode === "register" && (
        <label className="credentials-field">
          <span>Ad soyad</span>
          <input name="name" type="text" autoComplete="name" placeholder="Adınız Soyadınız" required minLength={2} maxLength={80} />
        </label>
      )}
      <label className="credentials-field">
        <span>E-posta</span>
        <input name="email" type="email" autoComplete="email" placeholder="ornek@eposta.com" required maxLength={254} />
      </label>
      <label className="credentials-field">
        <span>Parola</span>
        <input name="password" type="password" autoComplete={mode === "register" ? "new-password" : "current-password"} placeholder={mode === "register" ? "En az 10 karakter" : "Parolanız"} required minLength={mode === "register" ? 10 : 1} maxLength={128} />
      </label>
      {mode === "register" && (
        <label className="credentials-field">
          <span>Parola tekrarı</span>
          <input name="passwordConfirmation" type="password" autoComplete="new-password" placeholder="Parolanızı yeniden yazın" required minLength={10} maxLength={128} />
        </label>
      )}
      {message && <p className="credentials-message" role="alert">{message}</p>}
      {success && <p className="credentials-success" role="status">Hesabın oluşturuldu, yönlendiriliyorsun.</p>}
      <button className="credentials-submit" type="submit" disabled={pending}>
        {pending ? <LoaderCircle className="credentials-spinner" size={20} /> : mode === "register" ? <UserRoundPlus size={19} /> : <ArrowRight size={19} />}
        {pending ? "İşleniyor…" : mode === "register" ? "Hesap oluştur" : "Giriş yap"}
      </button>
    </form>
  );
}
