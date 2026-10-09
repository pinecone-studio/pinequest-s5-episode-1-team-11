"use client";

import type { NotificationActionResult, NotificationError } from "./state";

let registrationPromise: Promise<ServiceWorkerRegistration> | null = null;

export type PushReconciliation =
  | { state: "none" | "owned" | "removed" | "cancelled" }
  | { state: "error"; error: NotificationError | "browserFailed" };

/** Check ownership before treating a shared browser's existing subscription as this account's. */
export async function reconcileBrowserPush(
  lookup: (endpoint: string) => Promise<NotificationActionResult<{ saved: boolean }>>,
  isCurrent: () => boolean = () => true,
): Promise<PushReconciliation> {
  if (!("serviceWorker" in navigator)) return { state: "none" };
  try {
    const registration = await navigator.serviceWorker.getRegistration("/");
    if (!isCurrent()) return { state: "cancelled" };
    const subscription = await registration?.pushManager?.getSubscription();
    if (!isCurrent()) return { state: "cancelled" };
    if (!subscription) return { state: "none" };
    const ownership = await lookup(subscription.endpoint);
    if (!isCurrent()) return { state: "cancelled" };
    if (ownership.ok && ownership.data.saved) return { state: "owned" };
    // An expired session must stop its browser alerts. An uncertain network/database result must
    // remain visible as an error instead of being presented as an unsubscribed account.
    if (!ownership.ok && ownership.error !== "login") {
      return { state: "error", error: ownership.error };
    }
    // Use this captured object: an awaited ownership check can outlive a newer subscription.
    await subscription.unsubscribe();
    if (!isCurrent()) return { state: "cancelled" };
    const remaining = await registration?.pushManager?.getSubscription();
    if (!isCurrent()) return { state: "cancelled" };
    if (!remaining) return { state: "removed" };
    return {
      state: "error",
      error: remaining.endpoint === subscription.endpoint ? "browserFailed" : "stateFailed",
    };
  } catch {
    return isCurrent() ? { state: "error", error: "browserFailed" } : { state: "cancelled" };
  }
}

export function registerNotificationWorker() {
  if (!registrationPromise) {
    registrationPromise = navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then(async () => {
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
          return await Promise.race([
            navigator.serviceWorker.ready,
            new Promise<never>((_, reject) => {
              timer = setTimeout(() => reject(new Error("worker_not_ready")), 10_000);
            }),
          ]);
        } finally {
          clearTimeout(timer);
        }
      })
      .catch((error: unknown) => {
        registrationPromise = null;
        throw error;
      });
  }
  return registrationPromise;
}

/** Account actions call this before leaving the account so a shared browser cannot receive its alerts. */
export async function unsubscribeBrowserPush(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration("/");
  const subscription = await registration?.pushManager?.getSubscription();
  if (subscription && !(await subscription.unsubscribe())) {
    throw new Error("unsubscribe_failed");
  }
}

export function applicationServerKey(value: string): ArrayBuffer {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const decoded = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0)).buffer;
}

export function needsIosInstall() {
  const ios =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone;
  return ios && !standalone;
}
