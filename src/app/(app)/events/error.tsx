"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function ErrorPage({ reset }: { reset: () => void }) {
  const t = useTranslations("events");
  return (
    <EmptyState
      title={t("error.title")}
      description={t("error.body")}
      action={<Button onClick={reset}>{t("error.retry")}</Button>}
    />
  );
}
