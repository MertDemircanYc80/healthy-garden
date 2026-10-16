// GET /api/summaries?from=YYYY-MM-DD&to=YYYY-MM-DD — the app pulls synced data as DailySummary[].
// Auth: "Authorization: Bearer <sync token>".
import type { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api";
import { buildSummaries } from "@/lib/data/aggregate";
import { BadRequest, tokenHashFrom } from "@/lib/server/ingest";
import { getStore } from "@/lib/server/store";

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: NextRequest) {
  const store = getStore();
  if (!store) return fail("Sync storage is not configured yet (Supabase env vars missing).", 503);
  const from = req.nextUrl.searchParams.get("from") ?? "";
  const to = req.nextUrl.searchParams.get("to") ?? "";
  if (!DAY.test(from) || !DAY.test(to) || from > to) return fail('Use ?from=YYYY-MM-DD&to=YYYY-MM-DD', 400);
  try {
    const data = await store.load(tokenHashFrom(req), from, to);
    const summaries = buildSummaries({ daily: data.daily, events: data.events }, "shortcut").filter(
      (s) => s.date >= from && s.date <= to,
    );
    return ok({ storage: store.kind, summaries });
  } catch (e) {
    if (e instanceof BadRequest) return fail(e.message, 400);
    console.error("summaries failed", e);
    return fail("Could not load synced data.", 500);
  }
}
