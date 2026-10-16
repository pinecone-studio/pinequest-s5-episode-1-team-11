import { useEffect } from "react";
import { router } from "expo-router";
import * as Notifications from "expo-notifications";
import { eventIdOf, registerForPush } from "../lib/push";

/** Registers this phone for alerts after sign-in and opens the event a tapped alert points to. */
export function PushSetup() {
  const response = Notifications.useLastNotificationResponse();
  useEffect(() => {
    void registerForPush();
  }, []);
  useEffect(() => {
    const id = eventIdOf(response);
    if (id) router.push(`/events/${id}`);
  }, [response]);
  return null;
}
