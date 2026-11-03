import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, Wrench } from "lucide-react";
import { authSetup, signIn } from "@/auth";
import AuthForm from "./auth-form";

const errorMessages: Record<string, string> = {
  CredentialsSignin: "E-posta veya parola hatalı.",
  MissingCSRF: "Giriş güvenlik doğrulaması yenilenemedi. Sayfayı yenileyip tekrar dene.",
  AccessDenied: "Giriş isteği tamamlanmadı. Hesap izinlerini kontrol edip tekrar deneyebilirsin.",
  OAuthAccountNotLinked: "Bu e-posta başka bir giriş yöntemiyle kayıtlı. Destek ekibinden yardım al.",
  OAuthCallback: "Sağlayıcıdan dönüş alınamadı. Biraz sonra tekrar dene.",
  OAuthSignin: "Giriş başlatılamadı. Biraz sonra tekrar dene.",
  Configuration: "Giriş sağlayıcılarının sunucu ayarları tamamlanmamış.",
  Default: "Giriş sırasında bir sorun oluştu. Biraz sonra tekrar dene.",
};

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" className="login-provider-mark">
      <path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.8 6.1-15Z" />
      <path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.6-5.1c-1.8 1.2-4.1 2-6.9 2-5.3 0-9.8-3.6-11.4-8.4H5.8v5.3A20.4 20.4 0 0 0 24 44Z" />
      <path fill="#FBBC05" d="M12.6 27.6a12.3 12.3 0 0 1 0-7.2v-5.3H5.8a20.1 20.1 0 0 0 0 17.8l6.8-5.3Z" />
      <path fill="#EA4335" d="M24 12c3 0 5.6 1 7.7 3.1l5.8-5.8C34 5.9 29.5 4 24 4A20.4 20.4 0 0 0 5.8 15.1l6.8 5.3C14.2 15.6 18.7 12 24 12Z" />
    </svg>
  );
}

function MicrosoftMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="login-provider-mark">
      <path fill="#F25022" d="M1 1h10v10H1z" /><path fill="#7FBA00" d="M13 1h10v10H13z" />
      <path fill="#00A4EF" d="M1 13h10v10H1z" /><path fill="#FFB900" d="M13 13h10v10H13z" />
    </svg>
  );
}

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ error?: string; mod?: string; next?: string }> }) {
  const { error, mod, next } = await searchParams;
  const mode = mod === "kayit" ? "register" : "login";
  const redirectTo = next?.startsWith("/") && !next.startsWith("//") ? next : "/panel";
  const loginHref = next ? `/giris?next=${encodeURIComponent(redirectTo)}` : "/giris";
  const registerHref = next ? `/giris?mod=kayit&next=${encodeURIComponent(redirectTo)}` : "/giris?mod=kayit";
  const googleReady = authSetup.secretConfigured && authSetup.googleConfigured;
  const microsoftReady = authSetup.secretConfigured && authSetup.microsoftConfigured;
  const errorMessage = error ? errorMessages[error] ?? errorMessages.Default : "";

  async function signInWithGoogle() {
    "use server";
    await signIn("google", { redirectTo });
  }

  async function signInWithMicrosoft() {
    "use server";
    await signIn("microsoft-entra-id", { redirectTo });
  }

  return (
    <main className="login-page">
      <header className="login-header">
        <Link className="landing-brand" href="/" aria-label="AloJetCep ana sayfa">
          <span className="landing-brand-icon"><Wrench size={19} strokeWidth={2.4} /></span>
          <span>AloJetCep<span className="landing-brand-dot">.</span></span>
        </Link>
        <Link className="login-back" href="/"><ArrowLeft size={16} /> Ana sayfa</Link>
      </header>

      <section className="login-card" aria-labelledby="login-title">
        <span className="login-kicker"><span /> HESABINA GÜVENLE GİRİŞ YAP</span>
        <h1 id="login-title">{mode === "register" ? "Hesabını oluştur." : "Tekrar hoş geldin."}</h1>
        <p className="login-intro">{mode === "register" ? "AloJetCep’e katıl, tamir sürecini kolayca takip et." : "AloJetCep hesabına güvenle giriş yap."}</p>

        <nav className="login-mode-tabs" aria-label="Hesap işlemi">
          <Link href={loginHref} className={mode === "login" ? "active" : ""} aria-current={mode === "login" ? "page" : undefined}>Giriş yap</Link>
          <Link href={registerHref} className={mode === "register" ? "active" : ""} aria-current={mode === "register" ? "page" : undefined}>Hesap oluştur</Link>
        </nav>
        <AuthForm key={mode} mode={mode} error={error} />

        <div className="login-providers">
          <form action={signInWithGoogle}>
            <button className="login-provider-button" type="submit" disabled={!googleReady}>
              <GoogleMark />
              <span>{googleReady ? "Google ile devam et" : "Google ile giriş"}</span>
              {googleReady ? <ArrowRight className="login-provider-arrow" size={17} /> : <span className="login-provider-status">Hazırlanıyor</span>}
            </button>
          </form>
          <form action={signInWithMicrosoft}>
            <button className="login-provider-button" type="submit" disabled={!microsoftReady}>
              <MicrosoftMark />
              <span>{microsoftReady ? "Microsoft ile devam et" : "Microsoft ile giriş"}</span>
              {microsoftReady ? <ArrowRight className="login-provider-arrow" size={17} /> : <span className="login-provider-status">Hazırlanıyor</span>}
            </button>
          </form>
        </div>

        <div className="login-divider"><span>VEYA</span></div>

        <div className="login-privacy"><CheckCircle2 size={18} /><span>{mode === "register" ? "Parolan güvenli şekilde özetlenir ve hesabında saklanır." : "Parolan güvenli bağlantı üzerinden doğrulanır."}</span></div>
      </section>

      <footer className="login-footer">Telefon tamirinde kolay ve şeffaf bir deneyim.</footer>
      <Link className="login-demo-link" href="/panel">Panele göz at <ArrowRight size={15} /></Link>
    </main>
  );
}
