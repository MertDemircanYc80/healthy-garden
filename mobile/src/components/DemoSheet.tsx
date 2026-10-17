import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Bar, styles as u } from "@/components/ui";
import { useApp } from "@/state/AppState";
import { latestPlan } from "@/demo/journey";
import { C, F, R } from "@/theme";
export function DemoSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { demo, today, journey } = useApp();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [confirm, setConfirm] = useState(false);
  const plan = latestPlan(journey);
  const empty = journey.phase === "empty";
  const end = journey.index === 29 && journey.phase === "complete";
  const analyze = !empty && !plan && journey.index >= 6;
  const label = empty
    ? "Load first 7 days"
    : analyze
      ? "Analyze the first week"
      : journey.phase === "midday"
        ? `Finish day ${journey.index + 1}`
        : end
          ? "30 days complete"
          : `Open day ${journey.index + 2}`;
  const run = async () => {
    setBusy(true);
    setMessage("");
    try {
      const result = await (empty
        ? demo.load()
        : analyze
          ? demo.analyze()
          : journey.phase === "midday"
            ? demo.finish()
            : demo.nextDay());
      setMessage(result.message);
    } catch {
      setMessage("Couldn’t save this step. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  const total =
    journey.ledger.reduce((sum, e) => sum + e.amount, 0) +
    (journey.dailyRewards ?? []).reduce((sum, e) => sum + e.amount, 0);
  const receipts = (journey.dailyRewards ?? []).map((d) => {
    const goal = journey.ledger.find((e) => e.date === d.date);
    return {
      ...d,
      amount: d.amount + (goal?.amount ?? 0),
      goalsHit: goal?.goalsHit ?? 0,
      goalsTotal: goal?.goalsTotal ?? 0,
    };
  });
  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          justifyContent: "flex-end",
          backgroundColor: "rgba(8,20,12,0.45)",
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close demo controls"
          onPress={onClose}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <View
          style={{
            backgroundColor: C.pine,
            borderTopLeftRadius: R.island,
            borderTopRightRadius: R.island,
            padding: 24,
            paddingBottom: Math.max(insets.bottom, 20),
            maxHeight: "88%",
          }}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text
                style={{ color: C.mist, fontFamily: F.display, fontSize: 26 }}
              >
                A month of small steps
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={onClose}
                style={{ padding: 12 }}
              >
                <Text style={{ color: C.moss }}>Done</Text>
              </Pressable>
            </View>
            <Text style={[u.muted, { marginTop: 10 }]}>
              A 30-day replay. First observe a week, then build healthier habits
              and a garden.
            </Text>
            {!!demo.terminalStatus && (
              <Text style={[u.muted, { marginTop: 12 }]}>
                {demo.terminalStatus}
              </Text>
            )}
            <View style={{ marginVertical: 24, gap: 10 }}>
              <Text
                style={{ color: C.sun, fontFamily: F.display, fontSize: 24 }}
              >
                {empty ? "A fresh start" : demo.dateLabel}
              </Text>
              <Bar value={empty ? 0 : (journey.index + 1) / 30} />
              <Text style={u.muted}>
                {empty
                  ? "No sample data loaded"
                  : `${journey.index + 1} / 30 days · ${journey.phase === "midday" ? "14:00 snapshot" : "complete day"}`}
              </Text>
            </View>
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
              <View
                style={{
                  flex: 1,
                  padding: 14,
                  borderRadius: 18,
                  backgroundColor: C.pineRaised,
                }}
              >
                <Text style={u.muted}>Gold earned</Text>
                <Text style={u.num}>{total}</Text>
              </View>
              <View
                style={{
                  flex: 1,
                  padding: 14,
                  borderRadius: 18,
                  backgroundColor: C.pineRaised,
                }}
              >
                <Text style={u.muted}>Available</Text>
                <Text style={u.num}>{today.coins}</Text>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              disabled={busy || end}
              onPress={() => {
                void run();
              }}
              style={{
                backgroundColor: end ? C.pineLine : C.moss,
                paddingVertical: 15,
                borderRadius: R.pill,
                alignItems: "center",
                opacity: busy ? 0.5 : 1,
              }}
            >
              <Text style={{ color: C.pine, fontWeight: "700" }}>
                {busy ? "Updating…" : label}
              </Text>
            </Pressable>
            {empty && (
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                onPress={async () => {
                  setBusy(true);
                  try {
                    const r = await demo.start();
                    setMessage(r.message);
                  } finally {
                    setBusy(false);
                  }
                }}
                style={{ paddingVertical: 16, alignItems: "center" }}
              >
                <Text style={{ color: C.moss }}>Start with day 1</Text>
              </Pressable>
            )}
            <Text style={[u.muted, { marginTop: 10 }]}>
              {empty
                ? "Loads reports and 10 gold per completed day (70 total). Goals and coach follow after analysis."
                : analyze
                  ? "Uses a prepared AI analysis, or a live model if configured. Goal rewards are doubled."
                  : journey.phase === "midday"
                    ? "Saves final totals, 10 daily gold and completed goal rewards once."
                    : "Tomorrow’s totals start at 14:00. Plants you watered grow overnight."}
            </Text>
            {!!message && (
              <Text
                accessibilityLiveRegion="polite"
                style={{ color: C.moss, marginTop: 14, lineHeight: 20 }}
              >
                {message}
              </Text>
            )}
            {!empty && (
              <Pressable
                accessibilityRole="button"
                disabled={
                  busy ||
                  journey.phase === "midday" ||
                  ![6, 13, 20, 27, 29].includes(journey.index) ||
                  plan?.through === journey.index
                }
                onPress={async () => {
                  setBusy(true);
                  try {
                    const r = await demo.analyze(true);
                    setMessage(r.message);
                  } finally {
                    setBusy(false);
                  }
                }}
                style={{ paddingVertical: 16 }}
              >
                <Text style={{ color: C.fern }}>
                  Use prepared analysis for this checkpoint
                </Text>
              </Pressable>
            )}
            {receipts.length > 0 && (
              <View style={{ marginTop: 16 }}>
                <Text style={u.h}>Recent rewards</Text>
                {receipts
                  .slice(-3)
                  .reverse()
                  .map((e) => (
                    <View
                      key={e.date}
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        paddingVertical: 10,
                      }}
                    >
                      <Text style={u.muted}>
                        {e.date} ·{" "}
                        {e.goalsTotal
                          ? `${e.goalsHit}/${e.goalsTotal} goals + daily gold`
                          : "Daily gold"}
                      </Text>
                      <Text style={{ color: C.sun }}>+{e.amount}</Text>
                    </View>
                  ))}
              </View>
            )}
            <Text style={[u.muted, { marginTop: 20, fontSize: 11 }]}>
              PMData wearable record (CC BY-NC 4.0). Screen time, daylight and
              food are fictional additions. Prepared AI output is cached; no
              live request is made unless a coach server is configured.
            </Text>
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => setConfirm(true)}
              style={{ paddingVertical: 18 }}
            >
              <Text style={{ color: C.fern }}>Return to empty state</Text>
            </Pressable>
            {confirm && (
              <View style={{ gap: 14 }}>
                <Text style={u.muted}>
                  Clear this branch’s demo, garden and purchases? The original
                  version’s save is kept separately.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  disabled={busy}
                  onPress={async () => {
                    setBusy(true);
                    try {
                      const ok = await demo.reset();
                      if (ok) {
                        setConfirm(false);
                        setMessage("");
                        onClose();
                      } else
                        setMessage("Reset failed. Your previous save is safe.");
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <Text style={{ color: C.berry }}>Confirm reset</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setConfirm(false)}
                >
                  <Text style={{ color: C.mist }}>Cancel</Text>
                </Pressable>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
