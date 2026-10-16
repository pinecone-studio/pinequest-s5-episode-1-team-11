import { haptic, MotionPressable as Pressable } from "./motion";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import { kindLabel, statusLabel } from "../lib/events";
import type { HaloEvent } from "../lib/types";
import { colors, fonts, styles, useEventStatus } from "./ui";

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
export const severityTint = {
  critical: [colors.dangerButton, colors.danger],
  warning: [colors.warningButton, colors.warning],
  info: [colors.muted, colors.muted],
} as const;

/** A glass event row. A new event can be acknowledged by swiping left or with its button. */
export function EventRow({ event }: { event: HaloEvent }) {
  const [tint, ink] = severityTint[event.severity];
  const fresh = event.status === "new";
  const swipe = useRef<SwipeableMethods>(null);
  const { busy, error, submit } = useEventStatus(event);
  return (
    <ReanimatedSwipeable
      ref={swipe}
      enabled={fresh && !busy}
      friction={1.6}
      rightThreshold={64}
      overshootRight={false}
      containerStyle={{ marginBottom: 12, borderRadius: 24 }}
      onSwipeableOpen={() => {
        haptic.tick();
        void submit("acknowledged");
        swipe.current?.close();
      }}
      renderRightActions={() => (
        <View style={local.action}>
          <Ionicons name="checkmark" size={24} color={colors.onPrimary} />
          <Text style={local.actionText}>Харлаа</Text>
        </View>
      )}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${kindLabel[event.kind]}, ${statusLabel[event.status]}`}
        onPress={() =>
          router.push({ pathname: "/events/[id]", params: { id: event.id } })
        }
        style={[styles.card, local.row]}
      >
        <View
          style={[
            local.glyph,
            { backgroundColor: `${tint}29`, borderColor: `${tint}5C` },
          ]}
        >
          <Ionicons name={icons[event.kind]} size={22} color={ink} />
        </View>
        <View style={local.body}>
          <Text style={local.title}>{kindLabel[event.kind]}</Text>
          <Text numberOfLines={1} style={local.meta}>
            {[event.person_name, event.room_name].filter(Boolean).join(" · ") ||
              "Байршил тодорхойгүй"}
          </Text>
          <Text numberOfLines={1} style={local.note}>
            {confidenceLabel(event.confidence)}
            {event.note ? ` · ${event.note}` : ""}
          </Text>
          {error && (
            <Text accessibilityRole="alert" style={[styles.error, { fontSize: 13 }]}>
              {error}
            </Text>
          )}
        </View>
        <View style={local.trailing}>
          <Text style={local.time}>
            {new Date(event.occurred_at).toLocaleTimeString("mn-MN", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
          {fresh ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Харлаа гэж тэмдэглэх"
              disabled={busy}
              onPress={() => void submit("acknowledged")}
              style={local.ack}
            >
              <Ionicons name="checkmark" size={16} color={colors.onPrimary} />
              <Text style={local.ackText}>Харлаа</Text>
            </Pressable>
          ) : (
            <Text
              style={[
                local.status,
                event.status === "acknowledged" && {
                  color: colors.primary,
                  backgroundColor: colors.primarySoft,
                },
              ]}
            >
              {statusLabel[event.status]}
            </Text>
          )}
        </View>
      </Pressable>
    </ReanimatedSwipeable>
  );
}
const local = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
  glyph: {
    height: 48,
    width: 48,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1, minWidth: 0 },
  title: { color: colors.text, fontFamily: fonts.bold, fontSize: 16, lineHeight: 22 },
  meta: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 14,
    marginTop: 4,
  },
  note: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 13,
    marginTop: 2,
  },
  trailing: { alignItems: "flex-end", gap: 8 },
  time: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 16,
    fontVariant: ["tabular-nums"],
  },
  ack: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: colors.primaryButton,
  },
  ackText: { color: colors.onPrimary, fontFamily: fonts.bold, fontSize: 13 },
  status: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.muted,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  action: {
    width: 120,
    marginLeft: -24,
    paddingLeft: 24,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: colors.primaryButton,
  },
  actionText: { color: colors.onPrimary, fontFamily: fonts.bold, fontSize: 13 },
});
