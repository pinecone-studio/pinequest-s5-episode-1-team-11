import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { routes } from "@/lib/routes";

export default async function NotFound() {
  const t = await getTranslations("events");
  return (
    <EmptyState
      title={t("missing.title")}
      description={t("missing.body")}
      action={
        <Button asChild>
          <Link href={routes.events}>{t("missing.back")}</Link>
        </Button>
      }
    />
  );
}
