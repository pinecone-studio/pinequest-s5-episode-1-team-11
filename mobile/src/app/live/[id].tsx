import { useEffect, useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { WebView } from "react-native-webview";
import { SITE, supabase } from "../../lib/supabase";
import { BackBar, Loading, Problem, Screen, styles } from "../../components/ui";

/**
 * Live view. The app asks Halo, with its own sign-in, how to reach the camera (a short-lived WHEP
 * token for CCTV, the broadcast channel for a phone or laptop), then shows the web's /watch player,
 * so the web and the app play cameras with the same code.
 */
export default function LiveScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [page, setPage] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      const response = await fetch(`${SITE}/api/v1/app/devices/${id}/stream`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${data.session?.access_token ?? ""}`,
        },
      }).catch(() => null);
      const stream = response?.ok
        ? ((await response.json()) as
            | { whep: string; token: string }
            | { channel: string })
        : null;
      if (!alive) return;
      if (!stream)
        return setError("Холбогдож чадсангүй. Сүлжээгээ шалгаад дахин оролдоно уу.");
      setPage(`${SITE}/watch#${new URLSearchParams(stream)}`);
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  return (
    <Screen>
      <View style={[styles.fill, { gap: 8 }]}>
        <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
          <BackBar title="Live" close />
        </View>
        {error ? (
          <View style={styles.content}>
            <Problem text={error} />
          </View>
        ) : page ? (
          <WebView
            source={{ uri: page }}
            style={[styles.fill, { backgroundColor: "#000" }]}
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            originWhitelist={[SITE]}
          />
        ) : (
          <Loading />
        )}
      </View>
    </Screen>
  );
}
