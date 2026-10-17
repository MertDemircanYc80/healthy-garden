# Healthy Garden — 2 dakika 45 saniyelik demo çekimi

## Önce AI durumunu doğru anlayalım

Bu dalın varsayılanı **Prepared AI · offline replay**: hedefler ve yorumlar, 30 günlük sabit senaryonun belirli haftaları için önceden hazırlanmış AI çıktılarıdır. Uygulama bu çıktıları yükler; analiz düğmesine her basışta canlı bir modele bağlanmaz.

Canlı **Gemini** bağlantısı ve terminalden hafta yükleme komutları hazırdır. Kurulum ve güncel çekim sırası: **[AI_TERMINAL_TR.md](AI_TERMINAL_TR.md)**. Ücretsiz kotası bulunan model kullanılır; kendi anahtarınızla ilk başarılı canlı istek gereklidir. Claude geçidi de isteğe bağlı korunur.

Canlı istek başarılıysa **Gemini · live response**, önceki canlı sonuç yeniden kullanılıyorsa **Gemini · saved result** görülür. “Prepared AI” yazarken videoda “AI şu anda isteği analiz etti” demeyin; “bu veri için hazırlanmış AI analizini gösteriyoruz” deyin.

## Çekime hazırlık

1. `demo/jury-month` dalının güncel Expo Go sürümünü açın. Eski uygulamanın üzerine kurulum yapmak gerekmez.
2. iPhone'da odak modunu açın, bildirimleri susturun ve ekran kaydını hazırlayın.
3. Bahçe başlığının altındaki demo bağlantısından **Return to empty state → Confirm reset** seçin. Yalnız bu dalın demo kaydı sıfırlanır.
4. Önce bir prova yapın. Sonraki günleri tamamlayıp ödül, alışveriş ve sulama akışını görün; çekimden hemen önce yeniden boşaltın.
5. Kayda başlarken ilk hafta henüz yüklü olmasın.

## Kamera karşısında adımlar

| Süre | Uygulamada yapılacak | Anlatılacak fikir |
| --- | --- | --- |
| 0:00–0:20 | Boş bahçe ve boş Report'u gösterin. | “Healthy Garden, günlük alışkanlık verilerini küçük hedeflere ve büyüyen bir bahçeye dönüştürüyor.” |
| 0:20–0:45 | **30-day demo → Load first 7 days → Done**. Report'ta Sleep ve Feed time kartlarına dokunun. | “Demoda 30 günlük public Fitbit kaydı ve açıkça işaretlenmiş kurgusal telefon, gün ışığı ve beslenme verisi kullanıyoruz. İlk hafta yalnızca gözlem.” |
| 0:45–1:05 | Garden'a dönün. Demo kontrolünden **Analyze the first week → Done**. Coach ve Goals'u gösterin. | “Bu kişinin hareketi zaten yüksek; uykusu kısa. Senaryoda feed süresi de uzun. Plan, hareketi korurken uykuya ve daha az scrolling'e odaklanıyor.” |
| 1:05–1:30 | **Open day 8 → Done** ile rapor/hedefleri gösterin. Ardından **Finish day 8** seçin. | “Günün ara verisiyle ilerleme değişiyor. Gün sonunda son değerler geliyor; tutan hedefler altın kazandırıyor. Bazı hedefler kaçırılabiliyor.” |
| 1:30–1:55 | Günlük ve hedef altınları kazanıldıktan sonra bir parsele dokunun ve **Daisy** alın/ekin (20). Market'ten **Water refill** alın (5). Garden'da **Water** modunu seçip bitkiye dokunun. Sonra **Open day 9**. | “Kazanılan altın bakıma dönüşüyor. Bitkiyi doğrudan bahçede suluyoruz; ertesi gün büyüyor.” |
| 1:55–2:25 | Gün geçişlerini hızlandırarak 14, 21 ve 28. günlere ilerleyin. Coach'u ve 30 günlük grafiği gösterin. | “Yeni haftanın verileriyle plan değişiyor. Düzenli bakım bahçeyi büyütüyor; sonuçlar her gün kusursuz olmak zorunda değil.” |
| 2:25–2:45 | **Finish day 30**. Report'ta 30 günlük görünümü, ardından bahçeyi gösterin. | “Bir ayın verisini, hedeflerini, kazanımlarını ve kaçırılan günlerini tek bir döngüde görebiliyoruz.” |

## Gün atlama ile ilgili önemli pratik ayrıntı

Her yeni gün iki ayrı adımdır:

- **Open day N:** kısmi veri gelir; henüz altın verilmez.
- **Finish day N:** son veri gelir ve hedef ödülleri kaydedilir.

Günün ödülünü aldıktan sonra bitki/su satın alıp sulayabilirsiniz. **Sonraki günü açtığınızda sulanan bitki büyür.** Sadece gün atlamak, sulamadığınız bitkileri büyütmez. Su dolumları envanterden tüketilir; yeterince satın alın. Yeni bitki satın almak ve her gün sulamak gerçek oyun işlemleridir.

23 günlük ilerlemeyi videoda normal hızda tek tek göstermeyin. Tam akışı kaydedip tekrar eden gün geçişlerini kesme/hızlandırmayla 20–30 saniyeye indirin. İlk ödül ve ilk sulamayı normal hızda gösterin; ayın kalanını hızlandırın.

## Jüriye gönderilecek bağlantılar

- [30 günlük CSV](../datasets/jury-month.csv)
- [Yalnız gerçek wearable kayıtları](../datasets/pmdata-p01-month.json)
- [Türkçe kaynak ve veri açıklaması](../datasets/README_TR.md)
- [Hazırlanmış AI analizleri](../mobile/src/data/month-coach.json)

Jüriye “tüm alanlar gerçek ölçüm”, “uygulama şu anda otomatik Screen Time çekiyor” veya “bu kişi uygulamamız sayesinde iyileşti” denmemelidir. Demo; veri → analiz → hedef → ödül → bakım → büyüme mekanizmasını gösteriyor. Beslenme ve otomatik uygulama süresi entegrasyonları, bu kayıtta canlı kaynak olarak gösterilmiyor.
