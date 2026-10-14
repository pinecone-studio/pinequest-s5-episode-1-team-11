import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { supabase } from "./supabase";

const TOKEN_KEY = "halo.expoPushToken";

// Alerts must show even while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * on: this phone receives the family's alerts. unsupported: web, simulator or no EAS projectId
 * (remote push needs a development build, not Expo Go).
 */
export type PushState = "on" | "denied" | "unsupported" | "error";

export async function registerForPush(): Promise<PushState> {
  if (Platform.OS === "web" || !Device.isDevice) return "unsupported";
  if (Platform.OS === "android") {
    // Must match channelId in src/features/notifications/server/expo-push.ts.
    await Notifications.setNotificationChannelAsync("alerts", {
      name: "Halo дохио",
      importance: Notifications.AndroidImportance.MAX,
      sound: "default",
      vibrationPattern: [0, 400, 200, 400],
    });
  }
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") ({ status } = await Notifications.requestPermissionsAsync());
  if (status !== "granted") return "denied";
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return "unsupported";
  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    const { error } = await supabase.rpc("register_expo_push_token", { p_token: token });
    if (error) return "error";
    await AsyncStorage.setItem(TOKEN_KEY, token);
    return "on";
  } catch {
    return "error";
  }
}

/** Before sign-out, so the next account on this phone does not get the old family's alerts. */
export async function unregisterPush() {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (!token) return;
  await supabase.from("expo_push_tokens").delete().eq("token", token);
  await AsyncStorage.removeItem(TOKEN_KEY);
}

export function eventIdOf(response: Notifications.NotificationResponse | null | undefined) {
  const id = response?.notification.request.content.data?.eventId;
  return typeof id === "string" ? id : null;
}
