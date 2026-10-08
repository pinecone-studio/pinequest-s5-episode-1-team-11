import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/app/page-header";
import { WatchedPeopleManager } from "@/features/household/components/watched-people-manager";
import { listWatchedPeople } from "@/features/household/queries";

export default async function Page() {
  const [t, people] = await Promise.all([getTranslations("household"), listWatchedPeople()]);

  return (
    <>
      <PageHeader title={t("peopleTitle")} />
      <WatchedPeopleManager people={people} />
    </>
  );
}
