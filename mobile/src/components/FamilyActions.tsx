import { useState } from "react";
import { Linking, Share, Text, TextInput, View } from "react-native";
import { registerForPush, unregisterPush, type PushState } from "../lib/push";
import { SITE, supabase } from "../lib/supabase";
import { useData, useHomes } from "../providers/HouseholdProvider";
import { Button, Card, colors, Problem, styles } from "./ui";

const pushText: Record<PushState, string> = {
  on: "Энэ утсанд дохио ирнэ.",
  denied:
    "Мэдэгдлийн зөвшөөрөл хаалттай. Утасны тохиргооноос Halo-д зөвшөөрөл өгнө үү.",
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
        {state
          ? pushText[state]
          : "Уналт, дуу илэрвэл энэ утсанд шууд дохио ирнэ."}
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
  const [code, setCode] = useState<{ code: string; expires_at: string } | null>(
    null,
  );
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

/** After sign-up: the new user starts their own family and becomes its owner. */
export function CreateHousehold() {
  const homes = useHomes();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function create() {
    setBusy(true);
    setError("");
    const { error: failed } = await supabase.rpc("create_household", {
      p_name: name.trim(),
    });
    setBusy(false);
    if (failed) return setError("Гэр бүл үүсгэж чадсангүй.");
    homes.retry();
  }
  return (
    <Card>
      <Text style={styles.heading}>Гэр бүл үүсгэх</Text>
      <Text style={styles.muted}>
        Та гэр бүлийн эзэн болж камер нэмнэ. Өөр гэр бүлд нэгдэх бол эзнээс
        урилга авна уу.
      </Text>
      <TextInput
        accessibilityLabel="Гэр бүлийн нэр"
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Жишээ нь: Бат-Эрдэнийн гэр"
        placeholderTextColor={colors.muted}
        maxLength={60}
      />
      <Button
        title="Үүсгэх"
        busy={busy}
        disabled={!name.trim()}
        onPress={() => void create()}
      />
      {error ? <Problem text={error} /> : null}
    </Card>
  );
}

const CONFIRM = "УСТГАХ";

/**
 * Same order as the web: a sole owner revokes cameras and removes snapshots first; an owner with
 * caregivers must hand the family over on the web before leaving.
 */
export function DeleteAccount() {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function remove() {
    setBusy(true);
    setError("");
    const failed = await deleteAccount();
    setBusy(false);
    if (failed) setError(failed);
  }
  return (
    <Card>
      <Text style={styles.heading}>Бүртгэл устгах</Text>
      <Text style={styles.muted}>
        Буцаах боломжгүй. Та ганцаараа эзэн бол гэр бүл, камер, зургууд бүгд
        устна. Баталгаажуулахын тулд {CONFIRM} гэж бичнэ үү.
      </Text>
      <TextInput
        accessibilityLabel="Баталгаажуулах үг"
        style={styles.input}
        value={typed}
        onChangeText={setTyped}
        autoCapitalize="characters"
        placeholder={CONFIRM}
        placeholderTextColor={colors.muted}
      />
      <Button
        title="Бүртгэлээ устгах"
        secondary
        busy={busy}
        disabled={typed.trim() !== CONFIRM}
        onPress={() => void remove()}
      />
      {error ? <Problem text={error} /> : null}
    </Card>
  );
}

async function deleteAccount(): Promise<string | null> {
  const ownerFirst =
    "Эхлээд гэр бүлийн эзний эрхийг өөр асран хамгаалагчид web-ээс шилжүүлнэ үү.";
  const cleanup = await supabase.rpc("begin_account_cleanup");
  if (cleanup.error) {
    if (cleanup.error.message.includes("Transfer household ownership"))
      return ownerFirst;
    if (!cleanup.error.message.includes("Owner access required"))
      return "Устгаж чадсангүй.";
  } else if (cleanup.data) {
    if (!(await removeSnapshots(cleanup.data)))
      return "Зургуудыг устгаж чадсангүй. Дахин оролдоно уу.";
    if ((await supabase.rpc("finish_account_cleanup")).error)
      return "Устгаж чадсангүй.";
  }
  await unregisterPush().catch(() => undefined);
  const { error } = await supabase.rpc("delete_my_account");
  if (error)
    return error.message.includes("Transfer household ownership")
      ? ownerFirst
      : "Устгаж чадсангүй.";
  await supabase.auth.signOut({ scope: "local" });
  return null;
}

async function removeSnapshots(householdId: string) {
  const bucket = supabase.storage.from("event-snapshots");
  for (let round = 0; round < 50; round++) {
    const { data, error } = await bucket.list(householdId, { limit: 100 });
    if (error) return false;
    if (!data.length) return true;
    const removed = await bucket.remove(
      data.map((file) => `${householdId}/${file.name}`),
    );
    if (removed.error) return false;
  }
  return false;
}

/** Joins a family from an invite link or its code (the same link the web accepts). */
export function JoinFamily() {
  const homes = useHomes();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function join() {
    const code = value.match(/[a-f0-9]{32}/)?.[0];
    if (!code)
      return setError("Урилгын холбоос эсвэл кодоо бүтнээр нь оруулна уу.");
    setBusy(true);
    setError("");
    const { error: failed } = await supabase.rpc("accept_invite", {
      p_code: code,
    });
    setBusy(false);
    if (!failed) return homes.retry();
    const message = failed.message;
    setError(
      message.includes("expired or already used")
        ? "Урилгын хугацаа дууссан эсвэл ашиглагдсан байна."
        : message.includes("already belongs to a household")
          ? "Та өөр гэр бүлд бүртгэлтэй байна."
          : "Урилга буруу байна.",
    );
  }
  return (
    <Card>
      <Text style={styles.heading}>Урилгаар нэгдэх</Text>
      <TextInput
        accessibilityLabel="Урилгын холбоос"
        style={styles.input}
        value={value}
        onChangeText={setValue}
        placeholder="Урилгын холбоос эсвэл код"
        placeholderTextColor={colors.muted}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Button
        title="Нэгдэх"
        busy={busy}
        disabled={!value.trim()}
        onPress={() => void join()}
      />
      {error ? <Problem text={error} /> : null}
    </Card>
  );
}

/** The camera mode is the web's /monitor page (on-device AI in the browser), opened as is. */
export function CameraModeCard() {
  return (
    <Card>
      <Text style={styles.heading}>Энэ утсыг камер болгох</Text>
      <Text style={styles.muted}>
        Камерын горим browser дээр ажиллана. Нээгээд «Камер нэмэх» кодоо
        оруулна.
      </Text>
      <Button
        title="Камерын горим нээх"
        secondary
        onPress={() => void Linking.openURL(`${SITE}/monitor`)}
      />
    </Card>
  );
}
