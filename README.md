# PeopleHUB — içerik planı, v1

Instagram ve LinkedIn için ortak içerik takvimi, tasarım briefleri, ekip notları ve onay takibi.

**Bu teslim:** çalışan arayüz ve Supabase bağlantısına hazır kaynak kod. Hesap veya canlı veritabanı oluşturulmadı, site yayınlanmadı. Örnek paneldeki veriler tamamen temsili; değişiklikler bellekte kalır ve sayfa yenilendiğinde sıfırlanır. Gerçek ekip modu, aşağıdaki kurulum tamamlandıktan sonra verileri Supabase'e kaydeder.

## Seçilen çözüm

- Kod ve arayüz: kendi GitHub hesabında, statik GitHub Pages sitesi.
- Ortak kayıt: Supabase PostgreSQL. Plan, yorumlar, kullanıcı rolleri ve işlem geçmişi burada tutulur.
- Giriş: Supabase Auth üzerinden Google hesabı. Panel parola toplamaz. Ekipte herkesin Google hesabı bulunmalı; bu, Gmail veya Google Workspace olabilir.
- Yetki: e-postası ekip tablosunda aktif olarak bulunan kullanıcılar erişir. Bir Google hesabıyla oturum açılması tek başına içerik erişimi vermez.
- Güncelleme: açık panel, görünür durumdayken 15 saniyede bir ortak planı kontrol eder. Yorum alanı yeni yorumlarla yenilenir; açık brief formu kendiliğinden üzerine yazılmaz.

| Rol | İzinler |
| --- | --- |
| Yönetici (`admin`) | İçerik oluşturur; tarih, mecra, paylaşım metni ve briefi düzenler; tasarım ve onay akışını yönetir; yayını tamamlandı olarak işaretler. |
| Tasarımcı (`designer`) | Tüm içerikleri ve briefleri okur; taslak/tasarım/revizyon aşamasında tasarım bağlantısını düzenler; tasarıma alır ve onaya gönderir. |
| Onaycı (`approver`) | Tüm içerikleri okur; onay bekleyen karta onay verir veya zorunlu notla revizyon ister. |

Her rol yorum yazabilir. Roller veritabanında kontrol edilir; ekran düğmelerini değiştirmek yetki kazandırmaz. Ekip üyeleri ilk sürümde Supabase SQL Editor üzerinden tanımlanır. Panel içinde davet, kullanıcı yönetimi veya dosya yükleme yoktur; tasarım bağlantısı eklenir.

## Başlangıç maliyeti ve sınırlar

9 Ekim 2026 tarihinde resmi kaynaklarda görülen bilgiler:

- GitHub Free ile GitHub Pages için repository **Public** olmalı. Kod herkese açık olur. Gerçek içerikleri, yorumları, kullanıcı listesini, gizli anahtarları ve parolaları repository'ye koyma; bunlar kod dosyalarına yazılmıyor.
- Supabase Free: $0/ay; 500 MB veritabanı; 50.000 aylık aktif kullanıcı; 5 GB çıkış trafiği; en fazla 2 aktif proje. Bir hafta kullanılmayan projeler duraklatılabilir. Otomatik yedekleme ücretsiz planda bulunmuyor. Tasarımlar burada dosya olarak tutulmadığı için 1 GB dosya depolama kotası kullanılmıyor.
- Supabase Pro $25/aydan başlar; üretim için kesintisiz erişim ve yedekleme ihtiyacı oluştuğunda değerlendirilebilir. Başlangıç için ücretli plan seçmek gerekmiyor.
- Google girişinin kurulumu için Google Cloud'da bir proje ve OAuth istemcisi tanımlanır. Bu panel için ücretli Google API veya Google Workspace satın alma adımı yoktur.
- Özel alan adı gerekli değil. GitHub adresi `https://KULLANICI.github.io/peoplehub/` olur.
- GitHub Pages ticari SaaS ve hassas işlemler için genel amaçlı barındırma hizmeti değildir. Bu paket teknik olarak Pages ile çalışır; ekip içi panelin uzun süreli kurumsal kullanımı için GitHub'ın kullanım sınırlarını değerlendirin. Ticari SaaS hizmetine dönüşürse GitHub'daki kodu koruyup arayüzü uygulama barındırma hizmetine taşıyın. Giriş Google/Supabase ekranında yapılır.

Kaynaklar: https://supabase.com/pricing · https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits

## Kurulum — sırayla

### 1. GitHub repository oluştur

1. https://github.com üzerinden kendi hesabına gir.
2. **New repository** seç. Adı `peoplehub`, görünürlüğü **Public** olsun.
3. ZIP'i bilgisayarında aç. `peoplehub` klasörünün **içindeki** dosyaları repository köküne yükle. Bir üst klasörü yükleyip `peoplehub/peoplehub/index.html` oluşturmamaya dikkat et.
4. `index.html`, `app.js`, `repository.js`, `domain.js`, `config.js`, `style.css` ve `vendor` klasörü site dosyalarıdır. `database` klasörü kurulum SQL'ini; `tests` testleri içerir. `node_modules` yüklenmez.
5. `vendor/supabase.js` hazır paketlenmiştir. Siteyi yayınlamak için bilgisayarına Node.js kurman veya build komutu çalıştırman gerekmez.

### 2. Supabase projesi oluştur

1. https://supabase.com/dashboard üzerinden hesap aç/giriş yap ve **New project** seç.
2. Adı `PeopleHUB`, planı Free olsun. Yakın bir Avrupa bölgesi seçebilirsin.
3. Veritabanı parolasını parola yöneticinde sakla; panel dosyalarına yazma.
4. Proje hazır olduğunda **SQL Editor → New query** aç.
5. Paketteki `database/schema.sql` dosyasının tamamını yapıştırıp **Run** seç. Yeni bir projede bir kez çalıştır. Aynı şemayı ikinci kez kurmaya çalışma.
6. **Project Settings / Connect / API Keys** ekranlarından **Project URL** ve **Publishable key** değerlerini bul. Eski projelerdeki `anon` anahtarı da desteklenir.
7. **service_role**, `sb_secret_...` anahtarı veya veritabanı parolasını kullanma. Publishable anahtar arayüzde görünür; veriyi koruyan şey sunucudaki erişim kurallarıdır.

### 3. Google girişini bağla

1. https://console.cloud.google.com üzerinden kendi Google hesabınla giriş yap; `PeopleHUB` adında bir proje oluştur veya uygun projenizi seç.
2. **Google Auth Platform** içinde **Branding**, **Audience** ve **Data Access** bölümlerini yapılandır. Uygulama adı `PeopleHUB`, destek e-postası senin adresin olabilir.
3. Tüm ekip aynı Google Workspace kuruluşundaysa ve Internal seçeneği kullanılabiliyorsa **Internal** seç. Farklı kuruluş/Gmail hesapları varsa **External** seç.
4. Başlangıçta External/Testing kullanırsan **Test users** listesine tüm ekip Google adreslerini ekle. Bu Google listesi ile aşağıdaki Supabase ekip listesi ayrı kontrollere sahiptir; ikisi de doğru olmalı. Kalıcı kullanıma geçişte Google Audience ekranından uygulama yayın durumunu değerlendirin; Testing bazı OAuth oturumlarında tekrar giriş gerektirebilir.
5. Yalnızca `openid`, `userinfo.email`, `userinfo.profile` profil kapsamlarını kullan. Drive, Gmail veya başka veri izinleri ekleme.
6. **Clients → Create client → Web application** seç.
7. **Authorized JavaScript origins** alanına `https://KULLANICI.github.io` yaz. Bu alana `/peoplehub/` yolunu ekleme.
8. Supabase'te **Authentication → Sign In / Providers → Google** aç. Ekrandaki callback adresini kopyala; örnek: `https://PROJE.supabase.co/auth/v1/callback`.
9. Google istemcisinin **Authorized redirect URIs** alanına bu Supabase callback adresini ekle.
10. Google'ın verdiği **Client ID** ve **Client Secret** değerlerini Supabase Google provider ekranına gir; provider'ı etkinleştir ve kaydet. Client Secret yalnızca Supabase'te kalır; GitHub'a ve sohbete yazılmaz.
11. Supabase'te **Authentication → URL Configuration**: **Site URL** ve izin verilen **Redirect URLs** olarak `https://KULLANICI.github.io/peoplehub/` ekle. Sondaki `/` dahil adresi eşleştir.
12. Google OAuth ilk girişte kullanıcı oluşturduğu için Supabase'in **Allow new users to sign up** ayarını açık bırak. E-posta/parola, anonim giriş ve kullanmayacağın diğer provider'ları kapat. Google hesabı açabilen biri yalnızca Auth kaydı elde eder; ekip listesinde yoksa veri göremez.

Resmi kılavuz: https://supabase.com/docs/guides/auth/social-login/auth-google

### 4. Ekip erişimini tanımla

1. `database/team-template.sql` içindeki örnek e-posta adreslerini **Google ile girişte kullanılan gerçek e-postalarla** değiştir. Hepsi küçük harf olmalı.
2. Görünecek isimleri ve rolleri gir. Kendi hesabın `admin`, tasarımcı `designer`, onaycı `approver` olsun. Birden fazla kişi eklemek için satır ekleyebilirsin.
3. Bu sorguyu Supabase SQL Editor'da çalıştır. Gerçek e-postalarla doldurulan sorguyu herkese açık GitHub repository'sine yükleme. Repository'de yalnızca örnek şablon kalsın.
4. Erişimi kaldırmak için `active=false` yap. Bir sonraki veri isteği engellenir; açık panel kontrol edildiğinde kapanır. Daha önce görülen/kopyalanan veriler geri alınamaz.
5. Rol değişikliklerini aynı tablodan yap. Supabase proje yönetimine tasarımcı/onaycıları eklemene gerek yok; onlar yalnızca panel adresini kullanır.

### 5. Paneli projeye bağla

GitHub'da `config.js` dosyasını düzenle:

```js
export const config = {
  supabaseUrl: 'https://PROJE.supabase.co',
  supabasePublishableKey: 'sb_publishable_ORNEK',
};
```

Örnek değerleri kendi **Project URL** ve **Publishable key** değerlerinle değiştir. Kaydet/commit et.

### 6. GitHub Pages'i aç

1. Repository'de **Settings → Pages** aç.
2. **Source: Deploy from a branch** seç.
3. **Branch: main**, klasör: **/(root)** seç ve kaydet.
4. GitHub'ın gösterdiği site adresini aç. İlk yayın birkaç dakika sürebilir.
5. Adresin farklıysa Supabase Redirect URLs ve Google origins ayarlarını da güncelle.
6. Google hesabınla giriş yap. Yönetici olarak ilk gerçek içeriğini ekle.

Canlı modda örnek içerikler veritabanına eklenmez. İlk ekran boş olur; yönetici içerik oluşturur. Örnek panel ayrı bir çalışma alanıdır, canlı içeriklere erişmez.

### 7. Ekip testini tamamla

- Yönetici hesabıyla bir içerik oluştur: mecra, format, tarih/saat, caption, brief ve görsel metinlerini ekle.
- Başka bir tarayıcı/cihazda tasarımcı hesabıyla aynı içeriği aç; bağlantı ve not ekle. İlk cihazda 15 saniye içinde güncellemeyi kontrol et.
- **Onaya gönder** için brief ve tasarım bağlantısı dolu olmalı.
- Onaycı hesabıyla **Revizyon iste**; gerekçenin yorum olarak görünmesini kontrol et. Tasarımcı bağlantıyı güncelleyip tekrar onaya göndersin.
- Onaycı **Onay ver** desin. Yönetici onaylı metni değiştirirse kart taslağa dönmeli.
- İki yönetici sekmesinde aynı kartı açıp düzenle: eski sürümün kaydı reddedilmeli, ikinci kişinin değişikliği ilk kaydı ezmemeli.
- Ekip listesinde bulunmayan bir Google hesabı kullan; plan ve yorumlar görünmemeli. E-posta adreslerini sadece gizlemek yeterli değildir; bu kontrol veritabanında yapılır.
- Paylaşımı ilgili mecrada manuel yap; ardından yönetici **Yayınlandı olarak işaretle** desin. Panel bu işlemi otomatik paylaşım olarak sunmaz.

## Kurulumsuz önizleme

Ayrıca teslim edilen `PeopleHUB-Onizleme.html` dosyasını indirip tarayıcıda doğrudan açabilirsin. **Örnek paneli incele** seç. Bu dosya internete bağlanmadan örnek verilerle çalışır; gerçek ekip bağlantısı için ZIP paketini kurmak gerekir.

## Kaynak koddan örnek paneli bilgisayarda açma

Modül dosyaları nedeniyle `index.html` dosyasına çift tıklayarak `file://` üzerinden açmak yeterli değildir. GitHub Pages üzerinden örnek paneli görebilirsin. Yerelde geliştirici yöntemi:

```bash
cd peoplehub
python -m http.server 8765
```

Tarayıcıda `http://localhost:8765` aç; **Örnek paneli incele** seç. Rol seçicisi üç rolün deneyimini denemeni sağlar. Örnek mod hiçbir paylaşım veya e-posta göndermez.

## Geliştirici notları ve doğrulama

Vanilla JavaScript + CSS + vendored Supabase SDK; framework/build zorunluluğu yok. GitHub Pages alt klasörüne uygun göreli dosya yolları kullanılır. Google OAuth için PKCE; giriş oturumu Supabase SDK tarafından tarayıcıda tutulur. İçerik ve yorumlar tarayıcı depolamasına kaydedilmez. HTTPS tasarım bağlantıları ve HTML kaçışları uygulanır. Tüm saatler Türkiye saatidir (Europe/Istanbul / UTC+3).

SQL: RLS etkin; anonim erişim kapalı; ekip dışındaki oturumlar veri okuyamaz. authenticated rolünün doğrudan yazma yetkisi yoktur; değişiklikler kimliği doğrulayan RPC fonksiyonlarından geçer. Yorum yazarı sunucuda atanır. Düzenleme ve durum geçişlerinde satır kilidi + sürüm kontrolü kullanılır. Yorumlar ayrı kayıtlar olduğu için eşzamanlı notlar birbirini ezmez. Silme özelliği yoktur. Yayınlanan kartlar ilk sürümde kilitlidir. Onay bekleyen veya onaylanan kartın içerik düzenlemesi taslak durumuna döndürür; yorum eklemek onayı sıfırlamaz.

Testleri çalıştırmak: `npm ci` ardından `npm test`. SQL testleri PGlite'ta PostgreSQL motorunda çalışır; Auth kullanıcı tablosu ve oturum kimliği test ortamında taklit edilir. Canlı Supabase/Google hesabı olmadığından gerçek OAuth ve cihazlar arası bağlantı teslim sırasında denenemedi; kurulum sonrası yukarıdaki ekip testi gerekir.

SDK'yi yeniden paketlemek: `npm run vendor`. SDK lisansı `vendor/SUPABASE-LICENSE` dosyasında. Paket sürümleri `package-lock.json` içinde sabittir. Arayüz site dosyalarından bağımsız API anahtarları gerektirmez; yalnızca public Supabase proje anahtarı kullanılır.

İlk sürümde otomatik sosyal medya paylaşımı, dosya yükleme, bildirim/e-posta gönderme, sürüm geri alma ve farklı markalara ait ayrı çalışma alanları bulunmuyor. Bunlar bu teslimin kapsamına dahil değil.
