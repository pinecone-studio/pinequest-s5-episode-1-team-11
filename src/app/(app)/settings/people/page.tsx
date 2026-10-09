import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/app/page-header";
import { PeoplePanel } from "@/features/household/components/people-panel";
import { listWatchedPeople } from "@/features/household/queries";
import { isSupabaseConfigured } from "@/lib/env";

export default async function Page() {
  const [t, people] = await Promise.all([getTranslations("household"), listWatchedPeople()]);
  return (
    <>
      <PageHeader title={t("peopleTitle")} subtitle={t("peopleSubtitle")} />
      <PeoplePanel people={people} demo={!isSupabaseConfigured} />
    </>
  );
}
