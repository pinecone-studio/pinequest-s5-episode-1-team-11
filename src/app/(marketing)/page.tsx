import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AppFrame } from "@/components/app/app-frame";
import { FeaturePlaceholder } from "@/components/app/feature-placeholder";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";

export default async function Page() {
  const t = await getTranslations("common");
  const d = await getTranslations("design");
  return (
    <AppFrame>
      <FeaturePlaceholder title={t("appName")}>
        <Button asChild>
          <Link href={routes.home}>{t("nav.home")}</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href={routes.design}>{d("title")}</Link>
        </Button>
      </FeaturePlaceholder>
    </AppFrame>
  );
}
