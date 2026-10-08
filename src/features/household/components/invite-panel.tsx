"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createHouseholdInvite } from "../actions";

export function InvitePanel() {
  const t = useTranslations("household");
  const [state, action, pending] = useActionState(createHouseholdInvite, {});
  const [copied, setCopied] = useState(false);
  const [shareError, setShareError] = useState("");

  async function shareOrCopyInvite() {
    if (!state.inviteUrl) return;

    setShareError("");
    setCopied(false);

    try {
      const isPhone = window.matchMedia("(pointer: coarse)").matches;

      if (isPhone && navigator.share) {
        await navigator.share({ url: state.inviteUrl });
      } else {
        await navigator.clipboard.writeText(state.inviteUrl);
        setCopied(true);
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setShareError(t("shareError"));
    }
  }

  return (
    <section className="glass grid gap-4 rounded-lg p-4 md:p-5">
      <div className="grid gap-1">
        <h2 className="text-base font-bold">{t("createInviteTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("createInviteHint")}</p>
      </div>

      <form action={action}>
        <Button type="submit" block loading={pending}>
          {t("createInvite")}
        </Button>
      </form>

      {state.error && (
        <p role="alert" className="text-sm font-semibold text-destructive-text">
          {state.error}
        </p>
      )}

      {state.inviteUrl && (
        <div className="grid gap-3">
          <Input label={t("inviteLink")} value={state.inviteUrl} readOnly />
          <Button type="button" variant="secondary" onClick={shareOrCopyInvite}>
            {copied ? t("inviteCopied") : t("shareInvite")}
          </Button>
        </div>
      )}

      {shareError && (
        <p role="alert" className="text-sm font-semibold text-destructive-text">
          {shareError}
        </p>
      )}
    </section>
  );
}
