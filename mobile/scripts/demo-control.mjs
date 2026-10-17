const args = process.argv.slice(2);
const [type, rawWeek] = args;
const help = `Kullanım (mobile klasöründe):
  npm run demo -- status
  npm run demo -- week 1    # 1–7. gün + AI hedefleri
  npm run demo -- next      # bir sonraki gün, 14:00
  npm run demo -- finish    # gün sonu + hedef ödülleri
  npm run demo -- week 2    # 14. güne kadar + yeni AI planı
  npm run demo -- week 3    # 21. güne kadar
  npm run demo -- week 4    # 28. güne kadar
  npm run demo -- week 5    # 30. güne kadar, kapanış analizi
  npm run demo -- reset --yes  # bu dalın demo/garden kaydını boşaltır
Prova: week N --prepared (canlı AI çağırmaz). --no-wait: telefondaki onayı beklemeden çıkar.`;
if (!["status", "week", "next", "finish", "reset"].includes(type)) {
  console.log(help);
  process.exitCode = type ? 1 : 0;
} else {
  try {
    const token = process.env.DEMO_COACH_TOKEN;
    if (!token) throw new Error("Önce npm run demo:setup çalıştırın.");
    if (type === "reset" && !args.includes("--yes"))
      throw new Error(
        "Bu dalın bahçesi ve demo ödülleri silinecek. İstiyorsanız: npm run demo -- reset --yes",
      );
    if (type === "week" && !/^[1-5]$/.test(rawWeek ?? ""))
      throw new Error("week 1, 2, 3, 4 veya 5 seçin.");
    const base = `http://127.0.0.1:${process.env.DEMO_COACH_PORT || "8877"}`;
    async function request(path, data) {
      const response = await fetch(`${base}${path}`, {
        method: data ? "POST" : "GET",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: data ? JSON.stringify(data) : undefined,
        signal: AbortSignal.timeout(65000),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || `İstek başarısız: ${response.status}`);
      return result;
    }
    if (type === "status") {
      const s = await request("/status");
      console.log(
        `${s.provider} · ${s.model} · anahtar ${s.keyConfigured ? "kayıtlı (canlı çağrı sonucu ayrıca kontrol edilir)" : "eksik"}\n${s.commands} komut sırada/kayıtlı.`,
      );
      if (s.ack)
        console.log(
          `Son telefon yanıtı: ${s.ack.ok ? "başarılı" : "hata"} · gün ${s.ack.day} · ${s.ack.gold} gold · ${s.ack.message}`,
        );
    } else {
      console.log(
        type === "week"
          ? `Hafta ${rawWeek} hazırlanıyor${args.includes("--prepared") ? " (hazırlanmış prova analizi)" : " (Gemini/AI analizi; biraz sürebilir)"}…`
          : "Komut gönderiliyor…",
      );
      const c = await request("/demo/command", {
        type,
        week: type === "week" ? Number(rawWeek) : undefined,
        prepared: args.includes("--prepared"),
      });
      if (c.plan)
        console.log(
          c.plan.source === "live_ai"
            ? `${c.plan.model}: ${c.plan.cached ? "önceki canlı AI sonucu yeniden kullanıldı" : "canlı AI yanıtı alındı"}.`
            : "Prepared AI: prova analizi; canlı modele bağlanılmadı.",
        );
      console.log("Telefona gönderildi. Expo Go'da uygulama açık kalsın.");
      if (!args.includes("--no-wait")) {
        const started = Date.now();
        let ack;
        while (Date.now() - started < 20000) {
          const status = await request("/status");
          if (status.ack?.id === c.id) {
            ack = status.ack;
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        if (ack?.ok)
          console.log(
            `Uygulandı ✓ Gün ${ack.day} · ${ack.gold} gold. ${ack.message}`,
          );
        else if (ack) throw new Error(`Uygulama: ${ack.message}`);
        else
          console.log(
            "Henüz telefondan onay gelmedi. Komut kayıtlı; uygulamayı açınca uygulanır. Aynı Wi-Fi, coach sunucusu ve Expo'nun yeniden başlatıldığını kontrol edin.",
          );
      }
    }
  } catch (error) {
    console.error(
      error.cause?.code === "ECONNREFUSED"
        ? "Coach sunucusu kapalı. Başka terminalde npm run coach çalıştırın."
        : error.message,
    );
    process.exitCode = 1;
  }
}
