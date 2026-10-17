import { useState } from "react";
import {
  Linking,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Svg, { Line, Path } from "react-native-svg";
import { EmptyState } from "@/components/EmptyState";
import { Card, SectionTitle, styles as u } from "@/components/ui";
import { useApp } from "@/state/AppState";
import { shortDate, valueFor } from "@/demo/journey";
import { C, F, R } from "@/theme";
import { DataSources } from "./DataSources";

type MetricInfo = {
  key: string;
  title: string;
  unit: string;
  color: string;
  source: "wearable" | "scenario";
  note: string;
};
const METRICS: MetricInfo[] = [
  {
    key: "steps",
    title: "Movement",
    unit: "steps",
    color: C.moss,
    source: "wearable",
    note: "Daily step count. PMData’s minute-level steps are summed by date.",
  },
  {
    key: "sleep_minutes",
    title: "Sleep",
    unit: "min",
    color: C.sky,
    source: "wearable",
    note: "Minutes asleep in the longest overnight session. Sleep belongs to the morning it ends.",
  },
  {
    key: "daylight_minutes",
    title: "Daylight",
    unit: "min",
    color: C.sun,
    source: "scenario",
    note: "Fictional outdoor minutes for the demo. A real iPhone can read time in daylight from Apple Health when available.",
  },
  {
    key: "active_minutes",
    title: "Active time",
    unit: "min",
    color: C.moss,
    source: "wearable",
    note: "Fitbit moderately active + very active minutes. This does not include all light movement.",
  },
  {
    key: "sedentary_minutes",
    title: "Sedentary time",
    unit: "min",
    color: C.fern,
    source: "wearable",
    note: "Fitbit’s sedentary classification. It is not a direct measurement of time sitting and can include unworn-device time.",
  },
  {
    key: "feed_minutes",
    title: "Feed time",
    unit: "min",
    color: C.berry,
    source: "scenario",
    note: "Fictional Instagram, TikTok and YouTube totals. Feed minutes are a proxy, not a measured diagnosis of doomscrolling. Live per-app Screen Time access is not implemented.",
  },
  {
    key: "screen_minutes",
    title: "Screen time",
    unit: "min",
    color: C.sky,
    source: "scenario",
    note: "Fictional phone screen time, including feed apps. In real use you can enter feed minutes manually.",
  },
  {
    key: "energy_kcal",
    title: "Food energy",
    unit: "kcal eaten",
    color: C.sun,
    source: "scenario",
    note: "Calories consumed, not calories burned. Demo values are fictional. In a native build, Apple Health can provide dietary energy written by compatible nutrition apps such as MyFitnessPal, with permission.",
  },
];
function format(value: number | null, metric: MetricInfo) {
  if (value === null) return "—";
  if (
    metric.key === "sleep_minutes" ||
    metric.key === "sedentary_minutes" ||
    metric.key === "screen_minutes" ||
    metric.key === "feed_minutes" || metric.key.startsWith("app:")
  )
    return `${Math.floor(Math.round(value) / 60)}h ${Math.round(value) % 60}m`;
  return `${Math.round(value).toLocaleString("en-US")}`;
}
const unitLabel = (m: MetricInfo) =>
  m.unit !== "min"
    ? m.unit
    : [
          "sleep_minutes",
          "sedentary_minutes",
          "screen_minutes",
          "feed_minutes",
      ].includes(m.key) || m.key.startsWith("app:")
      ? "hours & minutes"
      : "minutes";
const average = (values: (number | null)[]) => {
  const valid = values.filter((v): v is number => v !== null);
  return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
};

export function ReportSection({ onNavigate }: { onNavigate?: () => void }) {
  const { reportDays, currentDay, dataMode, journey } = useApp();
  const [detail, setDetail] = useState<MetricInfo | null>(null);
  const [range, setRange] = useState<7 | 30>(7);
  const [selected, setSelected] = useState<string | null>(null);
  const [sources, setSources] = useState(false);
  const showMetric = (metric: MetricInfo) => { setDetail(metric); setSelected(null); onNavigate?.(); };
  const appMetric = (app: string): MetricInfo => ({ ...METRICS[5], key: `app:${app}`, title: app, note: `Fictional ${app} minutes for this replay. Automatic iOS per-app Screen Time access is not implemented.` });
  const { width } = useWindowDimensions();
  const day = reportDays.find((d) => d.date === selected) ?? currentDay;
  const isPartial = dataMode === "sample" && journey.phase === "midday";
  const status =
    dataMode === "sample"
      ? `Day ${journey.index + 1} · ${isPartial ? "through 14:00" : "day complete"}`
      : "Today · latest available sync";
  const days = reportDays.slice(-range);
  const completed = reportDays.filter(
    (d) => !(isPartial && d.date === currentDay?.date),
  );
  const week = completed.slice(-7);
  const previous = completed.slice(-14, -7);
  if (detail) {
    const values = days.map((d) => valueFor(d, detail.key));
    const max = Math.max(1, ...values.map((v) => v ?? 0));
    const mean = average(week.map((d) => valueFor(d, detail.key)));
    const prev = average(previous.map((d) => valueFor(d, detail.key)));
    const chartW = Math.max(220, Math.min(width - 72, 600));
    const chartH = 140;
    const path = values
      .map((v, i) =>
        v === null
          ? ""
          : `${i === 0 || values[i - 1] === null ? "M" : "L"} ${(i * chartW) / Math.max(1, values.length - 1)},${chartH - (v / max) * (chartH - 12)}`,
      )
      .join(" ");
    return (
      <View>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setDetail(null);
            setSelected(null);
              onNavigate?.();
          }}
          style={{ paddingVertical: 12, alignSelf: "flex-start" }}
        >
          <Text style={{ color: C.moss, fontWeight: "600" }}>
            ‹ All reports
          </Text>
        </Pressable>
        <SectionTitle
          title={detail.title}
          hint={selected ? shortDate(selected) : status}
        />
        <Text
          style={{
            fontFamily: F.display,
            color: detail.color,
            fontSize: 44,
            marginVertical: 14,
          }}
        >
          {format(valueFor(day, detail.key), detail)}
        </Text>
        <Text style={u.muted}>
          {unitLabel(detail)} ·{" "}
          {dataMode === "sample"
            ? detail.source === "wearable"
              ? "PMData wearable record"
              : "Fictional demo scenario"
            : "On-device record"}
        </Text>
        <View style={{ flexDirection: "row", gap: 8, marginVertical: 24 }}>
          {([7, 30] as const).map((n) => (
            <Pressable
              key={n}
              accessibilityRole="button"
              accessibilityState={{ selected: range === n }}
              onPress={() => {
                setRange(n);
                setSelected(null);
              }}
              style={{
                backgroundColor: range === n ? C.moss : C.pineRaised,
                borderRadius: R.pill,
                paddingHorizontal: 20,
                paddingVertical: 10,
              }}
            >
              <Text style={{ color: range === n ? C.pine : C.fern }}>
                {n} days
              </Text>
            </Pressable>
          ))}
        </View>
        {days.length ? (
          <Card>
            <View
              style={{ paddingTop: 8, paddingBottom: 12, alignItems: "center" }}
            >
              <Svg width={chartW} height={chartH}>
                {[0, 0.5, 1].map((f) => (
                  <Line
                    key={f}
                    x1={0}
                    x2={chartW}
                    y1={chartH * f}
                    y2={chartH * f}
                    stroke={C.pineLine}
                    strokeDasharray="3 5"
                  />
                ))}
                {values.filter((v) => v !== null).length > 1 && (
                  <Path
                    d={path}
                    fill="none"
                    stroke={detail.color}
                    strokeWidth={3}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                )}
              </Svg>
              <View
                style={{ width: chartW, flexDirection: "row", marginTop: 12 }}
              >
                {days.map((d, i) => (
                  <Pressable
                    key={d.date}
                    accessibilityRole="button"
                    accessibilityLabel={`${shortDate(d.date)}: ${format(values[i], detail)}${isPartial && d.date === currentDay?.date ? ", partial day" : ""}`}
                    onPress={() => setSelected(d.date)}
                    style={{
                      flex: 1,
                      minHeight: 42,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor:
                        d.date === selected ? C.pineLine : "transparent",
                      borderRadius: 6,
                    }}
                  >
                    <View
                      style={{
                        width: range === 7 ? 20 : 5,
                        height:
                          values[i] === null
                            ? 2
                            : Math.max(3, (values[i]! / max) * 44),
                        backgroundColor:
                          values[i] === null ? C.pineLine : detail.color,
                        borderRadius: 4,
                        opacity:
                          isPartial && d.date === currentDay?.date ? 0.4 : 0.85,
                      }}
                    />
                    {range === 7 && (
                      <Text
                        style={{ color: C.fern, fontSize: 10, marginTop: 8 }}
                      >
                        {d.date.slice(-2)}
                      </Text>
                    )}
                  </Pressable>
                ))}
              </View>
            </View>
            <Text style={u.muted}>
              {shortDate(days[0].date)} –{" "}
              {shortDate(days[days.length - 1].date)} · tap a bar to inspect
            </Text>
          </Card>
        ) : (
          <EmptyState />
        )}
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Card style={{ flex: 1 }}>
            <Text style={u.muted}>Last 7 complete days</Text>
            <Text style={[u.num, { marginTop: 8 }]}>
              {format(mean, detail)}
            </Text>
          </Card>
          <Card style={{ flex: 1 }}>
            <Text style={u.muted}>Previous 7 days</Text>
            <Text style={[u.num, { marginTop: 8 }]}>
              {format(prev, detail)}
            </Text>
          </Card>
        </View>
        <Text style={u.muted}>
          {previous.length
            ? `${previous.length} days available in the previous period.`
            : "Previous-week comparison appears after more days arrive."}
          {isPartial
            ? " Today’s partial totals are excluded from weekly averages."
            : ""}
        </Text>
        {detail.key === "feed_minutes" && day?.app_usage && (
          <View style={{ marginTop: 22 }}>
            <Text style={[u.h, { marginBottom: 12 }]}>Where the time went</Text>
            {Object.entries(day.app_usage)
              .sort((a, b) => b[1] - a[1])
              .map(([app, m]) => (
                <View
                  key={app}
                  style={{
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: C.pineLine,
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <Text style={u.body}>{app}</Text>
                  <Text style={{ color: C.berry }}>{m} min</Text>
                </View>
              ))}
          </View>
        )}
        <Text style={[u.muted, { marginTop: 24 }]}>
          {dataMode === "sample"
            ? detail.note
            : "Shows only recorded data. Missing readings stay empty; no values are estimated."}
        </Text>
      </View>
    );
  }
  return (
    <View>
      <SectionTitle
        title="Your day, at a glance"
        hint={dataMode === "empty" ? "Waiting for new data" : status}
      />
      {dataMode === "sample" && (
        <View
          style={{
            borderLeftWidth: 2,
            borderLeftColor: C.sun,
            paddingLeft: 12,
            marginBottom: 24,
          }}
        >
          <Text style={[u.muted, { fontSize: 12 }]}>
            Demo replay · PMData wearable records, with fictional screen time,
            daylight and food.
          </Text>
        </View>
      )}
      {dataMode === "empty" ? (
        <EmptyState body="Your daily movement, sleep and habits will appear here when data arrives." />
      ) : (
        <>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {METRICS.map((m) => (
              <Pressable
                key={m.key}
                accessibilityRole="button"
                accessibilityLabel={`Open ${m.title} report`}
                onPress={() => showMetric(m)}
                style={{
                  flexBasis: "46%",
                  flexGrow: 1,
                  backgroundColor: C.pineRaised,
                  padding: 16,
                  borderRadius: R.card,
                  minHeight: 130,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <Text style={u.muted}>{m.title}</Text>
                  <Text style={{ color: C.fern }}>↗</Text>
                </View>
                <Text
                  style={{
                    fontFamily: F.display,
                    fontSize: 26,
                    color: m.color,
                    marginTop: 18,
                  }}
                >
                  {format(valueFor(currentDay, m.key), m)}
                </Text>
                <Text style={{ color: C.fern, fontSize: 11, marginTop: 4 }}>
                  {unitLabel(m)}
                </Text>
              </Pressable>
            ))}
          </View>
          {currentDay?.app_usage && (
            <View style={{ marginTop: 28 }}>
              <Text style={u.h}>Most-used feed apps</Text>
              {Object.entries(currentDay.app_usage)
                .sort((a, b) => b[1] - a[1])
                .map(([app, m]) => (
                  <Pressable
                    key={app}
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${app} usage report`}
                    onPress={() => showMetric(appMetric(app))}
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      paddingVertical: 16,
                      borderBottomWidth: 1,
                      borderBottomColor: C.pineLine,
                    }}
                  >
                    <Text style={u.body}>{app}</Text>
                    <Text style={{ color: C.fern }}>{m} min ›</Text>
                  </Pressable>
                ))}
            </View>
          )}
        </>
      )}
      <Pressable
        accessibilityRole="button"
        onPress={() => setSources((s) => !s)}
        style={{ paddingVertical: 22 }}
      >
        <Text style={{ color: C.moss }}>
          {sources ? "Hide data sources" : "Data sources & connections"}{" "}
          {sources ? "−" : "+"}
        </Text>
      </Pressable>
      {sources && (
        <>
          <DataSources />
          {dataMode === "sample" && (
            <Pressable
              accessibilityRole="link"
              onPress={() => {
                void Linking.openURL("https://datasets.simula.no/pmdata/");
              }}
              style={{ paddingVertical: 12 }}
            >
              <Text style={{ color: C.moss }}>
                PMData · Thambawita et al. · CC BY-NC 4.0 ↗
              </Text>
            </Pressable>
          )}
        </>
      )}
    </View>
  );
}
