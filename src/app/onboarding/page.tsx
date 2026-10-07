import { getTranslations } from "next-intl/server";
import { AppFrame } from "@/components/app/app-frame";
import { FeaturePlaceholder } from "@/components/app/feature-placeholder";
export default async function Page() {
  const t = await getTranslations("onboarding");
  return (
    <AppFrame>
      <FeaturePlaceholder title={t("title")} subtitle={t("subtitle")} />
    </AppFrame>
  );
}
