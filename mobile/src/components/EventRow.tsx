import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { kindLabel, statusLabel } from "../lib/events";
import type { HaloEvent } from "../lib/types";
import { colors } from "./ui";

const icons: Record<
  HaloEvent["kind"],
  React.ComponentProps<typeof Ionicons>["name"]
> = {
  fall: "accessibility-outline",
  scream: "volume-high-outline",
  cry: "sad-outline",
  glass: "wine-outline",
  alarm: "flame-outline",
  offline: "videocam-off-outline",
  test: "checkmark-circle-outline",
};
export function confidenceLabel(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "Итгэлцэл тодорхойгүй";
  return `${Math.round(Math.min(100, Math.max(0, value <= 1 ? value * 100 : value)))}%`;
}
export function EventRow({ event }: { event: HaloEvent }) {
  const color =
    event.severity === "critical"
      ? "#FB7185"
      : event.severity === "warning"
        ? "#E8B82E"
        : colors.muted;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${kindLabel[event.kind]}, ${statusLabel[event.status]}`}
      onPress={() =>
        router.push({ pathname: "/events/[id]", params: { id: event.id } })
      }
      style={({ pressed }) => [local.row, { opacity: pressed ? 0.7 : 1 }]}
    >
      <View
        style={[
          local.icon,
          { backgroundColor: `${color}1A`, borderColor: `${color}55` },
        ]}
      >
        <Ionicons name={icons[event.kind]} size={21} color={color} />
      </View>
      <View style={local.body}>
        <Text style={local.title}>{kindLabel[event.kind]}</Text>
        <Text numberOfLines={1} style={local.location}>
          {[event.person_name, event.room_name].filter(Boolean).join(" · ") ||
            "Байршил тодорхойгүй"}
        </Text>
        <Text numberOfLines={1} style={local.detail}>
          {confidenceLabel(event.confidence)}
          {event.note ? ` · ${event.note}` : ""}
        </Text>
      </View>
      <View style={local.trailing}>
        <Text style={local.time}>
          {new Date(event.occurred_at).toLocaleTimeString("mn-MN", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
        <Text
          style={[
            local.status,
            event.status === "new"
              ? { color, backgroundColor: `${color}1A` }
              : event.status === "acknowledged"
                ? { color: colors.primary, backgroundColor: "#134047" }
                : null,
          ]}
        >
          {statusLabel[event.status]}
        </Text>
      </View>
    </Pressable>
  );
}
const local = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#0C252D",
    padding: 13,
    borderRadius: 22,
    marginBottom: 10,
    minHeight: 95,
  },
  icon: {
    height: 43,
    width: 43,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1, gap: 4 },
  title: { color: colors.text, fontSize: 14, fontWeight: "700" },
  location: { color: colors.muted, fontSize: 12 },
  detail: { color: colors.muted, fontSize: 10, lineHeight: 15 },
  trailing: { alignItems: "flex-end", gap: 8 },
  time: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  status: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.muted,
    paddingVertical: 5,
    paddingHorizontal: 8,
    backgroundColor: "#19363F",
    borderRadius: 9,
  },
});
