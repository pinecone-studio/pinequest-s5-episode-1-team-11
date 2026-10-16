import { useEffect, useState } from "react";
import { ActivityIndicator, AppState, Image, Text, View } from "react-native";
import { supabase } from "../lib/supabase";
import { Button, colors, styles } from "./ui";

export function Snapshot({
  path,
  compact = false,
}: {
  path: string | null;
  compact?: boolean;
}) {
  const [attempt, setAttempt] = useState(0);
  return (
    <SnapshotContent
      key={`${path ?? "none"}:${attempt}`}
      path={path}
      compact={compact}
      onRetry={() => setAttempt((n) => n + 1)}
    />
  );
}

function SnapshotContent({
  path,
  onRetry,
  compact,
}: {
  path: string | null;
  onRetry: () => void;
  compact: boolean;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!path);
  const [error, setError] = useState(false);
  useEffect(() => {
    let alive = true;
    let ticket = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (!path) return;
    async function sign() {
      const current = ++ticket;
      try {
        const { data, error: storageError } = await supabase.storage
          .from("event-snapshots")
          .createSignedUrl(path!, 60);
        if (storageError || !data) throw storageError;
        if (alive && current === ticket) {
          setUrl(data.signedUrl);
          setError(false);
        }
      } catch {
        if (alive && current === ticket) {
          setUrl(null);
          setError(true);
        }
      } finally {
        if (alive && current === ticket) {
          setLoading(false);
          if (AppState.currentState === "active")
            timer = setTimeout(() => {
              void sign();
            }, 50_000);
        }
      }
    }
    void sign();
    const listener = AppState.addEventListener("change", (state) => {
      clearTimeout(timer);
      if (state === "active") {
        setLoading(true);
        void sign();
      } else ++ticket;
    });
    return () => {
      alive = false;
      ++ticket;
      clearTimeout(timer);
      listener.remove();
    };
  }, [path]);
  return (
    <View
      style={[
        styles.card,
        {
          minHeight: compact ? 210 : 220,
          justifyContent: "center",
          backgroundColor: "#090F1C",
          padding: compact ? 8 : 16,
          borderRadius: 20,
        },
        compact && { borderWidth: 3, borderColor: "#42303A" },
      ]}
    >
      {!path ? (
        <Text style={styles.muted}>Энэ дохионы зураг байхгүй.</Text>
      ) : loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : error ? (
        <>
          <Text style={styles.muted}>Зургийг ачаалж чадсангүй.</Text>
          <Button secondary title="Зураг дахин ачаалах" onPress={onRetry} />
        </>
      ) : url ? (
        <Image
          source={{ uri: url }}
          accessibilityLabel="Дохио илэрсэн үеийн зураг"
          resizeMode="contain"
          style={{
            width: "100%",
            height: compact ? 214 : 240,
            borderRadius: 12,
          }}
          onError={() => setError(true)}
        />
      ) : null}
    </View>
  );
}
