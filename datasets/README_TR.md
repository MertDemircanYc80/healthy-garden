# Jüri için 30 günlük veri seti

**Uygulamada kullanılan set:** [jury-month.csv](jury-month.csv) · **yalnız gerçek ölçümler:** [pmdata-p01-month.json](pmdata-p01-month.json).

Bu dosyalar `demo/jury-month` dalındadır. Eski uygulama `main` üzerinde durur.

## Gerçek verinin kaynağı

[PMData, Simula Research Laboratory](https://datasets.simula.no/pmdata/) araştırması, Fitbit ve diğer kayıt araçlarıyla 16 kişinin beş aylık verisini topladı. Bu demoda anonim **p01** katılımcısının **2 Kasım–1 Aralık 2019** arasındaki 30 ardışık günü kullanılıyor. Tarihler ve ölçülen değerler korunmuştur.

Kaynak: Thambawita ve arkadaşları (2020), *PMData: A Sports Logging Dataset*, [yayın](https://doi.org/10.1145/3339825.3394926). Veri lisansı: [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/). Kaynak ve lisans, eğitim/hackathon amaçlı bu alt küme paylaşılırken korunmalıdır.

## Hangi sütun neyi gösteriyor?

| CSV sütunu | Birim | Kaynak / anlam |
| --- | --- | --- |
| `date` | Tarih | PMData'nın gerçek kayıt tarihi |
| `steps` | Adım | Gerçek Fitbit kayıtlarından günlük toplam |
| `sleep_minutes` | Dakika | Gerçek kayıttaki en uzun uyku oturumu; uyandığı güne atanır |
| `active_minutes` | Dakika | Gerçek Fitbit orta + yüksek aktivite süresi |
| `sedentary_minutes` | Dakika | Gerçek Fitbit hareketsizlik sınıflaması; doğrudan oturma ölçümü değildir |
| `daylight_minutes` | Dakika | **Kurgusal demo senaryosu** |
| `feed_minutes` | Dakika | **Kurgusal demo senaryosu**; seçili feed uygulamalarının toplamı |
| `screen_minutes` | Dakika | **Kurgusal demo senaryosu**; toplam telefon süresi |
| `energy_kcal` | kcal alınan | **Kurgusal demo senaryosu**; yakılan kalori değildir |

Instagram/TikTok/YouTube dağılımı da kurgusaldır; uygulamanın okuduğu [month-health.json](../mobile/src/data/month-health.json) dosyasında bulunur. Bu değerler PMData katılımcısına ait ölçümler olarak sunulmamalıdır.

## Videoda gösterebileceğiniz ilk hafta

| Günlük ortalama | İlk 7 gün |
| --- | --- |
| Adım — gerçek | 12.053 |
| Uyku — gerçek | Yaklaşık 5 saat 51 dakika |
| Orta/yüksek aktivite — gerçek | Yaklaşık 68 dakika |
| Feed uygulamaları — kurgusal | Yaklaşık 3 saat 16 dakika |
| Gün ışığı — kurgusal | Yaklaşık 13 dakika |

Bu kişi zaten hareketli. Bu kayıt üzerinden “az yürüyorsun” sonucuna varmak doğru olmaz. Demonun ilk mesajı, hareketi koruyup kısa uykuya ve senaryodaki uzun feed süresine odaklanmaktır.

Son 7 günde gerçek uyku ortalaması yine yaklaşık 5 saat 51 dakikadır; her şeyin düzeldiğini iddia etmeyin. Kurgusal feed süresi yaklaşık 1 saat 41 dakikaya iner, gün ışığı yaklaşık 44 dakikaya çıkar. Bu senaryo değişimleri, uygulamanın bir kişide iyileşme sağladığının kanıtı değildir.

## Uygulama veriyi nasıl kullanıyor?

1. İlk açılış boş. **Load first 7 days** yalnız ilk yedi günü görünür yapar.
2. **Analyze the first week**, o haftanın hazırlanmış analizini yükler. Varsayılan akışta canlı model çağrısı yapılmaz.
3. **Open day 8**, günlük toplamların %55'inden oluşturulan kurgusal bir 14:00 ara görünümü açar. Gerçekte saat 14:00'te ölçülmüş veri olduğu iddia edilmez; gece bitmiş olduğu için uyku ölçeklenmez.
4. **Finish day 8**, kayıttaki son günlük değerleri ekler; hedefler değerlendirilir ve tutan hedefler bir kez ödüllendirilir.
5. Aynı süreç 30. güne kadar devam eder; 14, 21, 28 ve 30. günlerde analiz güncellenir. Bir güne ait ödül, o günün başında geçerli hedeflerle hesaplanır.

Analiz dosyası: [month-coach.json](../mobile/src/data/month-coach.json). Bunlar Codex tarafından bu sabit set için önceden hazırlanmış AI çıktılarıdır; uygulama içinde anlık model üretimi değildir. Canlı model bağlantısı ayrıca yapılandırılabilir.

## Kaynağı doğrulama

Gerçek alt kümedeki `rawFileSha256`, kaynak dosyaların parmak izlerini içerir. Ana repo klasöründen:

```bash
python3 scripts/import-pmdata.py
```

Bu komut, kaynaktaki altı dosyayı aralık istekleriyle doğrular; 1,4 GB arşivin tamamını indirmez. Günlük dönüştürmenin ve parmak izlerinin, commit edilen alt kümeyle aynı olduğunu kontrol eder.

**Çekim rehberi:** [docs/DEMO_TR.md](../docs/DEMO_TR.md).
