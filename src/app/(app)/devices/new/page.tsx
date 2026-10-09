import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/app/page-header";
import { PairingPanel } from "@/features/devices/components/pairing-panel";
import { isSupabaseConfigured } from "@/lib/env";

export default async function Page() {
  const t = await getTranslations("devices");
  return (
    <>
      <PageHeader title={t("newTitle")} subtitle={t("newSubtitle")} />
      <PairingPanel demo={!isSupabaseConfigured} />
    </>
  );
}
