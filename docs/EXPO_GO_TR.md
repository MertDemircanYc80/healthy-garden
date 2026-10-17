# Healthy Garden’ı telefonda çalıştırın — Mac ve Windows

Jüri ve ekip arkadaşları için sıfırdan kurulum. Repo herkese açıktır. Bu rehber `demo/jury-month` dalını ayrı klasöre indirir; mevcut projenizi veya `main` dalını değiştirmez.

**Gerekenler:** bilgisayar, iPhone/Android telefon, internet ve aynı Wi-Fi. Başlangıç demosu için hesap, API anahtarı, Xcode, Android Studio veya Supabase gerekmez. Her kurulumun bahçesi ve cüzdanı kendisine aittir.

## A — Mac

1. [Node.js](https://nodejs.org/en/download) üzerinden **Node 24 LTS** macOS yükleyicisini kurun.
2. Terminal’i açıp `git --version` çalıştırın. Git yoksa `xcode-select --install` ile Apple komut satırı araçlarını kurup Terminal’i yeniden açın.
3. Şu komutları sırayla çalıştırın:

```bash
cd ~/Documents
git clone --branch demo/jury-month --single-branch https://github.com/MertDemircanYc80/healthy-garden.git healthy-garden-jury
cd healthy-garden-jury/mobile
node --version
npm ci
npm start -- --clear
```

`node --version` 24.x göstermeli. Expo SDK 57’nin minimumu 22.13’tür. Ekranda **Using Expo Go** ve bir QR görünmeli. Terminal açık kalmalı.

## B — Windows

1. [Node.js](https://nodejs.org/en/download) üzerinden **Node 24 LTS** Windows `.msi` yükleyicisini kurun.
2. [Git for Windows](https://git-scm.com/downloads/win) yükleyicisini kurun; varsayılan seçenekleri kullanabilirsiniz.
3. Yeni bir **PowerShell** açın. Kurulumdan önce açık olan pencereyi kullanmayın; yeni PATH yeni pencerede görünür.
4. Şu komutları sırayla çalıştırın:

```powershell
Set-Location ([Environment]::GetFolderPath('MyDocuments'))
git clone --branch demo/jury-month --single-branch https://github.com/MertDemircanYc80/healthy-garden.git healthy-garden-jury
Set-Location healthy-garden-jury\mobile
node --version
npm.cmd ci
npm.cmd start -- --clear
```

Windows’ta `npm.cmd` kullanılması, PowerShell’in `npm.ps1` çalıştırma ilkesi sorununu önler; güvenlik ilkesini değiştirmeniz gerekmez. Güvenlik duvarı sorarsa Node.js için **özel ağ** erişimine izin verin. Ekranda **Using Expo Go** ve QR görünmeli; terminal açık kalmalı.

## C — Telefon

1. App Store / Google Play üzerinden **Expo Go** kurun. Bu proje Expo SDK **57**’ye sabitlenmiştir; bağımlılıkları daha yeni SDK’ya yükseltmeyin.
2. Telefonu bilgisayarla aynı Wi-Fi’a bağlayın. VPN kapalı olsun.
3. iPhone’da **Kamera** ile terminaldeki QR’ı okutun ve Expo Go’da açın. Android’de Expo Go’nun QR tarayıcısını kullanın.
4. İlk paket yüklemesini bekleyin. Her bilgisayar kendi QR’ını üretir: başkasının `192.168…` adresi sizin ağınızda çalışmaz.

## D — Uygulamada 3 dakikalık deneme

1. Garden ekranındaki **30-day demo** bağlantısını açın.
2. Gün gün başlamak için **Start with day 1**, ardından **Finish day 1** seçin: **10 gold** kazanırsınız. İlk hafta henüz kişisel hedef yoktur.
3. Hızlı denemede boş başlangıçtan **Load first 7 days** seçebilirsiniz: 7 günlük rapor ve **70 gold** gelir. Mevcut demoyu temizlemek için önce **Return to empty state → Confirm reset** kullanın; bu işlem yalnız kendi demo kaydınızı siler.
4. **Analyze the first week** seçin. Anahtarsız kurulumda **Prepared AI · offline replay** görünür: bu senaryo için önceden hazırlanmış analizdir, yeni bir canlı model isteği değildir.
5. Goals ve Coach ekranlarını, Report’taki Sleep / Feed time / Instagram ayrıntılarını açın.
6. **Open day 8**, ardından **Finish day 8** seçin. Her tamamlanan veri günü **10 gold**, tutan hedefler normal plan ödülünün **2 katını** kazandırır. Aynı gün iki kez ödeme yapmaz.
7. Boş parsele dokunup Daisy alın/ekin. Market’ten **Water refill** alın. Garden’da **Water** moduna geçip bitkiye dokunun.
8. **Open day 9**: suladığınız bitki büyür. İlerlemeye devam edip 30 günlük raporu inceleyin.

İlk 7 günün toplu gold’u günlük ödüllerin toplamıdır; ayrı bir başlangıç hediyesi değildir. Önceden kaydı olanlarda eksik günlük ödüller bir kez eklenir, bitki ve alışverişler korunur. Yeni hedef katsayısı sonraki tamamlamalarda uygulanır; geçmiş hedef ödülleri geriye dönük ikiye katlanmaz.

## E — İsteğe bağlı canlı AI ve terminalden haftalar

Canlı analiz isteyen kişi **kendi Gemini API anahtarını** kullanır. Repo sahibinin anahtarı paylaşılmaz. Anahtar bilgisayarda kalır; telefona veya GitHub’a eklenmez.

Mac’te `npm run demo:setup`, Windows’ta `npm.cmd run demo:setup` çalıştırın. Gizli anahtar girişine yapıştırıp Enter’a basın; yazı görünmez. Mac’te `-- --clipboard` seçeneği de vardır. `AQ.` biçimindeki anahtarlar desteklenir.

Sonra üç terminal kullanın; her birinde kendi `healthy-garden-jury/mobile` klasörünüzde olun:

| Terminal | Mac | Windows PowerShell |
| --- | --- | --- |
| AI + kontrol sunucusu | `npm run coach` | `npm.cmd run coach` |
| Expo (önce eskisini Ctrl+C ile kapatın) | `npm start -- --clear` | `npm.cmd start -- --clear` |
| İlk hafta | `npm run demo -- week 1` | `npm.cmd run demo -- week 1` |
| Sonraki haftalar | `npm run demo -- week 2` … `week 5` | `npm.cmd run demo -- week 2` … `week 5` |

`week 5` yalnız son iki günü tamamlayıp 30 güne ulaşır. `next` ara gün verisini, `finish` gün sonu ve ödülleri getirir. Yeni haftanın analizi için `week N` kullanılır. Anahtarsız terminal provasında önce `demo:setup -- --no-key`, sonra `week N --prepared` kullanın.

**Tam kurulum, ücretsiz kota bilgisi ve video sırası:** [AI_TERMINAL_TR.md](AI_TERMINAL_TR.md). Gemini modeli hesap kotasına bağlıdır; canlı çağrı başarısız olursa uygulama kendiliğinden hazırlanmış analize geçmez. Expo Go’da HealthKit ve otomatik iOS Screen Time canlı entegrasyonu bu demoya dahil değildir.

## Sorun giderme

- **“No usable data found”:** sunucu **Using Expo Go** göstermeli. `npm start` zaten `--go` kullanır; `exp+healthy-garden://` development build QR’ını taramayın. Kapalı sunucunun eski QR’ı çalışmaz.
- **Telefon bağlanmıyor:** aynı Wi-Fi, VPN ve özel ağ güvenlik duvarını kontrol edin. Node’un ağ erişimini engellemeyin. Okul/otel Wi-Fi’ı cihazlar arası erişimi engelleyebilir.
- **Wi-Fi erişimi engelliyse:** Expo’yu Ctrl+C ile durdurun. `npm install --global @expo/ngrok` (Windows: `npm.cmd install --global @expo/ngrok`) ardından `npm start -- --tunnel --clear` çalıştırın. Windows’ta yine `npm.cmd` kullanın. Tunnel adresi geçicidir ve bilgisayar/sunucu açık kalmalıdır. **Bu tünel yalnız Expo içindir; yerel AI sunucusunun 8877 portunu yayınlamaz.** Tunnel ile en kolay yol anahtarsız uygulama içi prepared demo’dur.
- **Port dolu:** başka Expo’yu Ctrl+C ile kapatın veya önerilen boş portu seçin; yalnız yeni QR’ı okutun.
- **Klasör zaten var:** aynı hedefe tekrar clone etmeyin. Yeni klasör adı seçin. Mevcut değişiklikleri silen `reset --hard` / `clean` komutlarına gerek yoktur.
- **Güncelleme:** önce `git status`, temizse `git pull --ff-only`, sonra `npm ci` ve Expo’yu `--clear` ile yeniden başlatın. Yerel değişiklik varsa commit alın veya ayrı klasöre yeniden clone edin.
- **“Henüz telefondan onay gelmedi”:** AI sunucusu ve Expo açık olmalı. Setup’tan sonra Expo yeniden başlamalı. `demo -- status` son uygulama onayını gösterir.

## Veri ve kayıt

30 günlük demo: [CSV](../datasets/jury-month.csv), [kaynaklar](../datasets/README_TR.md). Wearable kayıtları PMData’dan; telefon süresi, gün ışığı ve beslenme alanları kurgusal eklerdir. HealthKit gerçek cihaz entegrasyonu için ayrı native build gerekir. Varsayılan Expo Go demosu bunu gerektirmez.

Bu GitHub dalı kalıcı bir indirme yoludur; tek bir QR, bilgisayardan bağımsız kalıcı uygulama bağlantısı değildir.

Resmî başvuru: [Expo ortam kurulumu](https://docs.expo.dev/get-started/set-up-your-environment/), [SDK 57 gereksinimleri](https://docs.expo.dev/versions/v57.0.0/), [Expo CLI / tunnel](https://docs.expo.dev/more/expo-cli/#tunneling).
