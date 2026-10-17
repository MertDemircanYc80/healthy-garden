// Island → Coach: personal suggestions written by the AI from this user's health data.
import { Text, View } from "react-native";
import { Card, Chip, SectionTitle, styles as u } from "@/components/ui";
import { useApp } from "@/state/AppState";
import { C, T } from "@/theme";
import type { InsightKind } from "@/types";

const KIND: Record<InsightKind, { label: string; color: string }> = {
  pattern: { label: "Pattern", color: C.sky },
  suggestion: { label: "Try this", color: C.moss },
  praise: { label: "Nice work", color: C.sun },
};

export function CoachSection() {
  const { insights, dismissInsight, isDemo } = useApp();
  const visible = insights.filter((i) => !i.dismissed);
  return (
    <View>
      <SectionTitle title="Coach" hint="Read from your sleep, movement, screen time and meals. Not medical advice." />
      {visible.length === 0 && (
        <Card>
          <Text style={u.body}>{isDemo ? "You’re all caught up." : "Your personal goal targets explain the recorded totals they use. More health data will help make them personal. Not medical advice."}</Text>
        </Card>
      )}
      {visible.map((i) => (
        <Card key={i.id}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: KIND[i.kind].color }} />
            <Text style={{ color: KIND[i.kind].color, fontSize: T.small, fontWeight: "700" }}>{KIND[i.kind].label}</Text>
          </View>
          <Text style={u.h}>{i.title}</Text>
          <Text style={[u.body, { marginTop: 6 }]}>{i.body}</Text>
          {i.evidence && <Text style={[u.muted, { marginTop: 8 }]}>Based on: {i.evidence}</Text>}
          {i.action && (
            <View style={{ marginTop: 12, padding: 12, borderRadius: 14, backgroundColor: C.pine }}>
              <Text style={[u.body, { fontSize: T.small, lineHeight: 19 }]}>{i.action}</Text>
            </View>
          )}
          <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
            {i.action && <Chip label="Remind me" tone="solid" onPress={() => dismissInsight(i.id)} />}
            <Chip label={i.kind === "praise" ? "Thanks" : "Not for me"} onPress={() => dismissInsight(i.id)} />
          </View>
        </Card>
      ))}
    </View>
  );
}
