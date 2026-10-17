import { Text, View } from "react-native";
import { C, F } from "@/theme";
import { LeafIcon } from "@/components/Icons";
export function EmptyState({
  title = "Waiting for new data",
  body = "Your updates will appear here.",
}: {
  title?: string;
  body?: string;
}) {
  return (
    <View style={{ paddingVertical: 42, alignItems: "center", gap: 12 }}>
      <View
        style={{
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: C.pineRaised,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <LeafIcon size={23} color={C.moss} />
      </View>
      <Text
        style={{
          color: C.mist,
          fontFamily: F.display,
          fontSize: 21,
          textAlign: "center",
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          color: C.fern,
          fontSize: 13,
          lineHeight: 20,
          textAlign: "center",
          maxWidth: 270,
        }}
      >
        {body}
      </Text>
    </View>
  );
}
