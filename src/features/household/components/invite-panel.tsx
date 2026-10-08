"use client";

import { CheckIcon, CopyIcon, ShareNetworkIcon, UserPlusIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { createHouseholdInvite } from "../actions";

export function InvitePanel() {
  const t = useTranslations("household");
  const [state, action, pending] = useActionState(createHouseholdInvite, {});
  const [copied, setCopied] = useState(false);
  const [shareError, setShareError] = useState("");
  const [canShare, setCanShare] = useState(false);
  // Only known in the browser; the server render always shows Copy.
  useEffect(() => setCanShare("share" in navigator), []);

  async function share() {
    if (!state.inviteUrl) return;
    setShareError("");
    try {
      await navigator.share({ url: state.inviteUrl });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setShareError(t("shareError"));
    }
  }

  async function copy() {
    if (!state.inviteUrl) return;
    setShareError("");
    try {
      await navigator.clipboard.writeText(state.inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setShareError(t("shareError"));
    }
  }

  return (
    <section className="glass grid gap-5 rounded-lg p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-md bg-primary/14 text-primary-text">
          <UserPlusIcon weight="duotone" aria-hidden="true" className="size-6" />
        </span>
        <div className="grid gap-1">
          <h2 className="text-md font-bold">{t("createInviteTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("createInviteHint")}</p>
        </div>
      </div>

      {state.inviteUrl ? (
        <div className="grid gap-3">
          <div className="grid gap-1 rounded-md border border-hairline bg-background/40 px-4 py-3">
            <span className="text-xs font-bold text-muted-foreground">{t("inviteLink")}</span>
            <span className="truncate text-base font-semibold" title={state.inviteUrl}>
              {state.inviteUrl.replace(/^https?:\/\//, "")}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={copy} aria-live="polite">
              {copied ? <CheckIcon aria-hidden="true" /> : <CopyIcon aria-hidden="true" />}
              {copied ? t("inviteCopied") : t("copyInvite")}
            </Button>
            {canShare ? (
              <Button onClick={share}>
                <ShareNetworkIcon aria-hidden="true" />
                {t("shareInvite")}
              </Button>
            ) : (
              <form action={action} className="grid">
                <Button type="submit" variant="ghost" loading={pending}>
                  {t("newInvite")}
                </Button>
              </form>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{t("inviteExpiry")}</p>
        </div>
      ) : (
        <form action={action} className="grid">
          <Button type="submit" loading={pending}>
            {t("createInvite")}
          </Button>
        </form>
      )}

      {(state.error || shareError) && (
        <p role="alert" className="text-sm font-semibold text-destructive-text">
          {state.error || shareError}
        </p>
      )}
    </section>
  );
}
