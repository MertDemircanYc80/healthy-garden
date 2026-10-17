import { readFileSync, writeFileSync, existsSync, chmodSync } from "node:fs";
import { networkInterfaces } from "node:os";
import { randomBytes } from "node:crypto";
import { parseEnv } from "node:util";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { execFileSync } from "node:child_process";
import { normalizeDemoKey } from "./demo-key.mjs";
const load = (path) =>
  existsSync(path) ? parseEnv(readFileSync(path, "utf8")) : {};
async function main() {
  const coach = load(".env.coach.local");
  let key = coach.GEMINI_API_KEY || "";
  if (!process.argv.includes("--no-key")) {
    if (!process.stdin.isTTY)
      throw new Error(
        "Kurulumu normal Terminal'de çalıştırın; anahtarı komut satırına yazmayın.",
      );
    const clipboard = process.argv.includes("--clipboard");
    if (clipboard && process.platform !== "darwin")
      throw new Error(
        "Pano seçeneği Mac içindir. Bu bilgisayarda --clipboard olmadan çalıştırın.",
      );
    console.log(
      clipboard
        ? "Şimdi AI Studio’da API anahtarının kopyalama düğmesine tıklayın. Anahtarın adı veya kısaltılmış görünümü değil, tam anahtar kopyalanmalı.\nTerminale anahtar yapıştırmanız gerekmiyor; pano yalnız Enter’a bastığınızda okunur."
        : "API anahtarı: https://aistudio.google.com/apikey (ücretsiz proje).\nGiriş gizlidir: yazı veya yıldız görünmez. ⌘V ile yapıştırıp Enter’a basın; Ctrl+C iptal eder.",
    );
    process.stdout.write(
      clipboard
        ? "Anahtarı kopyaladıktan sonra bu terminale dönüp yalnız Enter’a basın: "
        : key
          ? "Yeni Gemini anahtarı (mevcut anahtarı tutmak için Enter): "
          : "Gemini API anahtarını yapıştırıp Enter'a bas: ",
    );
    const muted = new Writable({
      write(_chunk, _encoding, callback) {
        callback();
      },
    });
    const rl = createInterface({
      input: process.stdin,
      output: muted,
      terminal: true,
    });
    try {
      const entered = (await rl.question("")).trim();
      if (clipboard) {
        let copied;
        try {
          copied = execFileSync("/usr/bin/pbpaste", {
            encoding: "utf8",
            maxBuffer: 8192,
            timeout: 3000,
            stdio: ["ignore", "pipe", "ignore"],
          });
        } catch {
          throw new Error(
            "Mac panosu okunamadı. --clipboard olmadan tekrar çalıştırıp anahtarı yapıştırabilirsiniz.",
          );
        }
        key = normalizeDemoKey(copied);
      } else if (entered) key = normalizeDemoKey(entered);
    } finally {
      rl.close();
      process.stdout.write("\n");
    }
    if (!key)
      throw new Error(
        "Anahtar girilmedi. Prova kurulumu için npm run demo:setup -- --no-key kullanın.",
      );
  }
  if (key) key = normalizeDemoKey(key);
  const addresses = Object.entries(networkInterfaces())
    .sort(([a], [b]) =>
      a === "en0" ? -1 : b === "en0" ? 1 : a.localeCompare(b),
    )
    .flatMap(([, values]) => values ?? [])
    .filter(
      (a) =>
        a.family === "IPv4" &&
        !a.internal &&
        /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(a.address),
    );
  const hostArg = process.argv.find((a) => a.startsWith("--host="))?.slice(7);
  const host = hostArg || addresses[0]?.address;
  if (!host || !/^[a-zA-Z0-9.-]+$/.test(host))
    throw new Error(
      "Yerel IP bulunamadı. --host=192.168.x.x ile Mac'in Wi-Fi IP'sini belirtin.",
    );
  const token = coach.DEMO_COACH_TOKEN || randomBytes(24).toString("hex");
  const port = coach.DEMO_COACH_PORT || "8877";
  function update(path, values) {
    let content = existsSync(path) ? readFileSync(path, "utf8") : "";
    for (const [name, value] of Object.entries(values)) {
      const line = `${name}=${JSON.stringify(value)}`;
      const matcher = new RegExp(`^${name}=.*$`, "m");
      content = matcher.test(content)
        ? content.replace(matcher, () => line)
        : `${content.trimEnd()}\n${line}\n`;
    }
    writeFileSync(path, content.trimStart(), { mode: 0o600 });
    chmodSync(path, 0o600);
  }
  update(".env.coach.local", {
    COACH_PROVIDER: "gemini",
    GEMINI_API_KEY: key,
    ANALYZE_MODEL: "gemini-3.8-flash",
    DEMO_COACH_TOKEN: token,
    DEMO_COACH_HOST: "0.0.0.0",
    DEMO_COACH_PORT: port,
  });
  update(".env.local", {
    EXPO_PUBLIC_COACH_URL: `http://${host}:${port}/analyze`,
    EXPO_PUBLIC_COACH_TOKEN: token,
    EXPO_PUBLIC_DEMO_CONTROL: "1",
  });
  console.log(
    `Yerel ayarlar hazır. Anahtar GitHub'a veya Expo paketine eklenmez. Telefon ve Mac aynı Wi-Fi'da olmalı.\n1. npm run coach\n2. Başka terminalde: npm start -- --clear\n3. Expo Go'da uygulamayı aç; üçüncü terminalde: npm run demo -- week 1\n${key ? "Gemini anahtarı kaydedildi; ilk week 1 komutu canlı bağlantıyı test edecek." : "Prova modu: week 1 --prepared kullanın. Canlı AI için kurulumu anahtarla tekrar çalıştırın."}`,
  );
}
main().catch((error) => {
  if (error.code === "ABORT_ERR" || error.name === "AbortError") {
    console.log(
      "Kurulum iptal edildi. Ayar dosyaları değiştirilmedi. Tekrar başlatmak için: npm run demo:setup",
    );
    process.exitCode = 130;
  } else {
    console.error(`Kurulum tamamlanamadı: ${error.message}`);
    process.exitCode = 1;
  }
});
