import { useEffect, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useData, useHomes } from "../../providers/HouseholdProvider";
import {
  dashboardState,
  elapsedLabel,
  eventHistogram,
  todayEvents,
} from "../../lib/dashboard";
import { dateLabel } from "../../lib/events";
import {
  Button,
  Card,
  colors,
  EventCard,
  Loading,
  Problem,
  Screen,
  styles,
} from "../../components/ui";

export default function HomeScreen() {
  const homes = useHomes();
  const data = useData();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);
  if (homes.loading) return <Loading />;
  const state = dashboardState(
    data.devices,
    data.events,
    data.loading,
    !!(data.error || data.realtimeError),
  );
  const dayEvents = todayEvents(data.events, now);
  const dayWarnings = dayEvents.filter(
    (event) => event.severity !== "info",
  ).length;
  const bins = eventHistogram(data.events, now);
  const maximum = Math.max(1, ...bins);
  const hour = now.getHours() + now.getMinutes() / 60;
  const people = [
    ...new Set(
      data.events
        .map((event) => event.person_name?.trim())
        .filter((name): name is string => !!name),
    ),
  ].slice(0, 4);
  const name = homes.name || "";
  const initials = name
    ? name
        .split(/\s+/)
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "H";
  const latest = data.events[0];
  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, local.content]}
        refreshControl={
          <RefreshControl
            refreshing={data.refreshing}
            tintColor={colors.primary}
            onRefresh={() => {
              if (homes.error) homes.retry();
              else void data.refresh();
            }}
          />
        }
      >
        <View style={styles.row}>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={local.greeting}>Сайн уу{name ? `, ${name}` : ""}</Text>
            <Text style={local.small}>
              {
                [
                  "Ням",
                  "Даваа",
                  "Мягмар",
                  "Лхагва",
                  "Пүрэв",
                  "Баасан",
                  "Бямба",
                ][now.getDay()]
              }{" "}
              · {now.getMonth() + 1}-р сарын {now.getDate()}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Гэр бүлийн тохиргоо"
            onPress={() => router.push("/(tabs)/family")}
            style={local.avatar}
          >
            <Text style={local.avatarText}>{initials}</Text>
          </Pressable>
        </View>
        {homes.error && <Problem text={homes.error} retry={homes.retry} />}
        {!homes.error && !homes.household ? (
          <Card>
            <Text style={styles.heading}>Гэр бүлд холбогдоогүй байна</Text>
            <Text style={styles.muted}>
              Гэр бүлийн эзнээр өөрийгөө асран хамгаалагч болгон нэмүүлнэ үү.
            </Text>
            <Button title="Дахин шалгах" secondary onPress={homes.retry} />
          </Card>
        ) : (
          homes.household && (
            <>
              <View style={local.hero}>
                <View
                  accessibilityLabel={`${state.rooms} өрөө, ${state.title}`}
                  style={local.orbArea}
                >
                  {[200, 174, 146].map((size, index) => (
                    <View
                      key={size}
                      style={[
                        local.halo,
                        {
                          width: size,
                          height: size,
                          borderRadius: size / 2,
                          backgroundColor: state.critical
                            ? `rgba(251,113,133,${0.008 + index * 0.009})`
                            : `rgba(45,212,191,${0.008 + index * 0.009})`,
                        },
                      ]}
                    />
                  ))}
                  <LinearGradient
                    colors={
                      state.critical
                        ? ["#FFC4CD", "#FB7185", "#82263A"]
                        : ["#94F9E9", "#26CFBC", "#0A4D4C"]
                    }
                    start={{ x: 0.15, y: 0 }}
                    end={{ x: 0.8, y: 1 }}
                    style={local.orb}
                  >
                    <Text style={local.orbNumber}>
                      {state.rooms.toString().padStart(2, "0")}
                    </Text>
                    <Text style={local.orbLabel}>өрөө</Text>
                  </LinearGradient>
                </View>
                <Text
                  style={[
                    local.summary,
                    state.critical && { color: "#FFB7C2" },
                  ]}
                >
                  {state.title}
                </Text>
                <Text style={[local.small, { textAlign: "center" }]}>
                  {state.rooms} өрөө хянаж байна ·{" "}
                  {elapsedLabel(data.checkedAt, now)} шалгасан
                </Text>
              </View>
              {data.error && (
                <Problem
                  text={data.error}
                  retry={() => {
                    void data.refresh();
                  }}
                />
              )}
              {data.realtimeError && <Problem text={data.realtimeError} />}
              <View style={local.today}>
                <View style={styles.row}>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={local.cardTitle}>Өнөөдөр</Text>
                    <Text style={local.small}>
                      {dayWarnings
                        ? `${dayWarnings} анхааруулга`
                        : "Анхааруулга бүртгэгдээгүй"}{" "}
                      · {dayEvents.length} дохио
                    </Text>
                  </View>
                  <View style={local.time}>
                    <View
                      style={[
                        local.dot,
                        {
                          backgroundColor:
                            data.error || data.realtimeError
                              ? "#FBBF24"
                              : colors.primary,
                        },
                      ]}
                    />
                    <Text style={local.timeText}>
                      {data.checkedAt
                        ? new Date(data.checkedAt).toLocaleTimeString("mn-MN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </Text>
                  </View>
                </View>
                <View
                  accessibilityLabel={`Өнөөдрийн дохионы давтамж, нийт ${dayEvents.length} дохио`}
                  style={local.chart}
                >
                  {bins.map((count, index) => (
                    <View
                      key={index}
                      style={[
                        local.bar,
                        {
                          height: count ? 6 + (count / maximum) * 42 : 3,
                          backgroundColor: count ? "#25B8AB" : "#25484C",
                        },
                      ]}
                    />
                  ))}
                  <View
                    style={[
                      local.cursor,
                      { left: `${Math.min(99, (hour / 24) * 100)}%` },
                    ]}
                  />
                </View>
                <View style={styles.row}>
                  {["00", "06", "12", "18", "24"].map((label) => (
                    <Text key={label} style={local.axis}>
                      {label}
                    </Text>
                  ))}
                </View>
                <Text style={local.small}>
                  Дохионы давтамж · Сүүлийн 100 бүртгэлээс
                </Text>
                <Text style={local.current}>
                  <Text style={{ color: colors.text, fontWeight: "700" }}>
                    Одоо ·{" "}
                  </Text>
                  {state.calm ? "Бүгд тайван" : state.title}
                </Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Төхөөрөмжүүдийг харах"
                    onPress={() => router.push("/(tabs)/family")}
                    style={local.metric}
                  >
                    <Ionicons
                      name="videocam-outline"
                      size={17}
                      color={colors.primary}
                    />
                    <Text style={local.metricText}>
                      {state.online}/{data.devices.length} онлайн
                    </Text>
                  </Pressable>
                  <View style={local.metric}>
                    <Ionicons
                      name="time-outline"
                      size={17}
                      color={colors.primary}
                    />
                    <Text style={local.metricText}>
                      {elapsedLabel(data.checkedAt, now)}
                    </Text>
                  </View>
                </View>
              </View>
              <Text style={local.section}>Хамгаалж буй хүмүүс</Text>
              {people.length ? (
                people.map((person) => {
                  const observation = data.events.find(
                    (event) => event.person_name?.trim() === person,
                  )!;
                  return (
                    <Pressable
                      key={person}
                      accessibilityRole="button"
                      onPress={() =>
                        router.push({
                          pathname: "/events/[id]",
                          params: { id: observation.id },
                        })
                      }
                      style={local.person}
                    >
                      <View style={local.avatar}>
                        <Ionicons
                          name="person-outline"
                          color={colors.primary}
                          size={19}
                        />
                      </View>
                      <View style={{ flex: 1, gap: 3 }}>
                        <Text style={local.cardTitle}>{person}</Text>
                        <Text style={local.small}>
                          {observation.room_name || "Өрөө тодорхойгүй"} ·{" "}
                          {dateLabel(observation.occurred_at)}
                        </Text>
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={17}
                        color={colors.muted}
                      />
                    </Pressable>
                  );
                })
              ) : (
                <Text style={local.small}>
                  Нэртэй дохио бүртгэгдэхэд энд харагдана.
                </Text>
              )}
              <View style={styles.row}>
                <Text style={local.section}>Камер ба төхөөрөмж</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push("/(tabs)/family")}
                >
                  <Text style={styles.badge}>Бүгдийг харах</Text>
                </Pressable>
              </View>
              {data.devices.slice(0, 3).map((device) => (
                <View key={device.id} style={local.person}>
                  <Ionicons
                    name="videocam-outline"
                    size={20}
                    color={colors.primary}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={local.cardTitle}>{device.name}</Text>
                    <Text style={local.small}>
                      {device.room_name || "Өрөө тодорхойгүй"}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.badge,
                      device.status !== "online" && { color: "#FBBF24" },
                    ]}
                  >
                    {device.status === "online"
                      ? "Онлайн"
                      : device.status === "pairing"
                        ? "Холбож байна"
                        : "Салсан"}
                  </Text>
                </View>
              ))}
              {!data.devices.length && (
                <Text style={local.small}>Одоогоор төхөөрөмж алга.</Text>
              )}
              <Text style={local.section}>Сүүлийн дохио</Text>
              {latest ? (
                <EventCard event={latest} />
              ) : (
                <Text style={local.small}>
                  {data.loading ? "Ачаалж байна…" : "Дохио бүртгэгдээгүй."}
                </Text>
              )}
            </>
          )
        )}
      </ScrollView>
    </Screen>
  );
}
const local = StyleSheet.create({
  content: { paddingTop: 24, gap: 14 },
  greeting: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.6,
  },
  small: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#102B31",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.text, fontSize: 11, fontWeight: "700" },
  hero: { alignItems: "center", paddingBottom: 8, gap: 6 },
  orbArea: {
    height: 212,
    width: 220,
    alignItems: "center",
    justifyContent: "center",
  },
  halo: { position: "absolute" },
  orb: {
    width: 108,
    height: 108,
    borderRadius: 54,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    boxShadow:
      "inset 7px 9px 20px rgba(216,255,248,0.45), inset -8px -10px 20px rgba(0,44,46,0.5), 0px 0px 36px 4px rgba(45,212,191,0.35)",
  },
  orbNumber: {
    color: "#042D2C",
    fontSize: 39,
    fontWeight: "800",
    letterSpacing: -1,
  },
  orbLabel: {
    color: "#063B36",
    fontSize: 11,
    fontWeight: "700",
    marginTop: -3,
  },
  summary: {
    color: colors.text,
    fontSize: 21,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  today: {
    padding: 15,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#0B252D",
    gap: 9,
  },
  cardTitle: { color: colors.text, fontSize: 13, fontWeight: "700" },
  time: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#16343C",
  },
  timeText: { color: colors.text, fontSize: 11, fontWeight: "700" },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    boxShadow: "0px 0px 7px #5EEAD4",
  },
  chart: {
    height: 58,
    flexDirection: "row",
    gap: 2,
    alignItems: "flex-end",
    marginTop: 4,
  },
  bar: { flex: 1, borderRadius: 2 },
  cursor: {
    position: "absolute",
    height: 50,
    width: 1,
    backgroundColor: "#D1FFF4",
    bottom: 0,
    opacity: 0.7,
  },
  axis: { color: colors.muted, fontSize: 10 },
  current: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  metric: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: "#2B454C",
    borderRadius: 12,
    backgroundColor: "#173039",
  },
  metricText: { color: colors.text, fontSize: 10, fontWeight: "600" },
  section: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 6,
  },
  person: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 13,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#0C252D",
  },
});
