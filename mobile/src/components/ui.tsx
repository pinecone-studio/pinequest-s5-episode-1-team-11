import { haptic, Led, MotionPressable as Pressable } from "./motion";
import { Children, useState, type ComponentProps, type ReactNode } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { setEventStatus, statusLabel } from "../lib/events";
import type { Device, HaloEvent } from "../lib/types";
import { useAuth } from "../providers/AuthProvider";
import { useData, useHomes } from "../providers/HouseholdProvider";
import { aurora, colors, fonts } from "./colors";

export { colors, fonts } from "./colors";
export const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: 20, paddingTop: 16, paddingBottom: 116, gap: 24 },
  title: {
    color: colors.text,
    fontFamily: fonts.display,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.3,
  },
  heading: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 18,
    lineHeight: 24,
  },
  text: {
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 22,
  },
  muted: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    color: colors.muted,
    fontFamily: fonts.bold,
    fontSize: 14,
    lineHeight: 20,
    paddingLeft: 4,
    marginBottom: -12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  card: {
    backgroundColor: colors.glass,
    borderColor: colors.glassBorder,
    borderWidth: 1,
    borderRadius: 24,
    padding: 16,
    gap: 8,
    boxShadow:
      "inset 0px 1px 0px rgba(255,255,255,0.10), 0px 20px 40px -24px rgba(2,6,23,0.9)",
  },
  input: {
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 16,
    backgroundColor: colors.card,
    minHeight: 52,
    padding: 16,
  },
  button: {
    backgroundColor: colors.primaryButton,
    minHeight: 52,
    paddingHorizontal: 20,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0px 14px 34px -16px #60A5FA",
  },
  buttonSecondary: {
    backgroundColor: colors.glass,
    borderColor: colors.glassBorder,
    borderWidth: 1,
    boxShadow: "none",
  },
  buttonText: { color: colors.onPrimary, fontFamily: fonts.bold, fontSize: 18 },
  badge: { color: colors.primary, fontFamily: fonts.bold, fontSize: 14 },
  error: {
    color: colors.danger,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
  },
});

/** Aurora background like the web; `danger` turns it red for an open alert. */
export function Screen({
  children,
  danger = false,
}: {
  children: ReactNode;
  danger?: boolean;
}) {
  return (
    <View
      style={[
        styles.fill,
        {
          backgroundColor: danger ? aurora.alertBg : colors.bg,
          experimental_backgroundImage: danger ? aurora.alert : aurora.calm,
        },
      ]}
    >
      <SafeAreaView edges={["top", "left", "right"]} style={styles.fill}>
        {children}
      </SafeAreaView>
    </View>
  );
}
/** Round glass back button with a centred title, as on the prototype's detail screens. */
export function BackBar({ title, close = false }: { title: string; close?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={close ? "Хаах" : "Буцах"}
        onPress={() => {
          if (router.canGoBack()) router.back();
          else router.replace("/");
        }}
        style={[
          styles.card,
          { width: 44, height: 44, borderRadius: 22, padding: 0, alignItems: "center", justifyContent: "center" },
        ]}
      >
        <Ionicons name={close ? "close" : "chevron-back"} size={22} color={colors.text} />
      </Pressable>
      <Text
        numberOfLines={1}
        accessibilityRole="header"
        style={[styles.heading, { flex: 1, textAlign: "center" }]}
      >
        {title}
      </Text>
      <View style={{ width: 44 }} />
    </View>
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
  textOnly = false,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  busy?: boolean;
  textOnly?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={[
        styles.button,
        secondary && styles.buttonSecondary,
        textOnly && {
          backgroundColor: "transparent",
          borderWidth: 0,
          boxShadow: "none",
          minHeight: 44,
        },
        { opacity: disabled || busy ? 0.5 : 1 },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={secondary ? colors.text : colors.onPrimary} />
      ) : (
        <Text
          style={[
            styles.buttonText,
            secondary && { color: colors.text, fontSize: 16 },
            textOnly && {
              color: colors.muted,
              fontSize: 14,
              textDecorationLine: "underline",
            },
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}
/** Small status capsule with a light, as in the prototype's lists. */
export function Pill({
  label,
  tone = "ok",
}: {
  label: string;
  tone?: "ok" | "warn" | "crit" | "rest";
}) {
  const color = {
    ok: colors.primaryButton,
    warn: colors.warningButton,
    crit: colors.dangerButton,
    rest: colors.muted,
  }[tone];
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        minHeight: 28,
        paddingHorizontal: 12,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: tone === "ok" || tone === "rest" ? colors.hairline : `${color}80`,
        backgroundColor:
          tone === "ok" || tone === "rest" ? "rgba(255,255,255,0.06)" : `${color}24`,
      }}
    >
      <Led color={color} size={7} blink={tone === "crit"} />
      <Text
        style={{
          color:
            tone === "warn"
              ? colors.warning
              : tone === "crit"
                ? colors.danger
                : colors.muted,
          fontFamily: fonts.bold,
          fontSize: 12,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
export const deviceIcon = (kind: Device["kind"]) =>
  kind === "phone"
    ? "phone-portrait-outline"
    : kind === "laptop"
      ? "laptop-outline"
      : "videocam-outline";
export const kindLabel: Record<Device["kind"], string> = {
  phone: "Утас",
  laptop: "Компьютер",
  ip_camera: "IP камер",
};
/** Glass group of rows split by hairlines, like the web's ListGroup. */
export function ListGroup({ children }: { children: ReactNode }) {
  return (
    <View style={[styles.card, { padding: 0, gap: 0, overflow: "hidden" }]}>
      {Children.toArray(children).map((child, index) => (
        <View
          key={index}
          style={index > 0 && { borderTopWidth: 1, borderTopColor: colors.hairline }}
        >
          {child}
        </View>
      ))}
    </View>
  );
}
export function ListRow({
  icon,
  tone,
  leading,
  title,
  description,
  trailing,
  onPress,
}: {
  icon?: ComponentProps<typeof Ionicons>["name"];
  tone?: "warn";
  leading?: ReactNode;
  title: string;
  description?: string;
  trailing?: ReactNode;
  onPress?: () => void;
}) {
  const body = (
    <>
      {leading ??
        (icon && (
          <View
            style={[
              local.icon,
              tone === "warn" && { backgroundColor: `${colors.warningButton}24` },
            ]}
          >
            <Ionicons
              name={icon}
              size={22}
              color={tone === "warn" ? colors.warning : colors.primary}
            />
          </View>
        ))}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={local.rowTitle}>
          {title}
        </Text>
        {description ? (
          <Text numberOfLines={2} style={local.rowSub}>
            {description}
          </Text>
        ) : null}
      </View>
      {trailing ??
        (onPress && <Ionicons name="chevron-forward" size={20} color={colors.muted} />)}
    </>
  );
  return onPress ? (
    <Pressable accessibilityRole="button" onPress={onPress} style={local.row}>
      {body}
    </Pressable>
  ) : (
    <View style={local.row}>{body}</View>
  );
}
/** Initials in a ringed circle, as the web's Avatar. */
export function Avatar({ name, ring = colors.primaryButton }: { name: string; ring?: string }) {
  const initials =
    name
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "H";
  return (
    <View style={[local.avatar, { borderColor: ring }]}>
      <Text style={{ color: colors.text, fontFamily: fonts.bold, fontSize: 14 }}>{initials}</Text>
    </View>
  );
}
/** Empty list: an icon, what is missing and what to do, as the web's EmptyState. */
export function Empty({
  icon,
  title,
  hint,
}: {
  icon: ComponentProps<typeof Ionicons>["name"];
  title: string;
  hint: string;
}) {
  return (
    <View style={[styles.card, { alignItems: "center", paddingVertical: 24 }]}>
      <Ionicons name={icon} size={32} color={colors.primary} />
      <Text style={[styles.heading, { textAlign: "center" }]}>{title}</Text>
      <Text style={[styles.muted, { textAlign: "center" }]}>{hint}</Text>
    </View>
  );
}
/** Title and subtitle at the top of a tab, as the web's PageHeader. */
export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={{ gap: 2 }}>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={[styles.muted, { fontFamily: fonts.semibold }]}>{subtitle}</Text>
      ) : null}
    </View>
  );
}
export function DevicePill({ device }: { device: Device }) {
  return device.status === "online" ? (
    <Pill label="Онлайн" />
  ) : device.status === "pairing" ? (
    <Pill label="Холбож байна" tone="rest" />
  ) : (
    <Pill label="Салсан" tone="warn" />
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
          { justifyContent: "center", alignItems: "center", gap: 8 },
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
      {households.map((home) => {
        const selected = household?.id === home.id;
        return (
          <Pressable
            key={home.id}
            onPress={() => {
              haptic.tick();
              select(home.id);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={[
              styles.buttonSecondary,
              {
                minHeight: 44,
                paddingHorizontal: 16,
                borderRadius: 22,
                justifyContent: "center",
              },
              selected && { backgroundColor: colors.text },
            ]}
          >
            <Text
              style={[
                styles.badge,
                { color: selected ? colors.bg : colors.muted },
              ]}
            >
              {home.name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** Marks an event seen or false; shared by the alert, the event page and swipe-to-ack rows. */
export function useEventStatus(
  event: HaloEvent,
  onUpdated?: (row: HaloEvent) => void,
) {
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
      haptic.done();
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
  return { busy, error, submit };
}
export function confirmFalseAlarm(submit: () => void) {
  Alert.alert("Хуурамч дохио", "Энэ дохиог хуурамч гэж тэмдэглэх үү?", [
    { text: "Болих", style: "cancel" },
    { text: "Тэмдэглэх", onPress: submit },
  ]);
}
export function EventActions({
  event,
  onUpdated,
}: {
  event: HaloEvent;
  onUpdated?: (row: HaloEvent) => void;
}) {
  const { busy, error, submit } = useEventStatus(event, onUpdated);
  if (event.status !== "new")
    return <Text style={styles.muted}>Төлөв: {statusLabel[event.status]}</Text>;
  return (
    <View style={{ gap: 12 }}>
      <Button
        title="Харлаа"
        busy={busy}
        onPress={() => void submit("acknowledged")}
      />
      <Button
        title="Хуурамч дохио"
        secondary
        disabled={busy}
        onPress={() => confirmFalseAlarm(() => void submit("false_alarm"))}
      />
      {error && <Problem text={error} />}
    </View>
  );
}
const local = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 64,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  rowTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 16, lineHeight: 22 },
  rowSub: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
});
