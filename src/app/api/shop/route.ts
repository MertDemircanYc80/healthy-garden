// GET /api/shop — items for sale (plan §12)
// STATUS: working from src/lib/economy.ts.
import { ok } from "@/lib/api";
import { SHOP_ITEMS } from "@/lib/economy";

export async function GET() {
  return ok(SHOP_ITEMS);
}
