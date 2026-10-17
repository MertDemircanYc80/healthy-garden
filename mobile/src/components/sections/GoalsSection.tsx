import { Text, View } from "react-native";
import { CoinIcon } from "@/components/Icons";
import { EmptyState } from "@/components/EmptyState";
import { Bar, Card, SectionTitle, styles as u } from "@/components/ui";
import { useApp } from "@/state/AppState";
import { C } from "@/theme";
import { goalProgress, goalValue, onTrack } from "@/lib/format";
export function GoalsSection() {
  const { goals, journey } = useApp();
  if (!goals.length)
    return (
      <EmptyState body="Personal goals will arrive after your first week of data." />
    );
  const started = journey.phase !== "baseline";
  const complete = journey.phase === "complete";
  return (
    <View>
      <SectionTitle
        title="Small steps, each day"
        hint={
          started
            ? complete
              ? "Day complete · rewards added to your garden"
              : "Today through 14:00 · rewards arrive at day’s end"
            : "Your first plan · begins on day 8"
        }
      />
      {goals.map((g) => {
        const ok = started && onTrack(g);
        return (
          <Card key={g.id}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <Text style={[u.h, { flex: 1 }]}>{g.title}</Text>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
              >
                <CoinIcon size={13} />
                <Text style={{ color: C.sun, fontWeight: "600" }}>
                  {g.reward}
                </Text>
              </View>
            </View>
            <Text style={[u.num, { marginTop: 12 }]}>
              {started ? goalValue(g, g.current) : "—"}
              <Text style={u.muted}> / {goalValue(g, g.target)}</Text>
            </Text>
            <View style={{ marginTop: 10 }}>
              <Bar
                value={started ? goalProgress(g) : 0}
                color={ok ? C.moss : C.sky}
              />
            </View>
            <Text style={[u.muted, { marginTop: 8 }]}>
              {!started
                ? "Starts tomorrow"
                : g.direction === "at_most"
                  ? complete
                    ? ok
                      ? "Within your daily limit"
                      : "Over today’s limit · a fresh start tomorrow"
                    : ok
                      ? "Within limit so far · confirmed at day’s end"
                      : "Over your limit so far · a fresh start tomorrow"
                  : ok
                    ? complete
                      ? "Completed"
                      : "Target reached so far"
                    : "A little room to grow"}
            </Text>
            <Text style={[u.muted, { marginTop: 8 }]}>{g.reason}</Text>
          </Card>
        );
      })}
    </View>
  );
}
