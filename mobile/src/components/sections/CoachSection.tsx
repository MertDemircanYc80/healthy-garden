import { Text, View } from "react-native";
import { EmptyState } from "@/components/EmptyState";
import { Card, SectionTitle, styles as u } from "@/components/ui";
import { useApp } from "@/state/AppState";
import { latestPlan, shortDate, MONTH } from "@/demo/journey";
import { C } from "@/theme";
export function CoachSection() {
  const { insights, journey, demo } = useApp();
  const plan = latestPlan(journey);
  if (!plan)
    return (
      <EmptyState body="Your coach is waiting for your first week of data." />
    );
  return (
    <View>
      <SectionTitle
        title="A little perspective"
        hint={`${demo.coachSource} · through ${shortDate(MONTH[plan.through].date)}`}
      />
      {insights.map((i) => (
        <Card key={i.id}>
          <Text
            style={{
              color: C.moss,
              fontSize: 10,
              fontWeight: "700",
              letterSpacing: 1,
              marginBottom: 10,
            }}
          >
            {i.kind === "pattern" ? "YOUR PATTERN" : "ONE SMALL CHANGE"}
          </Text>
          <Text style={u.h}>{i.title}</Text>
          <Text style={[u.body, { marginTop: 8 }]}>{i.body}</Text>
          {i.evidence && (
            <Text style={[u.muted, { marginTop: 12 }]}>{i.evidence}</Text>
          )}
        </Card>
      ))}
      <Text style={[u.muted, { marginTop: 8 }]}>
        Lifestyle suggestions, not medical advice.
      </Text>
    </View>
  );
}
