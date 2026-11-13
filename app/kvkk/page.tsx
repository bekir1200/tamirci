import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { operator } from "@/lib/legal";

export const metadata = { title: "Aydınlatma metni | AloJetCep" };

export default function KvkkPage() {
  return (
    <main className="legal-page">
      <header className="login-header">
        <Link className="landing-brand" href="/" aria-label="AloJetCep ana sayfa">
          <Image className="landing-brand-logo" src="/brand/alojetcep-logo.png" alt="AloJetCep" width={280} height={196} />
        </Link>
        <Link className="login-back" href="/"><ArrowLeft size={16} /> Ana sayfa</Link>
      </header>

      <article className="legal-card">
        <h1>Kişisel verilerin korunması hakkında aydınlatma metni</h1>
        <p className="legal-updated">6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında hazırlanmıştır.</p>

        <h2>Veri sorumlusu</h2>
        <p>
          {operator.name ? <>{operator.name}</> : "AloJetCep"} kişisel verilerinizi aşağıda açıklanan kapsamda işler.
          {operator.address && <> Adres: {operator.address}.</>}
          {operator.email && <> E-posta: <a href={`mailto:${operator.email}`}>{operator.email}</a>.</>}
        </p>

        <h2>İşlenen veriler</h2>
        <p>Ad soyad, telefon numarası, e-posta adresi, il ve ilçe, teslimat adresi, cihaz marka ve modeli, IMEI numarası (girilmişse), arıza açıklaması ve talep geçmişi.</p>

        <h2>İşleme amaçları</h2>
        <ul>
          <li>Tamir talebinin oluşturulması ve uygun ustaya yönlendirilmesi</li>
          <li>Cihazın teslim alınması ve teslimatının kurye ile yapılması</li>
          <li>Talep durumu hakkında bilgilendirme</li>
          <li>Garanti sorgulaması ve kayıt altına alınması</li>
          <li>Hesap güvenliği ve yetkisiz erişimin önlenmesi</li>
        </ul>

        <h2>Hukuki sebep</h2>
        <p>Talebin oluşturulması ve hizmetin ifası için sözleşmenin kurulması ve ifası, hesap güvenliği için meşru menfaat. Tanıtım veya pazarlama amaçlı iletişim yalnızca açık rızanız ile yapılır.</p>

        <h2>Aktarım</h2>
        <p>Verileriniz, talebinize atanan usta ve kurye ile hizmeti sağlamak için gerekli altyapı ve e-posta hizmeti sağlayıcılarıyla paylaşılabilir. Bunun dışında üçüncü kişilere aktarılmaz.</p>

        <h2>Saklama</h2>
        <p>Verileriniz, talep ve hesabınız aktif olduğu sürece ve yasal saklama yükümlülükleri boyunca tutulur. Hesabınızı silmek için bize başvurabilirsiniz.</p>

        <h2>Haklarınız</h2>
        <p>KVKK&apos;nın 11. maddesi kapsamında verilerinizin işlenip işlenmediğini öğrenme, düzeltme, silme ve işlenmesine itiraz etme haklarına sahipsiniz. Başvurularınızı {operator.email ? <a href={`mailto:${operator.email}`}>{operator.email}</a> : "yukarıdaki iletişim kanallarından"} iletebilirsiniz.</p>
      </article>
    </main>
  );
}
