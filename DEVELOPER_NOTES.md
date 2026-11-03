# Geliştirici notları

Bu dosya dahili geliştirme notları içindir. Kullanıcı arayüzünde teknik kurulum notu göstermeyin. Veri saklama davranışı değişirse müşteriye doğru ve sade bilgi verin.

## Uygulama durumu

- Panel rolü Auth.js oturumundan ve PostgreSQL'deki güncel kullanıcı kaydından belirlenir; kullanıcı arayüzünden rol değiştirilemez.
- Hesaplar, teklifler, talepler ve talep olayları PostgreSQL'de saklanır. Şema `database/001_core.sql` içindedir; `npm run db:migrate` ile uygulanır.
- Müşteri talep oluşturmak için müşteri hesabıyla giriş yapmalıdır. Talepler `/api/requests` üzerinden veritabanına yazılır ve görevli/admin kuyruğunda görünür.
- Admin kayıtlı kullanıcı rollerini `/admin/users` ekranından değiştirir. Yeni kayıtlar yalnızca `customer` rolüyle açılır. İlk admin için önce normal kayıt oluşturun, sonra `npm run db:promote-admin -- hesap@ornek.com` çalıştırın.
- Teklif gönderme yalnızca admin/görevli rolüne; teklif kabul/ret yalnızca hedef usta hesabına açıktır. Bir talebe en fazla bir usta atanır.
- Talep geçmişi `repair_events` kayıtlarından üretilir. `/api/requests/[requestId]/events` müşteri, ilgili usta ve operasyon rollerine erişim sınırı uygular; `/api/activity` yalnız admin/görevliye son hareketleri verir.
- Talep açma, teklif gönderme/kabul/ret, kabul edilmeyen tekliflerin kapatılması ve durum değişiklikleri olay geçmişine yazılır. Arayüzde sabit örnek hareket kullanılmamalıdır.
- Kurye görevleri `repair_deliveries` tablosunda kalıcı tutulur. Admin/görevli aktif kuryeyi talebe atar; görev yalnız atanmış kurye veya admin tarafından durumlandırılır. Aşamalar `assigned → accepted → picked_up → at_shop → returning → delivered` şeklindedir.
- Kurye konumu canlı paylaşılmaz; görev listesi ve mevcut teslimat aşaması kurye konumunun yerine geçmez. Tamir `ready_for_delivery` olmadan dönüş yolculuğu başlatılamaz; talep yalnız teslimat tamamlanınca `completed` olur.
- Kurye ataması yalnız `assigned` veya `accepted` aşamasında değiştirilebilir. Talep başına tek teslimat döngüsü vardır; tamamlanan teslimat tekrar açılamaz.
- Günlük site istatistikleri `daily_site_metrics` tablosunda yalnız toplu ziyaret oturumu ve başarılı giriş sayılarını tutar. Ziyaret sayacı tarayıcı sekmesi oturumu başına günde bir kez işler; IP veya sayfa gezinme geçmişi kaydetmez. Sayaç adminin `/admin/users` ekranında son 30 gün için görünür. Yeni tablo `007_daily_site_metrics.sql` ile eklenir.
- E-posta doğrulama, parola sıfırlama ve giriş denemesi hız sınırı henüz yoktur.
- Google ve Microsoft OAuth için gereken ortam değişkenleri ve callback adresleri `AUTH_SETUP.md` içindedir.
- E-posta/parola girişi `app/giris/actions.ts` içindeki Auth.js Server Action yolunu kullanır. İstemciden doğrudan credentials callback’ine gönderim mobil tarayıcılarda `MissingCSRF` üretebildiği için girişte Server Action tercih edilir; Auth.js’in CSRF kontrollerini genel olarak kapatmayın.

## Ortam hazırlığı

- Talep formu marka ve model aramasında TechAPI telefon listesini kullanır; mevcut yerel öneriler ve elle giriş yedektir. Kaynak: https://github.com/GetTechAPI/TechAPI. TechAPI verisi CC BY-SA 4.0 lisanslıdır: https://creativecommons.org/licenses/by-sa/4.0/. Öneriler sunucu üzerinden alınır, ilgili veri lisansı korunmalıdır. Kaynak listesinde aynı cihazın bölgesel varyantları olabilir; kaynak tüm cihazları kapsadığını garanti etmez.

- Yerel `.env.local` ve Vercel sunucu değişkenlerine `DATABASE_URL` ve `AUTH_SECRET` girin.
- İlk kurulumda veya mevcut veritabanını güncellerken `npm run db:migrate` çalıştırın. `002_deliveries.sql` yalnız ek tablo ve indeks oluşturur; mevcut kayıtları silmez.
- İlk admin hesabını kaydedip `npm run db:promote-admin -- hesap@ornek.com` ile admin yapın.
- DB bağlantısı olmadan kayıt, talep ve panel API'leri çalışmaz; bellek tabanlı sessiz bir yedek kullanmayın.

## Arayüz metni ilkesi

- Kullanıcıya ürünün mevcut davranışını ve veri saklama durumunu doğru anlatın.
- “Prototip”, “demo”, sabit test kodları, yapılandırma adımları ve dağıtım notlarını kullanıcı ekranında göstermeyin.
- İşlev hazır değilse tamamlanmış gibi göstermeyin; özelliği gizleyin veya kullanıcı odaklı bir durum açıklaması kullanın.
