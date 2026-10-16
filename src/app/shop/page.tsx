// Shop screen (plan §13.4). STATUS: lists items; buying not wired yet (POST /api/shop/buy is a stub).
import { SHOP_ITEMS } from "@/lib/economy";

export default function ShopPage() {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Shop</h1>
      <ul className="grid grid-cols-2 gap-3">
        {SHOP_ITEMS.map((item) => (
          <li key={item.id} className="rounded-2xl bg-card p-4 text-center shadow-sm">
            <div className="text-4xl" aria-hidden>
              {item.emoji}
            </div>
            <p className="mt-2 font-medium">{item.name}</p>
            <p className="text-xs text-muted">
              {item.growthDays ? `Grows in ${item.growthDays} days` : item.type}
            </p>
            <button
              disabled
              className="mt-3 w-full rounded-full bg-leaf px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {item.price} 🪙
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
