"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { reset: () => void }) {
  const t = useTranslations("devices");
  return (
    <div className="glass grid gap-4 rounded-lg p-6">
      <h1 className="text-lg font-bold">{t("loadError.title")}</h1>
      <p role="alert" className="text-base text-muted-foreground">
        {t("loadError.body")}
      </p>
      <Button onClick={reset}>{t("loadError.retry")}</Button>
    </div>
  );
}
