import { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SITE, supabase } from "../../lib/supabase";
import type { DetectionSettings } from "../../lib/types";
import { useData, useHomes } from "../../providers/HouseholdProvider";
import { PairingWait, type Pairing } from "../../components/PairingWait";
import { Rise } from "../../components/motion";
import { dateLabel } from "../../lib/events";
import {
  BackBar,
  Button,
  Card,
  DevicePill,
  kindLabel,
  colors,
  Loading,
  Problem,
  Screen,
  styles,
} from "../../components/ui";

const toggles = [
  ["fall", "Уналт"],
  ["distress", "Орилох, удаан уйлах"],
  ["hazard", "Шил хагарах, галын дохио"],
] as const;

type Form = {
  name: string;
  room: string;
  kind: string;
  settings: DetectionSettings;
};

export default function DeviceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useData();
  const [form, setForm] = useState<Form | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reconnect, setReconnect] = useState<Pairing | null>(null);
  const [reconnected, setReconnected] = useState(false);
  const device = data.devices.find((item) => item.id === id);
  const { household } = useHomes();

  useEffect(() => {
    void supabase
      .from("devices")
      .select("name, room_name, kind, settings")
      .eq("id", id)
      .maybeSingle()
      .then(({ data: row, error: failed }) => {
        if (failed || !row) return setError("Төхөөрөмж олдсонгүй.");
        setForm({
          name: row.name,
          room: row.room_name ?? "",
          kind: row.kind,
          settings: row.settings,
        });
      });
  }, [id]);

  async function save() {
    if (!form) return;
    setBusy(true);
    setError("");
    // shortcut: last write wins if two caregivers edit at once; add a version check if that bites.
    const { data: row, error: failed } = await supabase
      .from("devices")
      .update({
        name: form.name.trim(),
        room_name: form.room.trim(),
        settings: form.settings,
      })
      .eq("id", id)
      .select("id")
      .maybeSingle();
    setBusy(false);
    if (failed || !row) return setError("Хадгалж чадсангүй.");
    void data.refresh();
    router.back();
  }

  /** Same as the web: a QR that brings this camera back on a phone with its history. */
  async function startReconnect() {
    setError("");
    setReconnected(false);
    const { data: rows, error: failed } = await supabase.rpc(
      "create_reconnect_pairing",
      { p_device_id: id },
    );
    const row = rows?.[0];
    if (failed || !row) return setError("QR үүсгэж чадсангүй. Дахин оролдоно уу.");
    setReconnect({
      code: row.code,
      link: `${SITE}/monitor?code=${row.code}&reconnect=1`,
      expiresAt: row.expires_at,
    });
  }

  function remove() {
    Alert.alert(
      "Төхөөрөмж устгах",
      "Энэ камер салж, дахин холбохдоо шинэ код хэрэгтэй болно.",
      [
        { text: "Болих", style: "cancel" },
        {
          text: "Устгах",
          style: "destructive",
          onPress: () => {
            void supabase
              .from("devices")
              .delete()
              .eq("id", id)
              .select("id")
              .maybeSingle()
              .then(({ data: row, error: failed }) => {
                if (failed || !row) return setError("Устгаж чадсангүй.");
                void data.refresh();
                router.back();
              });
          },
        },
      ],
    );
  }

  if (!form)
    return error ? (
      <Screen>
        <View style={styles.content}>
          <Problem text={error} />
        </View>
      </Screen>
    ) : (
      <Loading />
    );
  const set = (patch: Partial<DetectionSettings>) =>
    setForm({ ...form, settings: { ...form.settings, ...patch } });
  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <BackBar title={form.name || "Төхөөрөмж"} />
        {device && (
          <Rise style={{ gap: 12 }}>
            <Text style={styles.muted}>
              {device.room_name || "Өрөө тодорхойгүй"} · {kindLabel[device.kind]}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <DevicePill device={device} />
              <Text style={[styles.muted, { fontSize: 13 }]}>
                Сүүлд холбогдсон ·{" "}
                {device.last_seen_at ? dateLabel(device.last_seen_at) : "Одоогоор холбогдоогүй"}
              </Text>
            </View>
          </Rise>
        )}
        {device?.status === "offline" && (
          <Rise index={1} style={[styles.card, { borderColor: `${colors.warningButton}40` }]}>
            <Text style={[styles.text, { color: colors.warning }]}>
              Камераас дор хаяж 90 секунд холболтын дохио ирээгүй байна. Холболт тасарсан үед шинэ
              анхааруулга илгээх боломжгүй.
            </Text>
            {device.kind !== "ip_camera" && (
              <Text style={[styles.muted, { fontSize: 13 }]}>
                Камерын утсаар доорх «QR-аар дахин холбох»-ыг уншуулахад өрөө, тохиргоо, түүхтэйгээ
                сэргэнэ.
              </Text>
            )}
          </Rise>
        )}
        {device && device.status !== "pairing" && (
          <Rise index={2} style={{ gap: 8 }}>
            <Button
              title="Шууд харах"
              disabled={device.status !== "online"}
              onPress={() => router.push(`/live/${id}`)}
            />
            <Text style={[styles.muted, { fontSize: 13 }]}>
              {device.status !== "online"
                ? "Камер онлайн байх үед шууд харах боломжтой."
                : device.kind === "ip_camera"
                  ? "Камерын дүрс, дууг одоо харна. Бичлэг хадгалагдахгүй; 10 минутын дараа өөрөө хаагдана."
                  : "Камерын дүрс, дууг одоо харна. Видео хадгалагдахгүй, камераас таны төхөөрөмж рүү шууд дамжина. Камерын дэлгэц дээр «харж байна» гэж гарна."}
            </Text>
          </Rise>
        )}
        {device && device.kind !== "ip_camera" && (
          <Rise index={3} style={{ gap: 8 }}>
            {reconnected ? (
              <Text style={[styles.badge, { textAlign: "center" }]}>Камер дахин холбогдлоо</Text>
            ) : reconnect && household ? (
              <PairingWait
                pairing={reconnect}
                householdId={household.id}
                title="QR-аар дахин холбох"
                body="Камерын утсан дээр камераа нээж энэ QR-ыг уншуулна уу. Эсвэл камерын хуудсанд кодыг оруулна."
                onPaired={() => {
                  setReconnect(null);
                  setReconnected(true);
                  void data.refresh();
                }}
                again={() => void startReconnect()}
              />
            ) : (
              <>
                <Button
                  title="QR-аар дахин холбох"
                  secondary
                  onPress={() => void startReconnect()}
                />
                <Text style={[styles.muted, { fontSize: 13 }]}>
                  Камерын утсаараа QR-ыг уншуулахад энэ камер өрөө, тохиргоо, түүхтэйгээ сэргэж
                  хяналт шууд эхэлнэ.
                </Text>
              </>
            )}
          </Rise>
        )}
        <Card>
          <Text style={styles.muted}>Нэр</Text>
          <TextInput
            accessibilityLabel="Нэр"
            style={styles.input}
            value={form.name}
            onChangeText={(name) => setForm({ ...form, name })}
            maxLength={60}
          />
          <Text style={styles.muted}>Өрөө</Text>
          <TextInput
            accessibilityLabel="Өрөө"
            style={styles.input}
            value={form.room}
            onChangeText={(room) => setForm({ ...form, room })}
            maxLength={60}
          />
        </Card>
        <Card>
          <Text style={styles.heading}>Юуг илрүүлэх</Text>
          {toggles.map(([key, label]) => (
            <View key={key} style={styles.row}>
              <Text style={[styles.text, { flex: 1 }]}>{label}</Text>
              <Switch
                accessibilityLabel={label}
                value={form.settings[key]}
                onValueChange={(on) => set({ [key]: on })}
                trackColor={{ true: colors.primaryButton }}
              />
            </View>
          ))}
        </Card>
        {error ? <Problem text={error} /> : null}
        <Button
          title="Хадгалах"
          busy={busy}
          disabled={!form.name.trim() || !form.room.trim()}
          onPress={() => void save()}
        />
        <Button title="Төхөөрөмж устгах" secondary onPress={remove} />
      </ScrollView>
    </Screen>
  );
}
