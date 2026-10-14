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

type Kind = "ip_camera" | "phone" | "laptop";
const kinds: [Kind, string][] = [
  ["ip_camera", "IP камер"],
  ["phone", "Утас"],
  ["laptop", "Laptop"],
];
type Added =
  | { kind: "ip_camera"; server: string; streamKey: string }
  | { kind: "phone" | "laptop"; code: string; link: string; expiresAt: string };

/**
 * Owner only. An IP camera is paired by the camera server, which answers with what to type into
 * the camera; a phone or laptop opens the web camera mode with a six-digit code.
 */
export function AddCamera() {
  const data = useData();
  const [kind, setKind] = useState<Kind>("ip_camera");
  const [name, setName] = useState("");
  const [room, setRoom] = useState("");
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState<Added | null>(null);
  const [error, setError] = useState("");

  async function create() {
    setBusy(true);
    setError("");
    const result =
      kind === "ip_camera"
        ? await addCctv(name.trim(), room.trim())
        : await addPhone(kind, name.trim(), room.trim());
    setBusy(false);
    if (typeof result === "string") return setError(result);
    setAdded(result);
    void data.refresh();
  }

  if (added)
    return (
      <Card>
        <Text style={styles.heading}>Камер нэмэгдлээ</Text>
        {added.kind === "ip_camera" ? (
          <View style={{ gap: 8 }}>
            <Text style={styles.muted}>
              Камерын тохиргоонд (VIGI: Settings → Network Settings → Advanced →
              RTMP) бичнэ:
            </Text>
            <Text style={styles.muted}>Server Address</Text>
            <Text selectable style={styles.text}>
              {added.server}
            </Text>
            <Text style={styles.muted}>Stream Key</Text>
            <Text selectable style={styles.text}>
              {added.streamKey}
            </Text>
            <Button
              title="Тохиргоог илгээх"
              secondary
              onPress={() =>
                void Share.share({
                  message: `Server Address: ${added.server}\nStream Key: ${added.streamKey}`,
                })
              }
            />
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            <Text selectable style={[styles.title, { letterSpacing: 6 }]}>
              {added.code}
            </Text>
            <Text style={styles.muted}>
              Камер болох {added.kind === "phone" ? "утсанд" : "laptop-д"} энэ
              холбоосыг нээнэ. Хүчинтэй:{" "}
              {new Date(added.expiresAt).toLocaleTimeString("mn-MN", {
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              хүртэл.
            </Text>
            <Text selectable style={styles.text}>
              {added.link}
            </Text>
            <Button
              title="Холбоос илгээх"
              secondary
              onPress={() => void Share.share({ message: added.link })}
            />
          </View>
        )}
        <Button title="Дахин нэмэх" secondary onPress={() => setAdded(null)} />
      </Card>
    );
  return (
    <Card>
      <Text style={styles.heading}>Камер нэмэх</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {kinds.map(([key, label]) => (
          <View key={key} style={{ flex: 1 }}>
            <Button
              title={label}
              secondary={kind !== key}
              onPress={() => setKind(key)}
            />
          </View>
        ))}
      </View>
      <TextInput
        accessibilityLabel="Нэр"
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder={
          kind === "ip_camera"
            ? "Нэр (жишээ нь Зочны өрөөний камер)"
            : "Нэр (жишээ нь Хуучин утас)"
        }
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
        title="Нэмэх"
        busy={busy}
        disabled={!name.trim() || !room.trim()}
        onPress={() => void create()}
      />
      {error ? <Problem text={error} /> : null}
    </Card>
  );
}

async function addCctv(
  name: string,
  roomName: string,
): Promise<Added | string> {
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
  if (response.status === 429)
    return "Идэвхтэй код хэт олон байна. Хэдэн минутын дараа оролдоно уу.";
  if (response.status === 403) return "Камерыг зөвхөн гэр бүлийн эзэн нэмнэ.";
  if (!response.ok)
    return "Камерын сервер хариу өгсөнгүй. Түр хүлээгээд дахин оролдоно уу.";
  const camera = (await response.json()) as {
    server: string;
    streamKey: string;
  };
  return { kind: "ip_camera", ...camera };
}

async function addPhone(
  kind: "phone" | "laptop",
  name: string,
  roomName: string,
): Promise<Added | string> {
  const { data: rows, error } = await supabase.rpc("create_pairing", {
    p_name: name,
    p_room_name: roomName,
    p_kind: kind,
  });
  const row = rows?.[0];
  if (error || !row)
    return error?.message.includes("Too many active pairing codes")
      ? "Идэвхтэй код хэт олон байна. Хэдэн минутын дараа оролдоно уу."
      : "Код үүсгэж чадсангүй.";
  return {
    kind,
    code: row.code,
    link: `${SITE}/monitor?code=${row.code}`,
    expiresAt: row.expires_at,
  };
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
