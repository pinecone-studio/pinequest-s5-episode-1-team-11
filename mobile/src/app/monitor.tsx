import { useKeepAwake } from "expo-keep-awake";
import { useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { WebView } from "react-native-webview";
import { SITE } from "../lib/supabase";
import { BackBar, Screen, styles } from "../components/ui";

/**
 * Camera mode inside the app: the web's /monitor (the AI runs in the page) in a WebView, so this
 * phone never leaves Halo for the browser. The screen stays awake while it watches.
 */
export default function MonitorScreen() {
  useKeepAwake();
  const { code, reconnect } = useLocalSearchParams<{ code?: string; reconnect?: string }>();
  const url = new URL("/monitor", SITE);
  if (code && /^\d{6}$/.test(code)) url.searchParams.set("code", code);
  if (reconnect) url.searchParams.set("reconnect", "1");
  return (
    <Screen>
      <View style={{ paddingHorizontal: 20, paddingVertical: 8 }}>
        <BackBar title="Камерын горим" close />
      </View>
      <WebView
        source={{ uri: url.toString() }}
        style={[styles.fill, { backgroundColor: "#000" }]}
        originWhitelist={[SITE]}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        // Camera and microphone only for Halo's own page; the app's OS permission still applies.
        mediaCapturePermissionGrantType="grantIfSameHostElsePrompt"
      />
    </Screen>
  );
}
