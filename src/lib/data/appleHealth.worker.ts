// Web Worker: reads an Apple Health export (.zip from the iPhone, or the unzipped export.xml)
// without freezing the UI, and returns DailySummary[] for the last N days.
// Data never leaves the browser.
import { Unzip, UnzipInflate } from "fflate";
import { buildSummaries } from "./aggregate";
import { AppleHealthParser } from "./appleHealth";

export type WorkerRequest = { file: File; sinceDay: string };
export type WorkerMessage =
  | { type: "progress"; read: number; total: number }
  | { type: "done"; summaries: ReturnType<typeof buildSummaries>; stats: AppleHealthParser["stats"] }
  | { type: "error"; message: string };

const post = (m: WorkerMessage) => (self as unknown as Worker).postMessage(m);

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const { file, sinceDay } = e.data;
  const parser = new AppleHealthParser(sinceDay);
  const decoder = new TextDecoder();
  let foundXml = false;

  try {
    const isZip = file.name.toLowerCase().endsWith(".zip");
    let unzip: Unzip | null = null;
    let xmlDone: Promise<void> = Promise.resolve();

    if (isZip) {
      unzip = new Unzip();
      unzip.register(UnzipInflate);
      xmlDone = new Promise((resolve, reject) => {
        unzip!.onfile = (entry) => {
          // apple_health_export/export.xml — skip export_cda.xml and workout routes
          if (!/(^|\/)export\.xml$/.test(entry.name)) return;
          foundXml = true;
          entry.ondata = (err, chunk, final) => {
            if (err) return reject(err);
            parser.feed(decoder.decode(chunk, { stream: !final }));
            if (final) resolve();
          };
          entry.start();
        };
      });
    }

    const reader = file.stream().getReader();
    let read = 0;
    let lastPost = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (value) {
        read += value.length;
        if (unzip) unzip.push(value, false);
        else parser.feed(decoder.decode(value, { stream: true }));
        if (read - lastPost > 4_000_000) {
          post({ type: "progress", read, total: file.size });
          lastPost = read;
        }
      }
      if (done) {
        if (unzip) unzip.push(new Uint8Array(0), true);
        break;
      }
    }

    if (isZip) {
      if (!foundXml) throw new Error("No export.xml found in this zip. Use Health → profile → Export All Health Data.");
      await xmlDone;
    } else {
      parser.feed(decoder.decode());
    }

    const samples = parser.finish();
    post({ type: "done", summaries: buildSummaries({ samples }, "apple_health"), stats: parser.stats });
  } catch (err) {
    post({ type: "error", message: err instanceof Error ? err.message : String(err) });
  }
};
