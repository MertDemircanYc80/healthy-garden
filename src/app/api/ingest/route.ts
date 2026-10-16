// POST /api/ingest — iOS Shortcuts / extension / native app send health totals and device events.
// DELETE /api/ingest — the user deletes everything stored for their sync token (plan §19).
// Auth: "Authorization: Bearer <sync token from the app's Data tab>". Docs: docs/DATA_SOURCES.md
import { fail, ok } from "@/lib/api";
import { BadRequest, parsePayload, tokenHashFrom } from "@/lib/server/ingest";
import { getStore } from "@/lib/server/store";

const MAX_BODY_BYTES = 1_000_000;

export async function POST(req: Request) {
  const store = getStore();
  if (!store) return fail("Sync storage is not configured yet (Supabase env vars missing).", 503);
  try {
    const tokenHash = tokenHashFrom(req);
    const text = await req.text();
    if (text.length > MAX_BODY_BYTES) return fail("Body too large (max 1 MB).", 413);
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      throw new BadRequest("Body must be JSON. In Shortcuts use Get Contents of URL → Method POST → Request Body: JSON.");
    }
    const payload = parsePayload(body);
    if (payload.kind === "daily") {
      await store.saveDaily(tokenHash, payload.date, payload.source, payload.metrics);
      return ok({ saved: "daily", date: payload.date, fields: Object.keys(payload.metrics) });
    }
    await store.saveEvents(tokenHash, payload.events);
    return ok({ saved: "events", count: payload.events.length });
  } catch (e) {
    if (e instanceof BadRequest) return fail(e.message, 400);
    console.error("ingest failed", e);
    return fail("Could not save the data. Try again in a moment.", 500);
  }
}

export async function DELETE(req: Request) {
  const store = getStore();
  if (!store) return fail("Sync storage is not configured yet.", 503);
  try {
    await store.deleteAll(tokenHashFrom(req));
    return ok({ deleted: true });
  } catch (e) {
    if (e instanceof BadRequest) return fail(e.message, 400);
    console.error("delete failed", e);
    return fail("Could not delete the data.", 500);
  }
}
