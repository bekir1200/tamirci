# Giriş, kayıt ve geliştirici kurulumu

Giriş ekranı Auth.js (NextAuth v5) üzerinden Google ve Microsoft Entra ID OAuth kullanır. Gizli anahtarları Git'e eklemeyin; proje kökündeki `.env.local` dosyasında veya Vercel'in Environment Variables bölümünde saklayın. `.env.example` yalnızca gereken değişken adlarını içerir.

## E-posta ile kayıt ve giriş

Giriş ekranı e-posta/parola ile hesap oluşturma ve giriş formu içerir. Parolalar Node.js `scrypt` ile rastgele salt kullanılarak özetlenir. Kayıt endpoint'i sunucu tarafında e-posta biçimini, ad ve parola uzunluklarını doğrular. Parola en az 10 karakterdir.

Hesaplar ve tamir talepleri PostgreSQL'de saklanır. İlk kurulumda `.env.local` dosyasına `DATABASE_URL` ekleyin ve `npm run db:migrate` komutunu çalıştırın. İlk admin hesabı için önce normal kayıt oluşturun, ardından `npm run db:promote-admin -- hesap@ornek.com` çalıştırın. Public kayıt formu her zaman `customer` rolü verir; bu yöntem admin yetkisini ilk kullanıcıya otomatik vermez.

Rol değişiklikleri sadece admin API'sinden yapılır. `admin`, `staff`, `technician`, `courier` ve `customer` rolleri server-side kontrol edilir. İlk admin oluşturulduktan sonra kullanıcıları `/admin/users` ekranından görevli, usta veya kurye yapabilir; usta profili için atölye, şehir, ilçe ve uzmanlık bilgileri eklenebilir. Son aktif adminin rolü düşürülemez.

E-posta doğrulama, parola sıfırlama ve oturum açma hız sınırı henüz uygulanmadı. Üretim yayını öncesi bu eksikler ayrıca tamamlanmalıdır.

## Gerekli ortam değişkenleri

- `AUTH_SECRET`: Auth.js oturumlarını imzalamak/şifrelemek için uzun, rastgele bir sunucu sırrı. Yerel ortamda `npx auth secret` ile üretilebilir.
- `DATABASE_URL`: PostgreSQL bağlantı dizesi. Vercel'de ve yerel `.env.local` dosyasında sunucu ortam değişkeni olarak tanımlayın; istemciye açmayın.
- Google: `AUTH_GOOGLE_ID` ve `AUTH_GOOGLE_SECRET`.
- Microsoft: `AUTH_MICROSOFT_ENTRA_ID_ID`, `AUTH_MICROSOFT_ENTRA_ID_SECRET` ve isteğe bağlı `AUTH_MICROSOFT_ENTRA_ID_ISSUER`.

Microsoft issuer varsayılanı `https://login.microsoftonline.com/common/v2.0` değeridir; kişisel Microsoft hesapları ile iş/okul hesaplarını kabul eder. Yalnızca tek bir kuruluş istenirse tenant'a özgü issuer kullanılmalıdır.

## OAuth callback adresleri

Sağlayıcı uygulamalarında web yönlendirme URI'si olarak tam callback adresini kaydedin:

- Yerel Google: `http://127.0.0.1:3005/api/auth/callback/google`
- Yerel Microsoft: `http://127.0.0.1:3005/api/auth/callback/microsoft-entra-id`
- Canlı ortam: aynı yolları Vercel alan adınızla kullanın (`https://<alan-adiniz>/api/auth/callback/google` ve `https://<alan-adiniz>/api/auth/callback/microsoft-entra-id`).

Kimlik bilgileri ve `AUTH_SECRET` eklenip uygulama yeniden başlatılınca ilgili OAuth düğmeleri etkinleşir. OAuth sağlayıcılarından gelen hesaplar doğrulanmış e-posta üzerinden bağlanır ve yeni OAuth hesapları `customer` rolüyle açılır.
