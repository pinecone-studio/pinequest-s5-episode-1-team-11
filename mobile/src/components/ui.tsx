import { useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import {
  dateLabel,
  kindLabel,
  setEventStatus,
  severityLabel,
  statusLabel,
} from "../lib/events";
import type { HaloEvent } from "../lib/types";
import { useAuth } from "../providers/AuthProvider";
import { useData, useHomes } from "../providers/HouseholdProvider";

export const colors = {
  bg: "#07191D",
  card: "#0C252D",
  border: "#2B454C",
  text: "#F1F6F7",
  muted: "#91ABB1",
  primary: "#5EEAD4",
  danger: "#FB7185",
};
export const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: 20, paddingBottom: 116, gap: 16 },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.7,
  },
  heading: { color: colors.text, fontSize: 18, fontWeight: "700" },
  text: { color: colors.text, fontSize: 15, lineHeight: 22 },
  muted: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
    gap: 8,
  },
  input: {
    color: colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.card,
    padding: 15,
  },
  button: {
    backgroundColor: colors.primary,
    minHeight: 48,
    padding: 14,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonSecondary: {
    backgroundColor: "#203C43",
    borderColor: colors.border,
    borderWidth: 1,
  },
  buttonText: { color: "#063A34", fontSize: 15, fontWeight: "700" },
  badge: { color: colors.primary, fontSize: 12, fontWeight: "700" },
  error: { color: "#FFB0BC", fontSize: 13, lineHeight: 20 },
});

export function Screen({
  children,
  danger = false,
}: {
  children: ReactNode;
  danger?: boolean;
}) {
  return (
    <LinearGradient
      colors={
        danger
          ? ["#8A292F", "#260D18", "#160A10"]
          : ["#123D3A", "#07191D", "#082832"]
      }
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0.8 }}
      style={styles.fill}
    >
      <SafeAreaView edges={["top", "left", "right"]} style={styles.fill}>{children}</SafeAreaView>
    </LinearGradient>
  );
}
export function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}
export function Button({
  title,
  onPress,
  secondary = false,
  disabled = false,
  busy = false,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  busy?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.buttonSecondary,
        { opacity: disabled || busy ? 0.5 : pressed ? 0.8 : 1 },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={secondary ? colors.text : "#063A34"} />
      ) : (
        <Text style={[styles.buttonText, secondary && { color: colors.text }]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}
export function Problem({ text, retry }: { text: string; retry?: () => void }) {
  return (
    <View style={{ gap: 10 }}>
      <Text accessibilityRole="alert" style={styles.error}>
        {text}
      </Text>
      {retry && <Button title="Дахин оролдох" secondary onPress={retry} />}
    </View>
  );
}
export function Loading() {
  return (
    <Screen>
      <View
        style={[
          styles.fill,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.muted}>Ачаалж байна…</Text>
      </View>
    </Screen>
  );
}
export function HouseholdPicker() {
  const { households, household, select } = useHomes();
  if (households.length < 2)
    return household ? (
      <Text style={styles.muted}>{household.name}</Text>
    ) : null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8 }}
    >
      {households.map((home) => (
        <Pressable
          key={home.id}
          onPress={() => select(home.id)}
          accessibilityRole="button"
          accessibilityState={{ selected: household?.id === home.id }}
          style={[
            styles.button,
            styles.buttonSecondary,
            household?.id === home.id && { borderColor: colors.primary },
          ]}
        >
          <Text style={styles.text}>{home.name}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
export function EventCard({ event }: { event: HaloEvent }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() =>
        router.push({ pathname: "/events/[id]", params: { id: event.id } })
      }
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.8 : 1 }]}
    >
      <View style={styles.row}>
        <Text style={[styles.heading, { flex: 1 }]}>
          {kindLabel[event.kind]}
        </Text>
        <Text
          style={[
            styles.badge,
            event.severity === "critical" && { color: colors.danger },
          ]}
        >
          {severityLabel[event.severity]}
        </Text>
      </View>
      <Text style={styles.muted}>
        {[event.person_name, event.room_name].filter(Boolean).join(" · ") ||
          "Байршил тодорхойгүй"}
      </Text>
      <View style={styles.row}>
        <Text style={styles.muted}>{dateLabel(event.occurred_at)}</Text>
        <Text style={styles.badge}>{statusLabel[event.status]}</Text>
      </View>
    </Pressable>
  );
}
export function EventActions({
  event,
  onUpdated,
}: {
  event: HaloEvent;
  onUpdated?: (row: HaloEvent) => void;
}) {
  const { session } = useAuth();
  const { applyEvent, refresh } = useData();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(status: "acknowledged" | "false_alarm") {
    if (!session || busy || event.status !== "new") return;
    setBusy(true);
    setError(null);
    try {
      const updated = await setEventStatus(
        event.id,
        event.household_id,
        session.user.id,
        status,
      );
      applyEvent(updated);
      onUpdated?.(updated);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Дохиог шинэчилж чадсангүй.",
      );
      void refresh();
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={{ gap: 10 }}>
      <Button
        title="Харлаа"
        busy={busy}
        disabled={event.status !== "new"}
        onPress={() => {
          void submit("acknowledged");
        }}
      />
      <Button
        title="Хуурамч дохио"
        secondary
        disabled={busy || event.status !== "new"}
        onPress={() =>
          Alert.alert("Хуурамч дохио", "Энэ дохиог хуурамч гэж тэмдэглэх үү?", [
            { text: "Болих", style: "cancel" },
            {
              text: "Тэмдэглэх",
              onPress: () => {
                void submit("false_alarm");
              },
            },
          ])
        }
      />
      {event.status !== "new" && (
        <Text style={styles.muted}>Төлөв: {statusLabel[event.status]}</Text>
      )}
      {error && <Problem text={error} />}
    </View>
  );
}
