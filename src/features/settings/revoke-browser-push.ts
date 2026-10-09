"use client";

import { getPushSubscriptionState, removePushSubscription } from "@/features/notifications/actions";
import { unsubscribeBrowserPush } from "@/features/notifications/browser";

/** At least one revocation must succeed before this shared browser leaves the account. */
export async function revokeBrowserPush() {
  if (!("serviceWorker" in navigator)) return;
  const worker = await navigator.serviceWorker.getRegistration("/");
  const subscription = await worker?.pushManager?.getSubscription();
  if (!subscription) return;
  let revoked = false;
  try {
    const state = await getPushSubscriptionState(subscription.endpoint);
    if (state.ok && state.data.saved) {
      revoked = (await removePushSubscription(subscription.endpoint)).ok;
    }
  } catch {
    /* Local revocation can still succeed if the server is unavailable. */
  }
  try {
    await unsubscribeBrowserPush();
  } catch (error) {
    if (!revoked) throw error;
  }
}
