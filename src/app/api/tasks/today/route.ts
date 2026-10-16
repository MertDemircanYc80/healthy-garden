// GET /api/tasks/today — today's tasks with live progress (plan §12)
// STATUS: working on MOCK data (see src/lib/today.ts).
import { DEMO_USER_ID, ok } from "@/lib/api";
import { getToday } from "@/lib/today";

export async function GET() {
  return ok(await getToday(DEMO_USER_ID));
}
