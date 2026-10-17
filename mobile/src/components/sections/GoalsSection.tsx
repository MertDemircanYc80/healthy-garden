// Island → Goals: weekly goals the coach set from this user's own data.
import { Text, View } from "react-native";
import { CoinIcon } from "@/components/Icons";
import { Bar, Card, SectionTitle, styles as u } from "@/components/ui";
import { useApp } from "@/state/AppState";
import { C, T } from "@/theme";
import { goalProgress, goalValue, onTrack } from "@/lib/format";

export function GoalsSection() {
  const { goals } = useApp();
  return (
    <View>
      <SectionTitle title="Your goals this week" hint="Set by your coach from your own data. They adjust every Monday." />
      {goals.map((g) => {
        const ok = onTrack(g);
        return (
          <Card key={g.id}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <Text style={[u.h, { flex: 1 }]}>{g.title}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <CoinIcon size={14} />
                <Text style={{ color: C.sun, fontWeight: "700", fontSize: T.small }}>+{g.reward}</Text>
              </View>
            </View>
            <View style={{ marginTop: 12 }}>
              <Bar value={goalProgress(g)} color={ok ? C.moss : C.sun} />
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
              <Text style={u.muted}>
                Today {goalValue(g, g.current)}, {g.direction === "at_least" ? "goal" : "limit"} {goalValue(g, g.target)}
              </Text>
              <View style={{ flexDirection: "row", gap: 3, alignItems: "center" }} accessibilityLabel={`${g.daysHit} of ${g.daysTotal} days this week`}>
                {Array.from({ length: g.daysTotal }, (_, i) => (
                  <View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: i < g.daysHit ? C.moss : C.pineLine }} />
                ))}
              </View>
            </View>
            <Text style={[u.body, { color: C.fern, marginTop: 10, fontSize: T.small, lineHeight: 19 }]}>{g.reason}</Text>
          </Card>
        );
      })}
    </View>
  );
}
