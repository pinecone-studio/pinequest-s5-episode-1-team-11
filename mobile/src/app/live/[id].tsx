import { useEffect, useState } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { WebView } from "react-native-webview";
import { SITE, supabase } from "../../lib/supabase";
import { Button, Loading, Problem, Screen, styles } from "../../components/ui";

/**
 * Live CCTV view. The app asks Halo for a short-lived token with its own sign-in, then shows the
 * web's /watch player, so the web and the app play cameras with the same code.
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
        ? ((await response.json()) as { whep: string; token: string })
        : null;
      if (!alive) return;
      if (!stream) return setError("Камертай холбогдож чадсангүй.");
      const hash = new URLSearchParams({
        whep: stream.whep,
        token: stream.token,
      });
      setPage(`${SITE}/watch#${hash}`);
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  return (
    <Screen>
      <View style={[styles.fill, { gap: 8 }]}>
        <Button title="Хаах" textOnly onPress={() => router.back()} />
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
