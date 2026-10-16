// Real Impact screen (plan §13.7, §14).
import { Placeholder } from "@/components/Placeholder";

export default function ImpactPage() {
  return (
    <Placeholder
      title="Real impact"
      owner="pitch/design + backend"
      todo={[
        "Milestone progress toward a real tree (every 500 coins earned)",
        "Mocked tree-planting flow via POST /api/impact/redeem",
        "Certificate card with location + date, clearly labelled 'prototype'",
        "Stretch: nearest community garden from OpenStreetMap",
      ]}
    />
  );
}
