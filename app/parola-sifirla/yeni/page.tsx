import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { NewPasswordForm } from "../forms";

export const metadata = { title: "Yeni parola | AloJetCep" };

export default async function NewPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  return (
    <main className="login-page">
      <header className="login-header">
        <Link className="landing-brand" href="/" aria-label="AloJetCep ana sayfa">
          <Image className="landing-brand-logo" src="/brand/alojetcep-logo.png" alt="AloJetCep" width={280} height={196} priority />
        </Link>
        <Link className="login-back" href="/giris"><ArrowLeft size={16} /> Girişe dön</Link>
      </header>
      <section className="login-card" aria-labelledby="new-password-title">
        <span className="login-kicker"><span /> YENİ PAROLA</span>
        <h1 id="new-password-title">Yeni parolanı belirle.</h1>
        <p className="login-intro">Parolan en az 10 karakter olmalı.</p>
        {token ? <NewPasswordForm token={token} /> : <p className="credentials-message" role="alert">Bağlantı eksik. Yeni bir sıfırlama bağlantısı iste.</p>}
      </section>
    </main>
  );
}
