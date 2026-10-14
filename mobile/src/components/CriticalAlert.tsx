import { useEffect } from "react";
import {
  AppState,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  Vibration,
  View,
  Alert,
  Pressable,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { kindLabel } from "../lib/events";
import { useData } from "../providers/HouseholdProvider";
import { Snapshot } from "./Snapshot";
import { confidenceLabel } from "./EventRow";
import { colors, EventActions, Screen, styles } from "./ui";

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
  const metrics = [
    { label: "Итгэлцэл", value: confidenceLabel(critical.confidence) },
    { label: "Дохионы төлөв", value: "Шинэ" },
    {
      label: "Камер",
      value: !device
        ? "Тодорхойгүй"
        : device.status === "online"
          ? "Онлайн"
          : device.status === "pairing"
            ? "Холбож байна"
            : "Салсан",
    },
  ];
  return (
    <Modal
      visible
      presentationStyle="fullScreen"
      animationType="slide"
      statusBarTranslucent
      onRequestClose={() => dismissCritical(critical.id)}
    >
      <Screen danger>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={local.content}
        >
          <View style={styles.row}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Дохиог хаах"
              onPress={() => dismissCritical(critical.id)}
              style={local.pill}
            >
              <Ionicons name="close" size={17} color={colors.text} />
              <Text style={local.pillText}>Хаах</Text>
            </Pressable>
            <View style={local.pill}>
              <View style={local.dot} />
              <Text
                style={[local.pillText, { fontSize: 10, letterSpacing: 1 }]}
              >
                ЯАРАЛТАЙ
              </Text>
            </View>
          </View>
          <View style={{ gap: 5 }}>
            <Text style={local.time}>{time}</Text>
            <Text style={local.title}>
              {critical.kind === "fall"
                ? "Унасан байж\nмагадгүй"
                : kindLabel[critical.kind]}
            </Text>
            <Text style={local.location}>
              {[critical.person_name, critical.room_name]
                .filter(Boolean)
                .join(" · ") || "Байршил тодорхойгүй"}
            </Text>
          </View>
          <View style={{ gap: 5 }}>
            <Snapshot
              key={`snapshot:${critical.id}`}
              path={critical.snapshot_path}
              compact
            />
            <Text style={local.caption}>Илрүүлсэн агшин · {time}</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {metrics.map((metric) => (
              <View key={metric.label} style={local.metric}>
                <Text style={local.metricLabel}>{metric.label}</Text>
                <Text style={local.metricValue}>{metric.value}</Text>
              </View>
            ))}
          </View>
          <EventActions
            key={critical.id}
            event={critical}
            alertMode
            afterAcknowledge={
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="103 руу залгах"
                onPress={() => {
                  void Linking.openURL("tel:103").catch(() =>
                    Alert.alert(
                      "Дуудлага",
                      "Энэ төхөөрөмжөөс дуудлага хийх боломжгүй байна.",
                    ),
                  );
                }}
                style={local.call}
              >
                <View style={local.callIcon}>
                  <Ionicons name="call-outline" color={colors.text} size={20} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={local.number}>103</Text>
                  <Text style={local.metricLabel}>Түргэн тусламж</Text>
                </View>
                <View style={local.pill}>
                  <Ionicons name="call-outline" size={13} color={colors.text} />
                  <Text style={local.pillText}>Залгах</Text>
                </View>
              </Pressable>
            }
          />
          <Text style={local.caption}>
            Хаах нь дохиог “Харсан” гэж тэмдэглэхгүй.
          </Text>
        </ScrollView>
      </Screen>
    </Modal>
  );
}
const local = StyleSheet.create({
  content: { padding: 20, paddingBottom: 44, gap: 16 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#544148",
    backgroundColor: "#30262BCC",
    borderRadius: 25,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  pillText: { color: colors.text, fontSize: 12, fontWeight: "700" },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#F46979" },
  time: {
    color: "#F1B7BD",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  title: {
    color: colors.text,
    fontSize: 29,
    lineHeight: 33,
    letterSpacing: -0.5,
    fontWeight: "800",
  },
  location: { color: "#E4BDC4", fontSize: 14, fontWeight: "600" },
  caption: {
    color: "#B49BA6",
    fontSize: 11,
    textAlign: "center",
    lineHeight: 17,
  },
  metric: {
    flex: 1,
    backgroundColor: "#1A1E26E6",
    padding: 10,
    borderWidth: 1,
    borderColor: "#423D45",
    borderRadius: 17,
    gap: 8,
  },
  metricLabel: { color: "#99A6B0", fontSize: 10, fontWeight: "600" },
  metricValue: { color: colors.text, fontSize: 16, fontWeight: "800" },
  call: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: "#423D45",
    padding: 12,
    backgroundColor: "#1B2027",
  },
  callIcon: {
    backgroundColor: "#183B42",
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  number: { color: colors.text, fontSize: 24, fontWeight: "800" },
});
