import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/app/page-header";
import { InvitePanel } from "@/features/household/components/invite-panel";

export default async function Page() {
  const t = await getTranslations("household");

  return (
    <>
      <PageHeader title={t("title")} />
      <InvitePanel />
    </>
  );
}
