import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Share, Text, View } from "react-native";
import { qrRuns } from "../lib/qr";
import { supabase } from "../lib/supabase";
import { haptic, Rise } from "./motion";
import { Button, colors, fonts, styles } from "./ui";

export type Pairing = { code: string; link: string; expiresAt: string };

/**
 * A pairing or reconnect code, as on the web: QR for the camera phone to scan, the six digits,
 * the time left, and a poll every 2 s until the camera claims the code.
 */
export function PairingWait({
  pairing,
  householdId,
  title,
  body,
  onPaired,
  again,
}: {
  pairing: Pairing;
  householdId: string;
  title: string;
  body: string;
  onPaired: (deviceId: string) => void;
  again: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const remaining = Math.max(0, Math.ceil((Date.parse(pairing.expiresAt) - now) / 1000));
  const expired = remaining === 0;
  useEffect(() => {
    if (expired) return;
    let done = false;
    const timer = setInterval(() => {
      setNow(Date.now());
      void supabase
        .from("pairing_codes")
        .select("device_id")
        .eq("code", pairing.code)
        .eq("household_id", householdId)
        .maybeSingle()
        .then(({ data }) => {
          if (done || !data?.device_id) return;
          done = true;
          haptic.done();
          onPaired(data.device_id);
        });
    }, 2000);
    return () => {
      done = true;
      clearInterval(timer);
    };
  }, [expired, pairing.code, householdId, onPaired]);
  return (
    <Rise style={[styles.card, { alignItems: "center", gap: 12, paddingVertical: 24 }]}>
      <Text style={[styles.heading, { textAlign: "center" }]}>
        {expired ? "Кодын хугацаа дууссан" : title}
      </Text>
      <Text style={[styles.muted, { textAlign: "center" }]}>
        {expired
          ? "Камераа холбохын тулд шинэ код үүсгээрэй. Код нэг удаа, арван минутын турш хүчинтэй."
          : body}
      </Text>
      {!expired && <Qr value={pairing.link} />}
      <Text style={styles.muted}>Холбох код</Text>
      <Text
        selectable
        style={{ color: colors.text, fontFamily: fonts.display, fontSize: 36, letterSpacing: 4 }}
      >
        {pairing.code.slice(0, 3)} {pairing.code.slice(3)}
      </Text>
      {expired ? (
        <View style={{ alignSelf: "stretch" }}>
          <Button title="Шинэ код үүсгэх" onPress={again} />
        </View>
      ) : (
        <>
          <Text style={[styles.muted, { fontVariant: ["tabular-nums"] }]}>
            Кодын хугацаа {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}{" "}
            үлдлээ
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.muted}>Камер холбогдохыг хүлээж байна…</Text>
          </View>
          <View style={{ alignSelf: "stretch", gap: 12 }}>
            <Button
              title="Камерын холбоос илгээх"
              secondary
              onPress={() => void Share.share({ message: pairing.link })}
            />
            <Button
              title="Энэ утсыг камер болгох"
              textOnly
              onPress={() =>
                router.push({
                  pathname: "/monitor",
                  params: {
                    code: pairing.code,
                    ...(pairing.link.includes("reconnect") && { reconnect: "1" }),
                  },
                })
              }
            />
          </View>
        </>
      )}
    </Rise>
  );
}

/** QR drawn with plain views (one per dark run), on white with a quiet zone, like the web's. */
function Qr({ value }: { value: string }) {
  const { size, runs } = qrRuns(value);
  const cell = Math.floor(220 / (size + 8));
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="Камер холбох QR код"
      style={{
        width: cell * (size + 8),
        height: cell * (size + 8),
        borderRadius: 16,
        backgroundColor: "#FFFFFF",
      }}
    >
      {runs.map(([x, y, length]) => (
        <View
          key={`${x}:${y}`}
          style={{
            position: "absolute",
            left: (x + 4) * cell,
            top: (y + 4) * cell,
            width: length * cell,
            height: cell,
            backgroundColor: "#0A1226",
          }}
        />
      ))}
    </View>
  );
}
