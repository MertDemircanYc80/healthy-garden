// Island → Report: the weekly health report.
import { Text, View } from "react-native";
import { Card, Ring, SectionTitle, WeekBars, styles as u } from "@/components/ui";
import { DataSources } from "./DataSources";
import { useApp } from "@/state/AppState";
import { C, F, T } from "@/theme";

function latest(v: number, unit: string) {
  if (unit === "h") return `${Math.floor(v)}h ${Math.round((v % 1) * 60)}m`;
  if (unit === "k") return `${v.toFixed(1)}k`;
  return `${Math.round(v)} ${unit}`;
}

export function ReportSection() {
  const { report, isDemo } = useApp();
  return (
    <View>
      <SectionTitle title="Health report" hint={report.periodLabel} />
      <DataSources />
      {isDemo ? <Card style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
        <Ring value={report.score / 100} size={84} stroke={8} color={C.moss}>
          <Text style={{ color: C.mist, fontFamily: F.display, fontSize: 26 }}>{report.score}</Text>
        </Ring>
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.moss, fontWeight: "700", fontSize: T.small }}>
            {report.scoreChange >= 0 ? "+" : ""}
            {report.scoreChange} from last week
          </Text>
          <Text style={[u.body, { marginTop: 4, fontSize: T.small, lineHeight: 19 }]}>{report.summary}</Text>
        </View>
      </Card> : <Card><Text style={u.body}>{report.summary}</Text></Card>}

      {report.metrics.map((m) => (
        <Card key={m.metric} style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <View style={{ flex: 1 }}>
            <Text style={u.muted}>{m.label}</Text>
            <Text style={{ color: C.mist, fontFamily: F.display, fontSize: 20, marginTop: 2 }}>{latest(m.week[m.week.length - 1], m.unit)}</Text>
            <Text style={[u.muted, { marginTop: 4 }]}>{m.note}</Text>
          </View>
          <WeekBars values={m.week} goal={m.goal} better={m.better} />
        </Card>
      ))}
      {isDemo && <Text style={[u.muted, { textAlign: "center", marginTop: 6 }]}>Bars show the last 7 days. Today is brightest.</Text>}
    </View>
  );
}
