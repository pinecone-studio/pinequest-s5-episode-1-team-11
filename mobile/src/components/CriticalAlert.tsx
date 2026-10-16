import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  Vibration,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { kindLabel } from "../lib/events";
import type { HaloEvent } from "../lib/types";
import { useData } from "../providers/HouseholdProvider";
import { Snapshot } from "./Snapshot";
import { confidenceLabel } from "./EventRow";
import { haptic, Led, MotionPressable as Pressable, Rise, springs } from "./motion";
import {
  colors,
  confirmFalseAlarm,
  fonts,
  Problem,
  Screen,
  styles,
  useEventStatus,
} from "./ui";

export function CriticalAlert() {
  const { critical, dismissCritical, devices } = useData();
  const id = critical?.id;
  useEffect(() => {
    if (!id) return;
    const vibrate = () =>
      Vibration.vibrate(
        Platform.OS === "ios" ? [0, 450, 450] : [0, 450, 180, 450],
        false,
      );
    if (AppState.currentState === "active") vibrate();
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") vibrate();
      else Vibration.cancel();
    });
    return () => {
      listener.remove();
      Vibration.cancel();
    };
  }, [id]);
  if (!critical) return null;
  const device = devices.find((item) => item.id === critical.device_id);
  const time = new Date(critical.occurred_at).toLocaleTimeString("mn-MN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const signals = [
    ["Итгэлцэл", confidenceLabel(critical.confidence)],
    ["Төлөв", "Шинэ"],
    [
      "Камер",
      !device
        ? "Тодорхойгүй"
        : device.status === "online"
          ? "Онлайн"
          : device.status === "pairing"
            ? "Холбож байна"
            : "Салсан",
    ],
  ];
  return (
    <Modal
      visible
      presentationStyle="fullScreen"
      animationType="slide"
      statusBarTranslucent
      onRequestClose={() => dismissCritical(critical.id)}
    >
      {/* Gestures inside a native modal need their own root. */}
      <GestureHandlerRootView style={styles.fill}>
        <Screen danger>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={local.content}
            accessibilityViewIsModal
          >
            <Rise style={styles.row}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Дохиог хаах"
                onPress={() => dismissCritical(critical.id)}
                style={[styles.buttonSecondary, local.chip]}
              >
                <Ionicons name="close" size={20} color={colors.text} />
                <Text style={local.chipText}>Хаах</Text>
              </Pressable>
              <View style={[styles.buttonSecondary, local.chip]}>
                <Led color={colors.dangerButton} blink />
                <Text style={[local.chipText, { fontSize: 12, letterSpacing: 1.2 }]}>
                  ЯАРАЛТАЙ
                </Text>
              </View>
            </Rise>
            <Rise index={1} style={{ gap: 8 }}>
              <Text style={local.clock}>{time}</Text>
              <Text accessibilityRole="header" style={local.title}>
                {kindLabel[critical.kind]}
              </Text>
              <Text style={local.where}>
                {[critical.person_name, critical.room_name].filter(Boolean).join(" · ") ||
                  "Байршил тодорхойгүй"}
              </Text>
            </Rise>
            <Rise index={2} style={{ gap: 8 }}>
              <Snapshot key={`snapshot:${critical.id}`} path={critical.snapshot_path} />
              <Text style={local.caption}>Илрүүлсэн агшин · {time}</Text>
            </Rise>
            <Rise index={3} style={{ flexDirection: "row", gap: 8 }}>
              {signals.map(([label, value]) => (
                <View key={label} style={[styles.card, local.signal]}>
                  <Text numberOfLines={1} style={local.signalLabel}>
                    {label}
                  </Text>
                  <Text numberOfLines={1} style={local.signalValue}>
                    {value}
                  </Text>
                </View>
              ))}
            </Rise>
            <Respond key={critical.id} event={critical} />
          </ScrollView>
        </Screen>
      </GestureHandlerRootView>
    </Modal>
  );
}

function Respond({ event }: { event: HaloEvent }) {
  const { busy, error, submit } = useEventStatus(event);
  return (
    <>
      <Rise index={4}>
        <SlideToAck busy={busy} onConfirm={() => void submit("acknowledged")} />
      </Rise>
      <Rise index={5}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="103 руу залгах"
          onPress={() => {
            void Linking.openURL("tel:103").catch(() =>
              Alert.alert("Дуудлага", "Энэ төхөөрөмжөөс дуудлага хийх боломжгүй байна."),
            );
          }}
          style={[styles.card, local.call]}
        >
          <View style={local.callIcon}>
            <Ionicons name="call" color={colors.text} size={22} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={local.callNumber}>103</Text>
            <Text style={local.signalLabel}>Түргэн тусламж</Text>
          </View>
          <View style={local.callChip}>
            <Ionicons name="call-outline" size={16} color={colors.text} />
            <Text style={local.chipText}>Залгах</Text>
          </View>
        </Pressable>
      </Rise>
      {error && <Problem text={error} />}
      <Rise index={6} style={{ alignItems: "center", gap: 4 }}>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => confirmFalseAlarm(() => void submit("false_alarm"))}
          style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: 12 }}
        >
          <Text style={local.link}>Хуурамч дохио гэж тэмдэглэх</Text>
        </Pressable>
        <Text style={local.caption}>Хаах нь дохиог “Харсан” гэж тэмдэглэхгүй.</Text>
      </Rise>
    </>
  );
}

const THUMB = 56;
/** "I'm on my way": drag the thumb to the end, or tap twice (the first tap arms it). */
function SlideToAck({ busy, onConfirm }: { busy: boolean; onConfirm: () => void }) {
  const [width, setWidth] = useState(0);
  const [armed, setArmed] = useState(false);
  const max = Math.max(0, width - 16 - THUMB);
  const x = useSharedValue(0);
  const pan = Gesture.Pan()
    .runOnJS(true)
    .enabled(!busy && !armed && max > 0)
    .activeOffsetX([-8, 8])
    .onChange((event) => x.set(Math.min(max, Math.max(0, x.get() + event.changeX))))
    .onEnd(() => {
      if (x.get() > max * 0.85) {
        x.set(withSpring(max, springs.snappy));
        haptic.tick();
        onConfirm();
      } else x.set(withSpring(0, springs.bouncy));
    });
  const thumbMotion = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));
  const fillMotion = useAnimatedStyle(() => ({ width: x.get() + THUMB + 12 }));
  const textMotion = useAnimatedStyle(() => ({
    opacity: max ? 1 - x.get() / max : 1,
  }));
  return (
    <View
      style={local.slide}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    >
      <Animated.View style={[local.fill, fillMotion]} />
      {!armed && (
        <Animated.View pointerEvents="none" style={[local.slideText, textMotion]}>
          <Text style={local.slideTitle}>Би очиж байна</Text>
          <Text style={local.signalLabel}>Гулсуулах эсвэл 2 удаа дарах</Text>
        </Animated.View>
      )}
      <GestureDetector gesture={pan}>
        <Animated.View
          layout={LinearTransition.springify().stiffness(springs.smooth.stiffness).damping(springs.smooth.damping)}
          style={[armed ? { flex: 1 } : { width: THUMB }, thumbMotion]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              armed
                ? "Дахин дарж баталгаажуулах"
                : "Би очиж байна. Баталгаажуулахын тулд 2 удаа дарна уу"
            }
            accessibilityState={{ busy, disabled: busy }}
            disabled={busy}
            onPress={() => {
              if (armed) return onConfirm();
              haptic.tick();
              setArmed(true);
            }}
            style={local.thumb}
          >
            {busy ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : armed ? (
              <Text style={[styles.buttonText, { fontSize: 16 }]}>
                Дахин дарж баталгаажуулах
              </Text>
            ) : (
              <Ionicons name="arrow-forward" size={24} color={colors.onPrimary} />
            )}
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
const local = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40, gap: 16 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 22,
  },
  chipText: { color: colors.text, fontFamily: fonts.bold, fontSize: 14 },
  clock: {
    color: "#FECACA",
    fontFamily: fonts.bold,
    fontSize: 14,
    fontVariant: ["tabular-nums"],
  },
  title: {
    color: "#FFFFFF",
    fontFamily: fonts.display,
    fontSize: 28,
    lineHeight: 34,
  },
  where: { color: "#FECACA", fontFamily: fonts.body, fontSize: 18 },
  caption: {
    color: "#FECACA",
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  signal: { flex: 1, padding: 12, borderRadius: 18, gap: 8, minWidth: 0 },
  signalLabel: { color: colors.muted, fontFamily: fonts.bold, fontSize: 12 },
  signalValue: { color: colors.text, fontFamily: fonts.display, fontSize: 18, lineHeight: 24 },
  slide: {
    height: 68,
    borderRadius: 34,
    padding: 6,
    paddingHorizontal: 8,
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: colors.glassStrong,
  },
  fill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 34,
    experimental_backgroundImage:
      "linear-gradient(90deg, transparent, rgba(96,165,250,0.38))",
  },
  slideText: { position: "absolute", left: 80, right: 16, gap: 2 },
  slideTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 18, lineHeight: 24 },
  thumb: {
    height: THUMB,
    borderRadius: THUMB / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryButton,
    boxShadow: "0px 8px 20px -8px #60A5FA",
  },
  call: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 72,
    padding: 12,
  },
  callIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  callNumber: {
    color: colors.text,
    fontFamily: fonts.display,
    fontSize: 22,
    letterSpacing: 0.4,
  },
  callChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  link: {
    color: colors.muted,
    fontFamily: fonts.bold,
    fontSize: 14,
    textDecorationLine: "underline",
  },
});
