import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { mailConfigured } from "@/lib/mail";
import { RequestResetForm } from "./forms";

export const metadata = { title: "Parolanı sıfırla | AloJetCep" };

export default function ResetRequestPage() {
  return (
    <main className="login-page">
      <header className="login-header">
        <Link className="landing-brand" href="/" aria-label="AloJetCep ana sayfa">
          <Image className="landing-brand-logo" src="/brand/alojetcep-logo.png" alt="AloJetCep" width={280} height={196} priority />
        </Link>
        <Link className="login-back" href="/giris"><ArrowLeft size={16} /> Girişe dön</Link>
      </header>
      <section className="login-card" aria-labelledby="reset-title">
        <span className="login-kicker"><span /> PAROLA SIFIRLAMA</span>
        <h1 id="reset-title">Parolanı mı unuttun?</h1>
        <p className="login-intro">Kayıtlı e-posta adresini gir, sana sıfırlama bağlantısı gönderelim.</p>
        {mailConfigured() ? <RequestResetForm /> : <p className="credentials-message" role="status">Parola sıfırlama şu anda kullanılamıyor. Lütfen daha sonra tekrar dene.</p>}
      </section>
    </main>
  );
}
