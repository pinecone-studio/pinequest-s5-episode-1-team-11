import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key || !key.startsWith("sb_publishable_")) {
  throw new Error(
    "mobile/.env дотор Supabase URL болон publishable key оруулна уу.",
  );
}

/** Web app: email links, invites and password reset open there. */
export const SITE =
  process.env.EXPO_PUBLIC_SITE_URL ?? "https://halo-team11.vercel.app";

const isServer = Platform.OS === "web" && typeof window === "undefined";

export const supabase = createClient<Database>(url, key, {
  auth: {
    ...(Platform.OS !== "web" ? { storage: AsyncStorage } : {}),
    persistSession: !isServer,
    autoRefreshToken: !isServer,
    detectSessionInUrl: false,
  },
});
