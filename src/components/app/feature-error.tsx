"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export function FeatureError({ reset }: { reset(): void }) {
  const t = useTranslations("common");
  return (
    <section
      role="alert"
      className="glass grid justify-items-center gap-4 rounded-lg p-6 text-center"
    >
      <p className="text-md font-bold">{t("errors.generic")}</p>
      <Button onClick={reset}>{t("actions.retry")}</Button>
    </section>
  );
}
