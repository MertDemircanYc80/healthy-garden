// Validation + auth for /api/ingest and /api/summaries.
// Payloads are built by hand in iOS Shortcuts, so parsing is forgiving about number formats
// ("5,234", "7.5 hr" is NOT accepted — send plain numbers) but strict about structure.
import "server-only";
import { createHash } from "node:crypto";
import type { DailyMetrics, DeviceEvent, DeviceEventKind } from "@/lib/data/samples";

export class BadRequest extends Error {}

/** "Authorization: Bearer hg_xxx" → sha256 hash used as the storage key. Tokens never go in URLs. */
export function tokenHashFrom(req: Request): string {
  const auth = req.headers.get("authorization") ?? "";
  const m = /^Bearer\s+(hg_[A-Za-z0-9]{20,64})$/.exec(auth.trim());
  if (!m) throw new BadRequest("Missing or invalid sync token. Send header  Authorization: Bearer hg_…  (copy it from the app's Data tab).");
  return createHash("sha256").update(m[1]).digest("hex");
}

const ISO_WITH_OFFSET = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?([+-]\d{2}:?\d{2}|Z)$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const CLOCK = /^\d{1,2}:\d{2}$/;

/** Accept numbers or numeric strings like "5,234" / "5234.0". */
function num(v: unknown, field: string, max: number): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const n = typeof v === "number" ? v : Number(String(v).replace(/,/g, "").trim());
  if (!Number.isFinite(n) || n < 0 || n > max) throw new BadRequest(`"${field}" must be a number between 0 and ${max}.`);
  return n;
}

/** Normalise "2026-10-16T07:05:00-0700" → "...-07:00" so the local day/clock stay readable. */
function isoAt(v: unknown, field: string): string {
  const s = String(v ?? "").trim().replace(" ", "T");
  if (!ISO_WITH_OFFSET.test(s)) throw new BadRequest(`"${field}" must be ISO 8601 with the phone's offset, e.g. 2026-10-16T21:05:00-07:00 (Shortcuts: Format Date → ISO 8601).`);
  return s.replace(/([+-]\d{2})(\d{2})$/, "$1:$2");
}

function clock(v: unknown, field: string): string | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const s = String(v).trim();
  if (CLOCK.test(s)) return s.padStart(5, "0");
  if (ISO_WITH_OFFSET.test(s.replace(" ", "T"))) return isoAt(s, field).slice(11, 16);
  throw new BadRequest(`"${field}" must be "HH:MM" or an ISO date.`);
}

export function parseDailyMetrics(raw: Record<string, unknown>): DailyMetrics {
  const km = num(raw.walkingRunningKm, "walkingRunningKm", 500);
  const mi = num(raw.walkingRunningMi, "walkingRunningMi", 300);
  const sleepHours = num(raw.sleepHours, "sleepHours", 24);
  const m: DailyMetrics = {
    steps: num(raw.steps, "steps", 200_000),
    walkingRunningKm: km ?? (mi !== undefined ? Math.round(mi * 1.609344 * 100) / 100 : undefined),
    activeEnergyKcal: num(raw.activeEnergyKcal, "activeEnergyKcal", 20_000),
    exerciseMinutes: num(raw.exerciseMinutes, "exerciseMinutes", 1440),
    runningMinutes: num(raw.runningMinutes, "runningMinutes", 1440),
    workoutMinutes: num(raw.workoutMinutes, "workoutMinutes", 1440),
    outdoorMinutes: num(raw.outdoorMinutes, "outdoorMinutes", 1440),
    sleepMinutes: num(raw.sleepMinutes, "sleepMinutes", 1440) ?? (sleepHours !== undefined ? Math.round(sleepHours * 60) : undefined),
    bedtime: clock(raw.bedtime, "bedtime"),
    wakeTime: clock(raw.wakeTime, "wakeTime"),
  };
  const nutrition = {
    energyKcal: num(raw.dietaryEnergyKcal ?? raw.caloriesEaten, "dietaryEnergyKcal", 20_000),
    proteinG: num(raw.proteinG, "proteinG", 2000),
    carbsG: num(raw.carbsG, "carbsG", 5000),
    fatG: num(raw.fatG, "fatG", 2000),
    waterMl: num(raw.waterMl, "waterMl", 20_000),
  };
  if (Object.values(nutrition).some((v) => v !== undefined)) m.nutrition = nutrition;
  return Object.fromEntries(Object.entries(m).filter(([, v]) => v !== undefined)) as DailyMetrics;
}

const EVENT_KINDS: DeviceEventKind[] = ["app_open", "app_close", "driving_start", "driving_end"];

export function parseEvent(raw: Record<string, unknown>): DeviceEvent {
  const kind = String(raw.event ?? raw.kind ?? "") as DeviceEventKind;
  if (!EVENT_KINDS.includes(kind)) throw new BadRequest(`"event" must be one of ${EVENT_KINDS.join(", ")}.`);
  const app = raw.app === undefined ? undefined : String(raw.app).trim().slice(0, 60);
  if (kind.startsWith("app_") && !app) throw new BadRequest(`"app" is required for ${kind}.`);
  return { kind, at: isoAt(raw.at, "at"), ...(app ? { app } : {}) };
}

export type IngestPayload =
  | { kind: "daily"; date: string; source: string; metrics: DailyMetrics }
  | { kind: "events"; events: DeviceEvent[] };

/**
 * Accepted bodies (JSON):
 *  { "date": "2026-10-16", "steps": 5234, "sleepMinutes": 412, ... }            daily totals
 *  { "event": "app_open", "app": "Instagram", "at": "2026-10-16T21:05:00-07:00" }  one event
 *  { "events": [ {event, app, at}, ... ] }                                     batch of events
 */
export function parsePayload(body: unknown): IngestPayload {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new BadRequest("Body must be a JSON object.");
  const raw = body as Record<string, unknown>;
  if (Array.isArray(raw.events)) {
    if (raw.events.length > 5000) throw new BadRequest("Send at most 5000 events per request.");
    return { kind: "events", events: raw.events.map((e) => parseEvent(e as Record<string, unknown>)) };
  }
  if (raw.event !== undefined || raw.kind === "event") return { kind: "events", events: [parseEvent(raw)] };

  const date = String(raw.date ?? "").trim().slice(0, 10);
  if (!DAY.test(date)) throw new BadRequest(`"date" must be YYYY-MM-DD (Shortcuts: Format Date → Custom "yyyy-MM-dd").`);
  const metrics = parseDailyMetrics((raw.metrics as Record<string, unknown>) ?? raw);
  if (!Object.keys(metrics).length) throw new BadRequest("No known metrics in the body. See docs/DATA_SOURCES.md for field names.");
  const source = typeof raw.source === "string" ? raw.source.slice(0, 30) : "shortcut";
  return { kind: "daily", date, source, metrics };
}
