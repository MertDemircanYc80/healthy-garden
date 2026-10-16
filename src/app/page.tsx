// Home / Garden screen (plan §13.2).
import { Placeholder } from "@/components/Placeholder";
import { GARDEN_GRID } from "@/lib/economy";

export default function HomePage() {
  const cells = Array.from({ length: GARDEN_GRID.cols * GARDEN_GRID.rows });
  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">🌱 Healthy Garden</h1>
        <span className="rounded-full bg-card px-3 py-1 text-sm font-semibold shadow-sm">0 🪙</span>
      </header>

      <div
        className="grid gap-2 rounded-3xl bg-soil/20 p-3"
        style={{ gridTemplateColumns: `repeat(${GARDEN_GRID.cols}, minmax(0, 1fr))` }}
      >
        {cells.map((_, i) => (
          <div key={i} className="aspect-square rounded-xl bg-soil/30" />
        ))}
      </div>

      <Placeholder
        title="Garden"
        owner="frontend"
        todo={[
          "Render plants from GET /api/garden (emoji or SVG, scaled by stage)",
          "Coin balance from GET /api/wallet",
          "Garden health meter (7-day) + today's sunlight",
          "Tap seed → tap cell to plant; tap plant to water/fertilize",
          "Dormant plants greyed out (never dead)",
        ]}
      />
    </div>
  );
}
