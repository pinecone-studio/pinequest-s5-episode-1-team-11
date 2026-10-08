"use client";

import { FlaskIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PairResponse } from "@/contracts";
import { pairDevice } from "../api";

export type PairNotice = "removed" | null;

/** Six-digit code from the guardian's phone → a stored device token. */
export function PairForm({
  initialCode,
  notice,
  apiReady,
  onPaired,
  onLocal,
}: {
  initialCode: string;
  notice: PairNotice;
  apiReady: boolean;
  onPaired(device: PairResponse): void;
  onLocal(): void;
}) {
  const t = useTranslations("monitor.pair");
  const [code, setCode] = useState(initialCode);
  const [error, setError] = useState<string | undefined>(notice ? t(notice) : undefined);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    const result = await pairDevice(code);
    setLoading(false);
    if (result.ok) onPaired(result.data);
    else setError(t(result.reason === "unauthorized" ? "invalid" : result.reason));
  }

  return (
    <div className="grid gap-8">
      <form onSubmit={submit} className="grid gap-5">
        <p className="text-md text-muted-foreground">{t("lead")}</p>
        <Input
          label={t("code")}
          hint={t("hint")}
          error={error}
          value={code}
          onChange={(event) => {
            setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
            setError(undefined);
          }}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          required
          disabled={!apiReady}
          className="text-center font-display text-3xl tracking-[0.4em] tabular"
        />
        <Button type="submit" block loading={loading} disabled={!apiReady || code.length !== 6}>
          {t("submit")}
        </Button>
        {!apiReady && <p className="text-base text-warning-text">{t("unavailable")}</p>}
      </form>
      <section className="glass grid gap-3 rounded-lg p-5">
        <h2 className="flex items-center gap-2 font-display text-lg">
          <FlaskIcon aria-hidden="true" className="size-5 text-primary-text" />
          {t("localTitle")}
        </h2>
        <p className="text-base text-muted-foreground">{t("localLead")}</p>
        <Button variant="secondary" onClick={onLocal}>
          {t("local")}
        </Button>
      </section>
    </div>
  );
}
