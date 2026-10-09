# Doğrulama kaydı

9 Ekim 2026 — PeopleHUB v1

## Otomatik kontroller

`npm test`: 9 test geçti.

PostgreSQL/PGlite: yönetici içerik oluşturma; anonim ve ekip dışı erişimin engellenmesi; tasarımcının briefi veya rolü değiştirememesi; doğrudan tablo yazımının engellenmesi; tasarımcının onay verememesi; gerekçesiz revizyonun engellenmesi; yorum yazarının sunucudan alınması; eski kart sürümünün reddedilmesi; onaylı/onay bekleyen içeriğin düzenlenince taslağa dönmesi; yayınlanan kartın kilitlenmesi; geçersiz mecra-format ve bağlantıların reddedilmesi; erişimi kaldırılmış hesabın yeniden veri alamaması.

JavaScript: Türkiye saatine dönüşüm; ay sınırları ve pazartesi başlangıçlı takvim; güvenli bağlantı ve metin kaçışı; rol bazlı durum geçişleri.

## Tarayıcı kontrolü

Headless Chromium, 1500 px masaüstü ve 390 px mobil ekran. Örnek modda içerik oluşturma/kaydetme; brief/tasarım gerekliliği; yorum ekleme ve HTML içeren notun düz yazı olarak gösterilmesi; tasarımcı/onaycı rol değişimleri; revizyon notu; mecra/arama filtreleri; tarih-saatin farklı cihaz saat diliminde Türkiye saatini koruması; mobil yatay taşma kontrolü. Sayfada JavaScript hatası görülmedi.

`PeopleHUB-Onizleme.html` tek dosyası `file://` üzerinden açılıp örnek panelin çalıştığı ayrıca kontrol edildi.

## Canlı ortamda kalan kontrol

Supabase ve Google hesapları kurulmadığı için gerçek Google OAuth, Supabase HTTP API ve iki ayrı cihazdan gerçek ortak kayıt henüz test edilmedi. Paket, bu bağlantılar için hazır arayüz, SDK, SQL ve erişim kurallarını içerir. README'deki kurulum ve ekip testi tamamlanmadan canlı kullanıma hazır olduğu varsayılmamalıdır.
