import { getUser } from "@/lib/auth/session";
import { isSupabaseConfigured, publicEnv } from "@/lib/env";
import { isPushConfigured } from "../server/web-push";
import { NotificationControls } from "./notification-controls";

export async function NotificationSettings() {
  const user = isSupabaseConfigured ? await getUser() : null;
  return (
    <NotificationControls
      configured={isSupabaseConfigured}
      pushConfigured={isPushConfigured()}
      publicKey={publicEnv.vapidPublicKey ?? ""}
      userId={user?.id ?? null}
    />
  );
}
