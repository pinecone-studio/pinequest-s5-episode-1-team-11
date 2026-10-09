"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createHousehold, signIn, signUp } from "../actions";

export function AuthForm({
  mode,
  next,
  configured,
  confirmationError,
}: {
  mode: "login" | "signup" | "household";
  next: string;
  configured: boolean;
  confirmationError?: boolean;
}) {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState(
    mode === "login" ? signIn : mode === "signup" ? signUp : createHousehold,
    {},
  );
  const [name, setName] = useState(mode === "household" ? t("defaultHousehold") : "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const errorRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (state.error) errorRef.current?.focus();
  }, [state.error]);
  if (!configured)
    return (
      <div className="glass grid gap-4 rounded-lg p-5">
        <h2 className="text-lg font-bold">{t("demoTitle")}</h2>
        <p className="text-base text-muted-foreground">{t("demoDescription")}</p>
        <Button asChild block>
          <Link href="/home">{t("openDemo")}</Link>
        </Button>
      </div>
    );
  return (
    <form action={action} className="glass grid gap-5 rounded-lg p-5">
      <input type="hidden" name="next" value={next} />
      {(state.error || confirmationError) && (
        <p
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-destructive-text"
        >
          {state.error ?? t("confirmationError")}
        </p>
      )}
      {state.success ? (
        <p role="status" className="text-primary-text">
          {state.success}
        </p>
      ) : (
        <>
          {mode !== "login" && (
            <Input
              name="name"
              label={mode === "household" ? t("householdName") : t("name")}
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={60}
              required
              autoComplete={mode === "signup" ? "name" : "off"}
              error={state.fields?.name}
            />
          )}
          {mode !== "household" && (
            <>
              <Input
                name="email"
                type="email"
                label={t("email")}
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                maxLength={254}
              />
              <Input
                name="password"
                type="password"
                label={t("password")}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={8}
                maxLength={200}
                hint={mode === "signup" ? t("passwordHint") : undefined}
              />
            </>
          )}
          <Button type="submit" loading={pending} block>
            {mode === "login" ? t("login") : mode === "signup" ? t("signup") : t("createHousehold")}
          </Button>
        </>
      )}
      {mode === "login" && (
        <Link
          className="grid min-h-11 place-items-center text-base font-semibold text-muted-foreground"
          href={`/forgot-password?next=${encodeURIComponent(next)}`}
        >
          {t("forgotPassword")}
        </Link>
      )}
      {mode === "signup" && state.success && (
        <Link
          className="grid min-h-11 place-items-center text-base font-semibold text-muted-foreground"
          href={`/forgot-password?type=confirmation&next=${encodeURIComponent(next)}`}
        >
          {t("resendConfirmation")}
        </Link>
      )}
      {mode !== "household" && (
        <Link
          className="grid min-h-11 place-items-center text-base font-semibold text-primary-text"
          href={`${mode === "login" ? "/signup" : "/login"}?next=${encodeURIComponent(next)}`}
        >
          {mode === "login" ? t("noAccount") : t("hasAccount")}
        </Link>
      )}
    </form>
  );
}
