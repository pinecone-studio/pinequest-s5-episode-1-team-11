"use client";

import { BellIcon, BellSlashIcon, PaperPlaneTiltIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  getPushSubscriptionState,
  removePushSubscription,
  savePushSubscription,
  sendTestNotification,
} from "../actions";
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
  const [busy, setBusy] = useState<"enable" | "disable" | "test" | null>(null);
  const [error, setError] = useState<NotificationError | "browserFailed" | null>(null);
  const [testSent, setTestSent] = useState(false);
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
    setTestSent(false);
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
    setTestSent(false);
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

  async function test() {
    setBusy("test");
    setError(null);
    setTestSent(false);
    try {
      const subscription = await (await registerNotificationWorker()).pushManager.getSubscription();
      if (!subscription) {
        setMode("off");
        setError("noSubscription");
        return;
      }
      const result = await sendTestNotification(subscription.endpoint);
      if (!result.ok) {
        setError(result.error);
        if (result.error === "noSubscription") setMode("off");
        return;
      }
      setTestSent(true);
    } catch {
      setError("browserFailed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section aria-labelledby="notification-title" className="glass grid gap-4 rounded-lg p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary/10 text-primary-text">
          <BellIcon aria-hidden="true" weight="duotone" className="size-6" />
        </span>
        <div className="grid gap-1">
          <h2 id="notification-title" className="text-base font-bold">
            {t("title")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
      </div>
      <p
        role="status"
        className={mode === "on" ? "text-sm text-primary-text" : "text-sm text-muted-foreground"}
      >
        {t(`status.${mode}`)}
      </p>
      {mode === "install" && (
        <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          <li>{t("ios.openSafari")}</li>
          <li>{t("ios.share")}</li>
          <li>{t("ios.openHalo")}</li>
        </ol>
      )}
      {mode === "denied" && <p className="text-sm text-muted-foreground">{t("deniedHelp")}</p>}
      {error && (
        <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive-text">
          {t(`errors.${error}`)}
        </p>
      )}
      {testSent && (
        <p role="status" className="text-sm text-primary-text">
          {t("testSent")}
        </p>
      )}
      {mode === "off" && (
        <Button block loading={busy === "enable"} disabled={busy !== null} onClick={enable}>
          <BellIcon aria-hidden="true" />
          {t("enable")}
        </Button>
      )}
      {mode === "error" && (
        <Button block variant="secondary" disabled={busy !== null} onClick={() => void refresh()}>
          {t("retry")}
        </Button>
      )}
      {mode === "on" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Button
            variant="secondary"
            loading={busy === "test"}
            disabled={busy !== null}
            onClick={test}
          >
            <PaperPlaneTiltIcon aria-hidden="true" />
            {t("test")}
          </Button>
          <Button
            variant="ghost"
            loading={busy === "disable"}
            disabled={busy !== null}
            onClick={disable}
          >
            <BellSlashIcon aria-hidden="true" />
            {t("disable")}
          </Button>
        </div>
      )}
      <p className="text-xs text-muted-foreground">{t("deliveryHint")}</p>
    </section>
  );
}
