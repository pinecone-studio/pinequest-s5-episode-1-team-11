import { useState } from "react";
import { Share, Text, TextInput, View } from "react-native";
import { registerForPush, type PushState } from "../lib/push";
import { supabase } from "../lib/supabase";
import { useData } from "../providers/HouseholdProvider";
import { Button, Card, colors, Problem, styles } from "./ui";

const SITE = process.env.EXPO_PUBLIC_SITE_URL ?? "https://halo-team11.vercel.app";
const pushText: Record<PushState, string> = {
  on: "Энэ утсанд дохио ирнэ.",
  denied: "Мэдэгдлийн зөвшөөрөл хаалттай. Утасны тохиргооноос Halo-д зөвшөөрөл өгнө үү.",
  unsupported: "Энэ төхөөрөмж эсвэл build push дэмжихгүй (Expo Go, simulator).",
  error: "Бүртгэж чадсангүй. Дахин оролдоно уу.",
};

export function NotificationsCard() {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <Card>
      <Text style={styles.heading}>Мэдэгдэл</Text>
      <Text style={styles.muted}>
        {state ? pushText[state] : "Уналт, дуу илэрвэл энэ утсанд шууд дохио ирнэ."}
      </Text>
      <Button
        title={state === "on" ? "Дахин шалгах" : "Мэдэгдэл асаах"}
        secondary={state === "on"}
        busy={busy}
        onPress={() => {
          setBusy(true);
          void registerForPush()
            .then(setState)
            .finally(() => setBusy(false));
        }}
      />
    </Card>
  );
}

/** Owner only: a six-digit code the camera (or the CCTV server) uses to join the family. */
export function AddCamera() {
  const data = useData();
  const [name, setName] = useState("IP камер");
  const [room, setRoom] = useState("");
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState<{ code: string; expires_at: string } | null>(null);
  const [error, setError] = useState("");
  async function create() {
    setBusy(true);
    setError("");
    const { data: rows, error: failed } = await supabase.rpc("create_pairing", {
      p_name: name.trim(),
      p_room_name: room.trim(),
      p_kind: "ip_camera",
    });
    setBusy(false);
    if (failed || !rows?.[0]) {
      setError(
        failed?.message.includes("Too many active pairing codes")
          ? "Идэвхтэй код хэт олон байна. Хэдэн минутын дараа оролдоно уу."
          : "Код үүсгэж чадсангүй.",
      );
      return;
    }
    setCode(rows[0]);
    void data.refresh();
  }
  return (
    <Card>
      <Text style={styles.heading}>Камер нэмэх</Text>
      {code ? (
        <View style={{ gap: 8 }}>
          <Text selectable style={[styles.title, { letterSpacing: 6 }]}>
            {code.code}
          </Text>
          <Text style={styles.muted}>
            Камерын горим эсвэл CCTV серверт энэ кодыг оруулна. Хүчинтэй:{" "}
            {new Date(code.expires_at).toLocaleTimeString("mn-MN", {
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            хүртэл.
          </Text>
          <Button title="Шинэ код" secondary onPress={() => setCode(null)} />
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          <TextInput
            accessibilityLabel="Камерын нэр"
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Камерын нэр"
            placeholderTextColor={colors.muted}
            maxLength={60}
          />
          <TextInput
            accessibilityLabel="Өрөө"
            style={styles.input}
            value={room}
            onChangeText={setRoom}
            placeholder="Өрөө (жишээ нь Зочны өрөө)"
            placeholderTextColor={colors.muted}
            maxLength={60}
          />
          <Button
            title="Код үүсгэх"
            busy={busy}
            disabled={!name.trim() || !room.trim()}
            onPress={() => void create()}
          />
        </View>
      )}
      {error ? <Problem text={error} /> : null}
    </Card>
  );
}

/** Owner only: shares a one-time link that adds a caregiver to the family. */
export function InviteCard() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function invite() {
    setBusy(true);
    setError("");
    const { data: rows, error: failed } = await supabase.rpc("create_invite");
    setBusy(false);
    const code = rows?.[0]?.code;
    if (failed || !code) {
      setError(
        failed?.message.includes("Too many active invites")
          ? "Идэвхтэй урилга хэт олон байна."
          : "Урилга үүсгэж чадсангүй.",
      );
      return;
    }
    await Share.share({
      message: `Halo-д нэгдэх урилга: ${SITE}/invite/${encodeURIComponent(code)}`,
    });
  }
  return (
    <Card>
      <Text style={styles.heading}>Асран хамгаалагч урих</Text>
      <Text style={styles.muted}>Нэг удаагийн холбоос үүсгээд илгээнэ.</Text>
      <Button title="Урилга илгээх" busy={busy} onPress={() => void invite()} />
      {error ? <Problem text={error} /> : null}
    </Card>
  );
}
