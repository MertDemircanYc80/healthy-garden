// Clipboard/prompt input is a secret: never include it in errors or console output.
export function normalizeDemoKey(raw) {
  let key = String(raw)
    .replace(/\x1b\[(?:200|201)~/g, "")
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, "")
    .trim();
  key = key
    .replace(/^(?:export\s+)?(?:GEMINI_API_KEY|GOOGLE_API_KEY)\s*=\s*/, "")
    .trim();
  const quotes = { '"': '"', "'": "'", "`": "`", "“": "”", "‘": "’" };
  if (quotes[key[0]] && key.at(-1) === quotes[key[0]])
    key = key.slice(1, -1).trim();
  if (!key)
    throw new Error(
      "Anahtar boş. AI Studio'da tam API anahtarının kopyalama düğmesini kullanın.",
    );
  if (/[.*•…]/.test(key))
    throw new Error(
      "Kısaltılmış veya gizlenmiş anahtar kopyalanmış olabilir. AI Studio'da anahtarın kopyalama düğmesini kullanın; görünen kısaltmayı seçip kopyalamayın.",
    );
  if (!/^[A-Za-z0-9_-]+$/.test(key) || key.length > 256)
    throw new Error(
      "Panodaki/girilen metin API anahtarı biçiminde değil. AI Studio'dan anahtarın kendisini kopyalayın; adını, bağlantısını veya terminal komutunu değil.",
    );
  return key;
}
