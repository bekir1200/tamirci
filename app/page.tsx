import Link from "next/link";
import {
  ArrowDownRight, ArrowRight, BatteryCharging, Check, CheckCircle2,
  ChevronRight, Clock3, MapPin, ShieldCheck, Smartphone, Sparkles, Wrench,
} from "lucide-react";

const services = [
  { icon: Smartphone, title: "Ekran değişimi", detail: "Kırık ve görüntü sorunları" },
  { icon: BatteryCharging, title: "Pil değişimi", detail: "Hızlı tükenen piller" },
  { icon: Wrench, title: "Şarj ve bağlantı", detail: "Soket, ses ve bağlantı" },
];

export default function LandingPage() {
  return (
    <main className="landing-page">
      <header className="landing-header">
        <Link className="landing-brand" href="/" aria-label="AloJetCep ana sayfa">
          <span className="landing-brand-icon"><Wrench size={19} strokeWidth={2.4} /></span>
          <span>AloJetCep<span className="landing-brand-dot">.</span></span>
        </Link>
        <nav className="landing-nav" aria-label="Ana menü">
          <a href="#nasil-calisir">Nasıl çalışır?</a>
          <a href="#hizmetler">Hizmetler</a>
          <a href="#guven">Güvenli tamir</a>
        </nav>
        <Link className="landing-login" href="/giris">Giriş yap <ArrowRight size={16} /></Link>
      </header>

      <section className="landing-hero">
        <div className="hero-copy">
          <div className="hero-eyebrow"><span className="eyebrow-spark"><Sparkles size={14} /></span> Telefon tamirinde yeni bir kolaylık</div>
          <h1>Telefonun bozuldu.<br /><span>Çözümü yakınında.</span></h1>
          <p className="hero-description">İhtiyacına uygun telefon tamircisini bulalım. Talebin ekibimiz tarafından incelensin, uygun ustalar arasından sana özel yönlendirme yapılsın.</p>
          <div className="hero-actions">
            <Link className="button-primary" href="/talep">Tamir talebi oluştur <ArrowRight size={17} /></Link>
            <a className="button-secondary" href="#hizmetler">Hizmetleri gör <ArrowDownRight size={17} /></a>
          </div>
          <div className="hero-assurance"><div className="assurance-avatars"><span>CT</span><span><Wrench size={12} /></span><span><Check size={12} /></span></div><p><strong>Her adımda kontrol sende</strong><br />Talebin ve cihazın takip edilebilir.</p></div>
        </div>

        <div className="hero-visual" aria-label="Cep telefonu tamir sürecinin temsili görünümü">
          <div className="visual-orbit orbit-one" /><div className="visual-orbit orbit-two" />
          <div className="visual-glow" />
          <div className="phone-illustration">
            <div className="phone-camera" />
            <div className="phone-screen">
              <div className="phone-status"><span>9:41</span><span>•••</span></div>
              <div className="phone-check"><Check size={25} strokeWidth={2.3} /></div>
              <span className="phone-label">TAMİR SÜRECİ</span>
              <strong>Cihazın güvende</strong>
              <div className="phone-progress"><i /><i /><i /><i /></div>
              <div className="phone-stage"><span className="stage-dot" /><div><b>Usta inceliyor</b><small>Güncel durum</small></div><ChevronRight size={15} /></div>
            </div>
          </div>
          <div className="floating-card floating-status"><span className="float-icon green"><CheckCircle2 size={17} /></span><div><b>Kontrollü yönlendirme</b><small>Her talep ekip tarafından incelenir</small></div></div>
          <div className="floating-card floating-location"><span className="float-icon cream"><MapPin size={17} /></span><div><b>Yakınındaki ustalar</b><small>İhtiyacına uygun seçenekler</small></div></div>
          <div className="visual-caption"><span className="caption-line" /> GÜVENİLİR TAMİR, ŞEFFAF SÜREÇ</div>
        </div>
      </section>

      <section className="trust-strip" id="guven">
        <div className="trust-item"><ShieldCheck size={20} /><span><b>Kontrollü yönlendirme</b><small>Teklifler görevli onayıyla gönderilir</small></span></div>
        <div className="trust-item"><MapPin size={20} /><span><b>Sana yakın ustalar</b><small>Bölgen ve cihazına göre değerlendirme</small></span></div>
        <div className="trust-item"><Clock3 size={20} /><span><b>Durum takibi</b><small>Cihazının hangi aşamada olduğunu gör</small></span></div>
      </section>

      <section className="how-section" id="nasil-calisir">
        <div className="section-heading"><span className="section-kicker">BASİT VE ANLAŞILIR</span><h2>Üç adımda tamir süreci</h2><p>Talebinden teslimata kadar ne olacağını baştan bil.</p></div>
        <div className="steps-grid">
          <article className="step-card"><span className="step-number">01</span><div className="step-icon"><Smartphone size={21} /></div><h3>Arızanı anlat</h3><p>Cihazını, yaşadığın sorunu ve bulunduğun bölgeyi paylaş.</p><span className="step-connector" /></article>
          <article className="step-card"><span className="step-number">02</span><div className="step-icon"><Wrench size={21} /></div><h3>Ustaya yönlendirilelim</h3><p>Ekibimiz talebini incelesin ve uygun ustaya teklif göndersin.</p><span className="step-connector" /></article>
          <article className="step-card"><span className="step-number">03</span><div className="step-icon"><CheckCircle2 size={21} /></div><h3>Süreci takip et</h3><p>Teklif ve cihaz durumunu tek bir yerden kolayca takip et.</p></article>
        </div>
      </section>

      <section className="services-section" id="hizmetler">
        <div className="services-heading"><div><span className="section-kicker">YANINDAYIZ</span><h2>Telefonun için doğru çözüm</h2><p>Günlük hayatta en sık karşılaşılan arızalarda destek al.</p></div><a href="#nasil-calisir">Süreci öğren <ArrowRight size={15} /></a></div>
        <div className="services-grid">{services.map(({ icon: Icon, title, detail }) => <article className="service-card" key={title}><div className="service-icon"><Icon size={21} /></div><div><h3>{title}</h3><p>{detail}</p></div><ChevronRight size={17} className="service-arrow" /></article>)}</div>
      </section>

      <section className="landing-cta"><div><span className="section-kicker">CEPTAMİR YANINDA</span><h2>Telefonun için ilk adımı at.</h2><p>Talebini oluştur, gerisini birlikte takip edelim.</p></div><Link href="/talep" className="button-light">Ücretsiz talep oluştur <ArrowRight size={17} /></Link><div className="cta-decoration" /></section>

      <footer className="landing-footer"><Link className="landing-brand footer-brand" href="/"><span className="landing-brand-icon"><Wrench size={17} /></span><span>AloJetCep<span className="landing-brand-dot">.</span></span></Link><span>Telefon tamirinde kolay ve şeffaf bir deneyim.</span><span>© 2026 AloJetCep</span></footer>
    </main>
  );
}
