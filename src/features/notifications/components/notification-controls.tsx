"use client";

import { BellIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { getPushSubscriptionState, removePushSubscription, savePushSubscription } from "../actions";
import {
  applicationServerKey,
  needsIosInstall,
  reconcileBrowserPush,
  registerNotificationWorker,
} from "../browser";
import type { NotificationError } from "../state";

type Mode =
  | "checking"
  | "demo"
  | "unconfigured"
  | "unsupported"
  | "install"
  | "denied"
  | "off"
  | "on"
  | "error";

export function NotificationControls({
  configured,
  pushConfigured,
  publicKey,
  userId,
}: {
  configured: boolean;
  pushConfigured: boolean;
  publicKey: string;
  userId: string | null;
}) {
  const t = useTranslations("notifications");
  const [mode, setMode] = useState<Mode>("checking");
  const [busy, setBusy] = useState<"enable" | "disable" | null>(null);
  const [error, setError] = useState<NotificationError | "browserFailed" | null>(null);
  const refreshSequence = useRef(0);
  const active = useRef(false);

  const refresh = useCallback(async () => {
    const sequence = ++refreshSequence.current;
    const isCurrent = () => active.current && refreshSequence.current === sequence;
    if (!configured) {
      setMode("demo");
      return;
    }
    if (!userId) {
      setMode("error");
      setError("login");
      return;
    }
    if (!pushConfigured) {
      setMode("unconfigured");
      return;
    }
    if (needsIosInstall()) {
      setMode("install");
      return;
    }
    if (
      !window.isSecureContext ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    ) {
      setMode("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setMode("denied");
      return;
    }
    try {
      await registerNotificationWorker();
      if (!isCurrent()) return;
      const state = await reconcileBrowserPush(getPushSubscriptionState, isCurrent);
      if (!isCurrent() || state.state === "cancelled") return;
      if (state.state === "error") {
        setError(state.error);
        setMode("error");
        return;
      }
      setError(null);
      setMode(state.state === "owned" && Notification.permission === "granted" ? "on" : "off");
    } catch {
      if (!isCurrent()) return;
      setMode("error");
      setError("browserFailed");
    }
  }, [configured, pushConfigured, userId]);

  useEffect(() => {
    active.current = true;
    setMode("checking");
    void refresh();
    const onFocus = () => {
      if (active.current) void refresh();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      active.current = false;
      refreshSequence.current++;
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  async function enable() {
    setBusy("enable");
    setError(null);
    let created: PushSubscription | null = null;
    try {
      // Permission is requested directly from this tap, before any network or worker wait.
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setMode(permission === "denied" ? "denied" : "off");
        return;
      }
      const registration = await registerNotificationWorker();
      let subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        const state = await getPushSubscriptionState(subscription.endpoint);
        if (!state.ok) {
          setError(state.error);
          return;
        }
        if (!state.data.saved) {
          if (!(await subscription.unsubscribe())) throw new Error("unsubscribe_failed");
          subscription = null;
        }
      }
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey(publicKey),
        });
        created = subscription;
      }
      const saved = await savePushSubscription(subscription.toJSON());
      if (!saved.ok) {
        if (created) await created.unsubscribe();
        setError(saved.error);
        setMode("off");
        return;
      }
      setMode("on");
    } catch {
      if (created) await created.unsubscribe().catch(() => false);
      setError("browserFailed");
      setMode(Notification.permission === "denied" ? "denied" : "off");
    } finally {
      setBusy(null);
    }
  }

  async function disable() {
    setBusy("disable");
    setError(null);
    try {
      const registration = await registerNotificationWorker();
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        const removed = await removePushSubscription(subscription.endpoint);
        if (!removed.ok) {
          setError(removed.error);
          return;
        }
        setMode("off");
        if (!(await subscription.unsubscribe())) throw new Error("unsubscribe_failed");
      }
      setMode("off");
    } catch {
      setError("browserFailed");
    } finally {
      setBusy(null);
    }
  }

  const toggleable = mode === "on" || mode === "off";
  return (
    <section aria-labelledby="notification-title" className="glass grid rounded-lg">
      <div className="flex min-h-16 items-center gap-3 px-4 py-3">
        <BellIcon
          aria-hidden="true"
          weight="duotone"
          className="size-6 shrink-0 text-primary-text"
        />
        <div className="min-w-0 flex-1">
          <h2 id="notification-title" className="text-md font-bold">
            {t("title")}
          </h2>
          <p
            role="status"
            className={
              mode === "on" ? "text-sm text-primary-text" : "text-sm text-muted-foreground"
            }
          >
            {t(`status.${mode}`)}
          </p>
        </div>
        {toggleable ? (
          <Switch
            aria-label={t("title")}
            checked={mode === "on"}
            disabled={busy !== null}
            onCheckedChange={(on) => void (on ? enable() : disable())}
          />
        ) : mode === "error" ? (
          <Button size="sm" variant="secondary" className="min-h-11" onClick={() => void refresh()}>
            {t("retry")}
          </Button>
        ) : mode === "checking" || busy ? (
          <Spinner className="size-5" />
        ) : null}
      </div>
      {(mode === "install" || mode === "denied" || error) && (
        <div className="grid gap-2 border-t border-hairline px-4 py-3">
          {mode === "install" && (
            <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
              <li>{t("ios.openSafari")}</li>
              <li>{t("ios.share")}</li>
              <li>{t("ios.openHalo")}</li>
            </ol>
          )}
          {mode === "denied" && <p className="text-sm text-muted-foreground">{t("deniedHelp")}</p>}
          {error && (
            <p role="alert" className="text-sm text-destructive-text">
              {t(`errors.${error}`)}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
