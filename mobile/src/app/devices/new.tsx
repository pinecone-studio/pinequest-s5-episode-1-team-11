import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useState } from "react";
import {
  Pressable,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
} from "react-native";
import { haptic, Rise, SlidingPill } from "../../components/motion";
import { PairingWait, type Pairing } from "../../components/PairingWait";
import { SITE, supabase } from "../../lib/supabase";
import type { Device } from "../../lib/types";
import { useData, useHomes } from "../../providers/HouseholdProvider";
import {
  BackBar,
  Button,
  Card,
  colors,
  fonts,
  kindLabel,
  Problem,
  Screen,
  styles,
} from "../../components/ui";

type Kind = Device["kind"];
const kinds: Kind[] = ["phone", "laptop", "ip_camera"];
type Cctv = { deviceId: string; server: string; streamKey: string };
const limit = "Танай гэр бүлд таван идэвхтэй код байна. Аль нэгийг нь ашиглах эсвэл хугацаа нь дуусахыг хүлээгээрэй.";

/**
 * The web's "add camera": a phone or laptop gets a six-digit code and the page waits until it
 * connects; an IP camera is paired by the camera server, which answers what to type into it.
 */
export default function NewDeviceScreen() {
  const data = useData();
  const { household } = useHomes();
  const [kind, setKind] = useState<Kind>("phone");
  const [width, setWidth] = useState(0);
  const [name, setName] = useState("");
  const [room, setRoom] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pairing, setPairing] = useState<Pairing | null>(null);
  const [cctv, setCctv] = useState<Cctv | null>(null);
  const [paired, setPaired] = useState<string | null>(null);

  async function create() {
    setBusy(true);
    setError("");
    const result =
      kind === "ip_camera"
        ? await addCctv(name.trim(), room.trim())
        : await addPhone(kind, name.trim(), room.trim());
    setBusy(false);
    if (typeof result === "string") return setError(result);
    if ("server" in result) setCctv(result);
    else setPairing(result);
    void data.refresh();
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        <BackBar title="Камер нэмэх" />
        <Text style={styles.muted}>Утас, компьютер эсвэл IP камераа холбоорой</Text>
        {cctv ? (
          <CctvResult camera={cctv} />
        ) : paired ? (
          <Rise style={[styles.card, { alignItems: "center", gap: 12, paddingVertical: 24 }]}>
            <Ionicons name="checkmark-circle" size={64} color={colors.primary} />
            <Text accessibilityRole="header" style={styles.heading}>
              Камер холбогдлоо
            </Text>
            <Text style={[styles.muted, { textAlign: "center" }]}>
              {name.trim()} танай гэр бүлд холбогдлоо. Камер болох төхөөрөмж дээр камер,
              микрофоны зөвшөөрөл өгч хяналтыг эхлүүлээрэй.
            </Text>
            <View style={{ alignSelf: "stretch" }}>
              <Button
                title="Камерын тохиргоо"
                onPress={() => router.replace(`/devices/${paired}`)}
              />
            </View>
          </Rise>
        ) : pairing && household ? (
          <PairingWait
            pairing={pairing}
            householdId={household.id}
            title="Камер болох төхөөрөмжөө холбоорой"
            body="Камер болох утас эсвэл компьютерээр QR код уншуулна уу. Эсвэл тэр төхөөрөмж дээр Камерын горимыг нээж зургаан оронтой кодыг оруулаарай."
            onPaired={setPaired}
            again={() => {
              setPairing(null);
              void create();
            }}
          />
        ) : (
          <Rise style={{ gap: 16 }}>
            <View
              accessibilityRole="tablist"
              onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
              style={[styles.card, { flexDirection: "row", padding: 4, borderRadius: 26 }]}
            >
              <SlidingPill
                index={kinds.indexOf(kind)}
                count={kinds.length}
                width={width}
                inset={4}
                radius={22}
              />
              {kinds.map((key) => (
                <Pressable
                  key={key}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: kind === key }}
                  onPress={() => {
                    if (kind !== key) haptic.tick();
                    setKind(key);
                  }}
                  style={{ flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center" }}
                >
                  <Text
                    style={{
                      color: kind === key ? colors.text : colors.muted,
                      fontFamily: fonts.bold,
                      fontSize: 13,
                    }}
                  >
                    {kindLabel[key]}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={{ gap: 8 }}>
              <Text style={styles.text}>Камерын нэр</Text>
              <TextInput
                accessibilityLabel="Камерын нэр"
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Зочны өрөөний утас"
                placeholderTextColor={colors.muted}
                maxLength={60}
                editable={!busy}
              />
            </View>
            <View style={{ gap: 8 }}>
              <Text style={styles.text}>Өрөө</Text>
              <TextInput
                accessibilityLabel="Өрөө"
                style={styles.input}
                value={room}
                onChangeText={setRoom}
                placeholder="Зочны өрөө"
                placeholderTextColor={colors.muted}
                maxLength={60}
                editable={!busy}
              />
            </View>
            {kind === "ip_camera" && (
              <Text style={[styles.muted, { fontSize: 13 }]}>
                IP камерыг Halo-гийн камерын сервер холбоно. Дараа нь камерын тохиргоонд бичих
                хаягийг харуулна.
              </Text>
            )}
            {error ? <Problem text={error} /> : null}
            <Button
              title="Холбох код үүсгэх"
              busy={busy}
              disabled={!name.trim() || !room.trim()}
              onPress={() => void create()}
            />
          </Rise>
        )}
        <Card>
          <Text style={styles.heading}>Эхлэхийн өмнө</Text>
          {[
            "Камертаа нэр өгөөд байрлуулах өрөөг нь сонгоорой.",
            "Камер болох төхөөрөмж дээр холбох холбоосыг нээгээрэй.",
            "Камер, микрофоны зөвшөөрөл өгнө. Цэнэглэгчид залгаж, дэлгэцийг асаалттай байлгаарай.",
          ].map((step, index) => (
            <Text key={step} style={styles.muted}>
              {index + 1}. {step}
            </Text>
          ))}
        </Card>
      </ScrollView>
    </Screen>
  );
}

function CctvResult({ camera }: { camera: Cctv }) {
  return (
    <Rise style={[styles.card, { gap: 12 }]}>
      <Text style={styles.heading}>Камерын тохиргоонд бичнэ</Text>
      <Text style={styles.muted}>
        VIGI: Settings → Network Settings → Advanced → RTMP. Main stream: H.264. Камер дүрсээ
        илгээж эхлэхэд онлайн болно.
      </Text>
      {(
        [
          ["Server Address", camera.server],
          ["Stream Key", camera.streamKey],
        ] as const
      ).map(([label, value]) => (
        <View key={label} style={{ gap: 6 }}>
          <Text style={styles.muted}>{label}</Text>
          <Text selectable style={[styles.text, { fontSize: 14 }]}>
            {value}
          </Text>
        </View>
      ))}
      <Button
        title="Тохиргоог илгээх"
        secondary
        onPress={() =>
          void Share.share({
            message: `Server Address: ${camera.server}\nStream Key: ${camera.streamKey}`,
          })
        }
      />
      <Button title="Камерын тохиргоо" onPress={() => router.replace(`/devices/${camera.deviceId}`)} />
    </Rise>
  );
}

async function addCctv(name: string, roomName: string): Promise<Cctv | string> {
  const { data } = await supabase.auth.getSession();
  const response = await fetch(`${SITE}/api/v1/app/cctv`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${data.session?.access_token ?? ""}`,
    },
    body: JSON.stringify({ name, roomName }),
  }).catch(() => null);
  if (!response) return "Холбогдож чадсангүй. Интернэтээ шалгана уу.";
  if (response.status === 429) return limit;
  if (response.status === 403) return "Камерыг зөвхөн гэр бүлийн эзэн нэмнэ.";
  if (!response.ok) return "Камерын сервер хариу өгсөнгүй. Түр хүлээгээд дахин оролдоорой.";
  return (await response.json()) as Cctv;
}

async function addPhone(kind: Kind, name: string, roomName: string): Promise<Pairing | string> {
  const { data: rows, error } = await supabase.rpc("create_pairing", {
    p_name: name,
    p_room_name: roomName,
    p_kind: kind,
  });
  const row = rows?.[0];
  if (error || !row)
    return error?.message.includes("Too many active pairing codes")
      ? limit
      : "Хүсэлтийг гүйцэтгэж чадсангүй. Холболтоо шалгаад дахин оролдоорой.";
  return {
    code: row.code,
    link: `${SITE}/monitor?code=${row.code}`,
    expiresAt: row.expires_at,
  };
}
