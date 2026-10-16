import { MotionPressable as Pressable, Rise, Skeleton } from "../../components/motion";
import { Linking, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { orbInk, StatusOrb } from "../../components/StatusOrb";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, type Href } from "expo-router";
import { useData, useHomes } from "../../providers/HouseholdProvider";
import { homeStatus } from "../../lib/dashboard";
import { kindLabel as eventKind } from "../../lib/events";
import { EventRow } from "../../components/EventRow";
import {
  Avatar,
  Button,
  Card,
  colors,
  DevicePill,
  Empty,
  fonts,
  Header,
  ListGroup,
  ListRow,
  Loading,
  Problem,
  Screen,
  styles,
} from "../../components/ui";

// The web's home copy (src/features/home/messages/mn.json).
const copy = {
  calm: ["Бүгд тайван", "Камерууд холбогдсон. Шалгаагүй шинэ дохио алга.", "Үйл явдлын түүх"],
  alert: [
    "Одоо шалгаарай",
    "Аюултай байж болзошгүй шинэ үйл явдал байна. Юу болсныг шалгаарай.",
    "Дохиог шалгах",
  ],
  offline: [
    "Камерын холболтыг шалгана уу",
    "Зарим камер холбогдоогүй байна. Цэнэг, интернэт болон browser-ийг шалгаарай.",
    "Камеруудыг шалгах",
  ],
  empty: [
    "Гэрээ хянаж эхлээрэй",
    "Эхний камераа холбоод хайртай хүмүүсийнхээ дохиог хүлээн аваарай.",
    "Эхний камер нэмэх",
  ],
  attention: [
    "Шинэ дохио байна",
    "Шалгаагүй үйл явдал байна. Юу болсныг нээгээд тэмдэглээрэй.",
    "Үйл явдал руу орох",
  ],
} as const;

export default function HomeScreen() {
  const homes = useHomes();
  const data = useData();
  if (homes.loading) return <Loading />;
  const state = homeStatus(data.devices, data.events);
  const critical = data.events.find(
    (event) => event.status === "new" && event.severity === "critical",
  );
  const online = data.devices.filter((device) => device.status === "online").length;
  const action: Href =
    state === "empty"
      ? "/devices/new"
      : state === "offline"
        ? "/devices"
        : "/(tabs)/events";
  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
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
        <Rise style={styles.row}>
          <View style={{ flex: 1 }}>
            <Header
              title={`Сайн уу${homes.name ? `, ${homes.name}` : ""}`}
              subtitle={homes.household?.name}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Гэр бүл ба тохиргоо"
            onPress={() => router.push("/(tabs)/family")}
          >
            <Avatar name={homes.name} ring={colors.glassBorder} />
          </Pressable>
        </Rise>
        {homes.error && <Problem text={homes.error} retry={homes.retry} />}
        {!homes.error && !homes.household ? (
          <Card>
            <Text style={styles.heading}>Гэр бүлд холбогдоогүй байна</Text>
            <Text style={styles.muted}>
              Гэр бүл үүсгэх эсвэл урилгаар нэгдэхийн тулд Гэр бүл хэсэг рүү орно уу.
            </Text>
            <Button title="Гэр бүл" onPress={() => router.push("/(tabs)/family")} />
          </Card>
        ) : homes.household && data.loading ? (
          <View style={{ gap: 16 }} aria-busy>
            <Skeleton style={{ height: 320, borderRadius: 32 }} />
            <Skeleton style={{ height: 200, borderRadius: 24 }} />
          </View>
        ) : (
          homes.household && (
            <>
              {data.error && <Problem text={data.error} retry={() => void data.refresh()} />}
              {data.realtimeError && <Problem text={data.realtimeError} />}
              {critical ? (
                <Rise index={1} style={[styles.card, local.status, local.alert]}>
                  <StatusOrb state="alert">
                    <Text style={[local.orbNumber, { color: orbInk.alert }]}>!</Text>
                    <Text style={[local.orbLabel, { color: orbInk.alert }]}>Яаралтай</Text>
                  </StatusOrb>
                  <Text style={[local.statusTitle, { color: "#FFFFFF" }]}>
                    {eventKind[critical.kind]}
                  </Text>
                  <Text style={[styles.text, { color: "rgba(255,255,255,0.8)", textAlign: "center" }]}>
                    {[
                      critical.person_name,
                      critical.room_name,
                      new Date(critical.occurred_at).toLocaleTimeString("mn-MN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      }),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                  <View style={local.actions}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() =>
                        router.push({ pathname: "/events/[id]", params: { id: critical.id } })
                      }
                      style={[styles.button, local.danger]}
                    >
                      <Text style={[styles.buttonText, { color: "#000000" }]}>Одоо харах</Text>
                      <Ionicons name="arrow-forward" size={20} color="#000000" />
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => void Linking.openURL("tel:103")}
                      style={[styles.button, styles.buttonSecondary, local.inline]}
                    >
                      <Ionicons name="call" size={20} color={colors.text} />
                      <Text style={[styles.buttonText, { color: colors.text, fontSize: 16 }]}>
                        103 руу залгах
                      </Text>
                    </Pressable>
                  </View>
                </Rise>
              ) : (
                <Rise index={1} style={[styles.card, local.status]}>
                  <StatusOrb
                    state={state === "empty" ? "empty" : state === "calm" ? "calm" : "warning"}
                    onCheck={() => void data.refresh()}
                  >
                    {state === "empty" ? (
                      <Ionicons name="add" size={32} color={orbInk.empty} />
                    ) : (
                      <>
                        <Text
                          style={[
                            local.orbNumber,
                            { color: orbInk[state === "calm" ? "calm" : "warning"] },
                          ]}
                        >
                          {online.toString().padStart(2, "0")}
                        </Text>
                        <Text
                          style={[
                            local.orbLabel,
                            { color: orbInk[state === "calm" ? "calm" : "warning"] },
                          ]}
                        >
                          онлайн
                        </Text>
                      </>
                    )}
                  </StatusOrb>
                  <Text accessibilityLiveRegion="polite" style={local.statusTitle}>
                    {copy[state][0]}
                  </Text>
                  <Text style={[styles.muted, { textAlign: "center" }]}>{copy[state][1]}</Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => router.push(action)}
                    style={[styles.button, local.inline, { marginTop: 8 }]}
                  >
                    <Text style={styles.buttonText}>{copy[state][2]}</Text>
                    <Ionicons name="arrow-forward" size={20} color={colors.onPrimary} />
                  </Pressable>
                </Rise>
              )}
              <Rise index={2} style={{ gap: 12 }}>
                <View style={styles.row}>
                  <Text style={styles.heading}>
                    Камерууд · {online}/{data.devices.length} онлайн
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Камер нэмэх"
                    onPress={() => router.push("/devices/new")}
                    style={local.add}
                  >
                    <Ionicons name="add" size={22} color={colors.primary} />
                  </Pressable>
                </View>
                {data.devices.length ? (
                  <>
                    <ListGroup>
                      {data.devices.slice(0, 3).map((device) => (
                        <ListRow
                          key={device.id}
                          icon="videocam-outline"
                          tone={device.status === "online" ? undefined : "warn"}
                          title={device.room_name || device.name}
                          description={device.name}
                          trailing={<DevicePill device={device} />}
                          onPress={() => router.push(`/devices/${device.id}`)}
                        />
                      ))}
                    </ListGroup>
                    <Pressable
                      accessibilityRole="link"
                      onPress={() => router.push("/devices")}
                      style={local.link}
                    >
                      <Text style={styles.badge}>Бүх камерыг харах</Text>
                    </Pressable>
                  </>
                ) : (
                  <Empty
                    icon="videocam-outline"
                    title="Камер холбоогүй байна"
                    hint="Хуучин утас эсвэл laptop-аа камер болгож холбоорой."
                  />
                )}
              </Rise>
              <Rise index={3} style={{ gap: 12 }}>
                <View style={styles.row}>
                  <Text style={styles.heading}>Сүүлийн үйл явдлууд</Text>
                  <Pressable
                    accessibilityRole="link"
                    onPress={() => router.push("/(tabs)/events")}
                    style={local.link}
                  >
                    <Text style={styles.badge}>Бүгдийг харах</Text>
                  </Pressable>
                </View>
                {data.events.length ? (
                  data.events.slice(0, 3).map((event) => <EventRow key={event.id} event={event} />)
                ) : (
                  <Empty
                    icon="shield-checkmark-outline"
                    title="Одоогоор үйл явдал алга"
                    hint="Илрүүлсэн дохио энд цагийн дарааллаар харагдана."
                  />
                )}
              </Rise>
              <Text style={[styles.muted, { fontSize: 13, textAlign: "center" }]}>
                Камерын browser-ийг нээлттэй байлгана. Halo нь яаралтай тусламжийг орлохгүй.
              </Text>
            </>
          )
        )}
      </ScrollView>
    </Screen>
  );
}
const local = StyleSheet.create({
  status: { alignItems: "center", gap: 8, padding: 24, borderRadius: 32 },
  alert: {
    borderColor: "rgba(239,68,68,0.4)",
    experimental_backgroundImage:
      "linear-gradient(135deg, rgba(185,28,28,0.45), rgba(20,7,11,0.55))",
    boxShadow: "0px 30px 80px -30px rgba(239,68,68,0.6)",
  },
  orbNumber: {
    fontFamily: fonts.display,
    fontSize: 40,
    lineHeight: 44,
    fontVariant: ["tabular-nums"],
  },
  orbLabel: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 18 },
  statusTitle: {
    color: colors.text,
    fontFamily: fonts.display,
    fontSize: 28,
    lineHeight: 34,
    textAlign: "center",
  },
  actions: { alignSelf: "stretch", gap: 12, marginTop: 8 },
  danger: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: colors.dangerButton,
    boxShadow: "0px 14px 34px -14px #EF4444",
  },
  inline: { flexDirection: "row", gap: 8, alignSelf: "stretch" },
  add: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  link: { minHeight: 44, justifyContent: "center" },
});
