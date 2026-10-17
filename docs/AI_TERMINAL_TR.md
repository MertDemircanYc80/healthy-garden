# Ücretsiz AI + terminalden haftalık demo

Bu dalda Gemini bağlantısı ve terminal kontrolü hazırdır. **Kendi API anahtarınızı girene ve ilk canlı isteği başarıyla alana kadar uygulamayı canlı AI'a bağlanmış saymayın.** Otomatik kontroller model yanıtını taklit eder; gerçek hesap kotasını doğrulamaz.

## 1. Bir kez kurulum

Node 22.9+ gerekir (Mac'te Node 24 kullanıldı). Mac ve iPhone aynı Wi-Fi'da olmalı.

[Google AI Studio → API keys](https://aistudio.google.com/apikey) üzerinden ücretsiz bir projede anahtar oluşturun. Model `gemini-3.8-flash`: [resmî fiyatlandırmada](https://ai.google.dev/gemini-api/docs/pricing) ücretsiz giriş/çıkış kotası bulunur; kullanım sınırları hesabınıza bağlıdır. Ücretli plana geçmek gerekmez. Kota aşılırsa uygulama hata gösterir, kendiliğinden ücretli modele geçmez.

```bash
cd ~/healthy-garden/mobile
npm run demo:setup
```

İstendiğinde anahtarı yapıştırıp Enter'a basın. Yazdığınız anahtar terminalde görünmez; yıldız da çıkmaz. ⌘V ile yapıştırdıktan sonra Enter’a basın. Ctrl+C kurulumu iptal eder; “Yerel ayarlar hazır” mesajı gelmeden sunucuyu başlatmayın. Anahtarı komutun içine veya sohbete yazmayın. Kurulum mevcut yerel ayarların diğer alanlarını korur; anahtar yalnız gitignored `.env.coach.local` içinde kalır. Expo'ya yalnız Mac'in yerel adresi ve demo erişim kodu verilir.

**Gizli yapıştırmada hata oluyorsa Mac panosundan kurulum:**

```bash
npm run demo:setup -- --clipboard
```

Önce bu komutu başlatın. Komut beklerken AI Studio’ya dönüp API anahtarının kopyalama düğmesine tıklayın. Terminale dönün ve yalnız Enter’a basın. Anahtarı yapıştırmanız gerekmez; pano o anda okunur ve anahtar gösterilmeden yerel ayara kaydedilir. Anahtarın adını veya ekranda kısaltılmış/gizlenmiş görünümünü kopyalamayın. Kod, tırnak ve görünmez kopyalama işaretlerini temizler; geçersiz metni hata mesajında göstermez. “Yerel ayarlar hazır” mesajından sonra `npm run coach` çalıştırın.

Yeni auth anahtarlarının `AQ.` biçimi desteklenir; tek nokta anahtarın bir parçasıdır. `…` veya yıldız içeren kısaltılmış/gizlenmiş metin yine reddedilir. Bu sürümde ilk 7 günlük demo verisiyle gerçek Gemini isteği de doğrulandı; anahtar ve sunucudaki yanıt önbelleği yalnız yerel dosyalarda tutulur.

Birden fazla ağ adaptörü varsa Wi-Fi adresi tercih edilir. Telefon bağlanamıyorsa kendi Mac Wi-Fi IP'nizle tekrar çalıştırın:

```bash
npm run demo:setup -- --host=192.168.1.183
```

Buradaki IP örnektir; farklı Wi-Fi'a geçince kurulumu yeniden çalıştırın. Aynı ağdan erişim için yerel sunucu tüm ağ adaptörlerini dinler; kullanım alanı bu yerel hackathon demosudur.

## 2. Üç terminal açın

**Terminal 1 — AI ve demo sunucusu:**

```bash
cd ~/healthy-garden/mobile
npm run coach
```

**Terminal 2 — telefon uygulaması:** Önce eski Expo sunucusunu Ctrl+C ile kapatın.

```bash
cd ~/healthy-garden/mobile
npm start -- --clear
```

Expo Go ile QR'ı açın. Yeni ayarların uygulamaya geçmesi için Expo'yu yeniden başlatmak gerekir. Terminal 1 ve 2 çekim boyunca açık kalmalı; internet yalnız canlı AI isteği için gereklidir.

**Terminal 3 — sunucu durumunu kontrol edin:**

```bash
cd ~/healthy-garden/mobile
npm run demo -- status
```

“Anahtar kayıtlı” sadece ayarın bulunduğunu söyler. Canlı bağlantının kanıtı `week 1` komutundan sonra “canlı AI yanıtı alındı” ve telefondaki **Gemini · live response** yazısıdır.

## 3. Haftaları yükleyin

Çekim için boş başlangıç istiyorsanız aşağıdaki komut **yalnız bu dalın demo bahçesini, alışverişlerini ve ödüllerini** sıfırlar. Eski uygulama sürümünün kayıt anahtarına dokunmaz:

```bash
npm run demo -- reset --yes
```

Komutları aynı anda çalıştırmayın. Her adımda telefondan “Uygulandı ✓” onayını bekleyin:

| Komut | Telefonda görülen |
| --- | --- |
| `npm run demo -- week 1` | İlk 7 gün, sıfır başlangıç ödülü, AI'ın ilk hedefleri ve açıklaması |
| `npm run demo -- next` | 8. günün 14:00 verisi; hedeflerde ara ilerleme |
| `npm run demo -- finish` | 8. günün son verisi; tutan hedeflere gold |
| `npm run demo -- next` | 9. gün; önceki gün sulanan bitki büyür |
| `npm run demo -- week 2` | 14. güne kadar tamamlanmış veriler, önceki hedeflerden kazanılan ödüller, yeni AI planı |
| `npm run demo -- week 3` | 21. güne kadar veri + ödüller + AI güncellemesi |
| `npm run demo -- week 4` | 28. güne kadar veri + ödüller + AI güncellemesi |
| `npm run demo -- week 5` | Kalan iki gün: 30 günlük tamamlanmış rapor ve kapanış analizi |

`next`/`finish` terminalde günlük ilerlemeyi yönetir; yeni haftanın AI analizini almak için ilgili `week N` komutunu çalıştırın.

`week 2`, 8. gün tekrar yüklenmiş olsa bile onu ikinci kez ödüllendirmez. Haftalık komut kalan günleri uygulamanın normal gün sonu kurallarıyla tamamlar; yeni AI planını geçmiş günlerin ödülünü değiştirmek için kullanmaz. Gelecekteki günler erken açılmaz. Önceki hafta yüklenmeden sonraki haftaya atlanmaz.

Bunlar Supabase'e canlı hasta kaydı ekleyen komutlar değildir: bu dalın GitHub'daki sabit 30 günlük demo kaydını uygulamanın yerel replay kaydına açar. AI'a yalnız o ana kadarki tamamlanmış günler gönderilir. Sağlık/gün ışığı/scroll grafikleri, günlük hedefler, gold ve bahçe aynı kayıt üzerinden güncellenir.

**Sulama ve alışveriş otomatize edilmez.** Telefonda bitki ve su alın, Water moduyla bitkiye dokunun, sonra `next` çalıştırın. Haftayı tek komutla atlamak, sulamadığınız günler boyunca bitkiye ücretsiz bakım sağlamaz. Çok büyüme göstermek için ilk haftalık geçişten sonra birkaç `next → finish → su al → sula` döngüsü kaydedin. Bu döngüleri montajda hızlandırabilirsiniz.

Canlı AI'ın hedefleri ve ödül tutarları her üretimde değişebilir; ilk gün mutlaka 25 gold varsaymayın. Bakiye yetmiyorsa sonraki günleri tamamlayıp alışverişi sonra gösterin. Hazırlanmış prova analizinde ilk ödül 25 gold'dur: Daisy 20 + Water refill 5.

## 4. 2 dakika 45 saniyelik çekim

- **0:00–0:15:** boş bahçe ve boş Report. “Verileri daha iyi alışkanlıklara dönüştürüyoruz.”
- **0:15–0:45:** `week 1`. Report'ta uyku ve feed süresini açın; ardından Coach/Goals. “AI ilk haftayı analiz etti, sonraki günler için kişisel hedefler koydu.” İlk isteği beklerken ekran kaydı çalışabilir; bekleme kısmını montajda kısaltın.
- **0:45–1:15:** `next`, hedef ilerlemesi, `finish`, gold. “Ara veriler hedefleri güncelliyor; ödül gün sonunda geliyor. Her hedef her gün tamamlanmıyor.”
- **1:15–1:45:** bitki satın alıp ekin, su alın, bitkiye dokunarak sulayın, `next` ile büyümeyi gösterin.
- **1:45–2:20:** `week 2`, `week 3`, `week 4`; aralarda bahçe bakımı ve yeni bitki ekleme. Aynı bakım/gün geçişlerini hızlandırın. Coach'ta önceki hedeflerin sonuçlarını ve yeni önerileri gösterin.
- **2:20–2:45:** `week 5`, Report'ta 30 günlük grafiği ve bahçeyi gösterin. Veri kaynağını söyleyin: “Public wearable kayıtlarıyla açıkça işaretlenmiş kurgusal telefon/gün ışığı/beslenme alanlarını birlikte kullanıyoruz.”

## Prova, tekrar çekim ve hatalar

- **Anahtarsız prova:** `npm run demo:setup -- --no-key`, ardından aynı sunucuları açıp `npm run demo -- week 1 --prepared` kullanın. Her hafta `--prepared` ekleyin. Bu seçenek canlı modele bağlanmaz; **Prepared AI** yazısını korur.
- **Tekrar çekim:** `reset --yes` ardından tekrar `week 1`. Aynı hafta/model için daha önce alınan canlı AI sonucu yerel olarak saklanır. Terminal “önceki canlı AI sonucu yeniden kullanıldı”, uygulama **Gemini · saved result** der. Bu canlı bağlantının ilk istekte alındığı bir analizdir; tekrar çekimde yeni API çağrısı yapılmış gibi anlatmayın.
- **Canlı yanıt başarısızsa:** veri/altın değişmez ve sessizce prova analizine geçilmez. Kota için biraz bekleyin veya açıkça `week N --prepared` seçin. Anahtar/model erişimini AI Studio'dan kontrol edin.
- **“Henüz telefondan onay gelmedi”:** komut sunucuda kayıtlıdır. Uygulama açık ve aynı Wi-Fi'da olmalı; Expo kurulumdan sonra yeniden başlatılmalı. Mac güvenlik duvarının Node yerel ağ erişimine izin vermesi gerekir. Demo penceresinde “Terminal connected” görünür. `status` son telefon yanıtını gösterir.
- **Yanlış sırada komut:** terminaldeki uygulama hatasını okuyun. Yeni çekim için `reset --yes` ile komut sırasını baştan başlatabilirsiniz. Uygulamadan “Return to empty state” yapmak bekleyen eski komutları otomatik tekrar yüklemez; yeni çekimde terminal `reset` kullanın.
- **Kayıtlar:** sunucunun komutları ve AI önbelleği gitignored `.demo-control.local.json` içinde kalır. Jüri için kod, veri seti, kaynaklar ve bu rehber GitHub'dadır; anahtarlar ve kişisel yerel kayıtlar gönderilmez.

Jüri videosunda canlı telefon/Apple Health senkronizasyonu veya MyFitnessPal API entegrasyonu varmış gibi anlatmayın. Expo Go bu sunumda veri → AI → hedef → ödül → bakım → büyüme döngüsünü çalıştırır.
