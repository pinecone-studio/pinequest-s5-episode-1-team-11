import { getTranslations } from "next-intl/server";
import { FeaturePlaceholder } from "@/components/app/feature-placeholder";

export default async function Page() {
  const t = await getTranslations("household");
  return <FeaturePlaceholder title={t("peopleTitle")} />;
}
