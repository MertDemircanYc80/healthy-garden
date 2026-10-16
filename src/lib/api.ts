// Small helpers so every API route answers in the same shape.
// Success: { ok: true, data }   Error: { ok: false, error }

export const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";

export function ok<T>(data: T, init?: ResponseInit) {
  return Response.json({ ok: true, data }, init);
}

export function fail(error: string, status = 400) {
  return Response.json({ ok: false, error }, { status });
}

/** Placeholder for endpoints nobody has built yet. Replace when you claim it. */
export function notImplemented(endpoint: string, owner: string) {
  return fail(`${endpoint} not implemented yet (owner: ${owner})`, 501);
}
