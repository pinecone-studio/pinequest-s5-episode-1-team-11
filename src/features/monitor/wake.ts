"use client";

import { applicationServerKey, registerNotificationWorker } from "@/features/notifications/browser";
import { publicEnv } from "@/lib/env";

/**
 * Lets the server wake this camera after its page is closed: the phone gets a notification that
 * reopens /monitor. Call from a tap (the permission prompt needs a user gesture). Best effort.
 */
export async function enableCameraWake(deviceToken: string): Promise<boolean> {
  const key = publicEnv.vapidPublicKey;
  if (!key || !("serviceWorker" in navigator) || !("PushManager" in window)) return false;
  if (!("Notification" in window) || Notification.permission === "denied") return false;
  try {
    const permission =
      Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
    if (permission !== "granted") return false;
    const registration = await registerNotificationWorker();
    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey(key),
      }));
    const response = await fetch("/api/v1/devices/push", {
      method: "POST",
      cache: "no-store",
      headers: { authorization: `Bearer ${deviceToken}`, "content-type": "application/json" },
      body: JSON.stringify(subscription.toJSON()),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/** Reopening a paired camera should not need another tap when the browser already allows it. */
export async function cameraAllowed(): Promise<boolean> {
  try {
    const status = await navigator.permissions.query({ name: "camera" as PermissionName });
    return status.state === "granted";
  } catch {
    return false;
  }
}
