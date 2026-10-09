"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { getPushSubscriptionState } from "../actions";
import { reconcileBrowserPush } from "../browser";
import type { NotificationError } from "../state";

/** Recheck server-owned subscriptions on navigation, focus and verified identity changes. */
export function PushAccountBoundary({ userId }: { userId: string | null }) {
  const t = useTranslations("notifications");
  const pathname = usePathname();
  const [retry, setRetry] = useState(0);
  const identity = useRef({ userId, pathname });
  const [failure, setFailure] = useState<NotificationError | "browserFailed" | null>(null);

  useEffect(() => {
    let active = true;
    let sequence = retry;
    // Root layouts persist across navigation; ownership is freshly checked by the Server Action.
    identity.current = { userId, pathname };
    const check = async () => {
      const currentSequence = ++sequence;
      const isCurrent = () =>
        active &&
        currentSequence === sequence &&
        identity.current.userId === userId &&
        identity.current.pathname === pathname;
      const result = await reconcileBrowserPush(getPushSubscriptionState, isCurrent);
      if (!isCurrent()) return;
      setFailure(result.state === "error" ? result.error : null);
    };
    setFailure(null);
    void check();
    window.addEventListener("focus", check);
    return () => {
      active = false;
      window.removeEventListener("focus", check);
    };
  }, [userId, pathname, retry]);

  if (!failure) return null;
  return (
    <section
      role="alert"
      className="mx-4 mb-4 grid gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4"
    >
      <p className="text-sm text-destructive-text">{t("accountBoundaryFailed")}</p>
      <p className="text-sm text-muted-foreground">{t(`errors.${failure}`)}</p>
      <Button variant="secondary" onClick={() => setRetry((value) => value + 1)}>
        {t("retry")}
      </Button>
    </section>
  );
}
