"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resendConfirmation, resetPassword, sendRecoveryEmail } from "../recovery-actions";
import type { AuthState } from "../state";

function Feedback({ state }: { state: AuthState }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (state.error) ref.current?.focus();
  }, [state.error]);
  if (state.error)
    return (
      <p
        ref={ref}
        tabIndex={-1}
        role="alert"
        className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-destructive-text"
      >
        {state.error}
      </p>
    );
  if (state.success)
    return (
      <p role="status" className="text-primary-text">
        {state.success}
      </p>
    );
  return null;
}

/** Password-reset or confirmation link request. Answers the same whether or not the account exists. */
export function EmailLinkForm({ kind, next }: { kind: "recovery" | "confirmation"; next: string }) {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState(
    kind === "recovery" ? sendRecoveryEmail : resendConfirmation,
    {},
  );
  return (
    <form action={action} className="glass grid gap-5 rounded-lg p-5">
      <input type="hidden" name="next" value={next} />
      <Feedback state={state} />
      <Input
        name="email"
        type="email"
        label={t("email")}
        autoComplete="email"
        required
        maxLength={254}
      />
      <Button type="submit" loading={pending} block>
        {kind === "recovery" ? t("sendRecovery") : t("sendConfirmation")}
      </Button>
      <Link
        className="grid min-h-11 place-items-center text-base font-semibold text-primary-text"
        href={`/login?next=${encodeURIComponent(next)}`}
      >
        {t("backToLogin")}
      </Link>
    </form>
  );
}

export function ResetPasswordForm({ next }: { next: string }) {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState(resetPassword, {});
  if (state.success)
    return (
      <div className="glass grid gap-5 rounded-lg p-5">
        <Feedback state={state} />
        <Button asChild block>
          <Link href={next}>{t("continue")}</Link>
        </Button>
      </div>
    );
  return (
    <form action={action} className="glass grid gap-5 rounded-lg p-5">
      <Feedback state={state} />
      <Input
        name="password"
        type="password"
        label={t("newPassword")}
        autoComplete="new-password"
        required
        minLength={8}
        maxLength={200}
        hint={t("passwordHint")}
      />
      <Input
        name="confirmPassword"
        type="password"
        label={t("confirmPassword")}
        autoComplete="new-password"
        required
        minLength={8}
        maxLength={200}
      />
      <Button type="submit" loading={pending} block>
        {t("savePassword")}
      </Button>
      {state.error === t("recoveryExpired") && (
        <Link
          className="grid min-h-11 place-items-center text-base font-semibold text-primary-text"
          href={`/forgot-password?next=${encodeURIComponent(next)}`}
        >
          {t("forgotTitle")}
        </Link>
      )}
    </form>
  );
}
