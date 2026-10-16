import { HouseholdRealtime } from "@/components/app/household-realtime";
import { HomeDashboard } from "@/features/home/components/home-dashboard";
import { getHomeSummary } from "@/features/home/queries";
import { homeStatus } from "@/features/home/status";

export default async function Page() {
  const summary = await getHomeSummary();
  return (
    <>
      {summary.household && <HouseholdRealtime householdId={summary.household.id} />}
      <HomeDashboard
        name={summary.profile.name}
        householdName={summary.household?.name}
        state={homeStatus(summary.devices, summary.criticalEvent, summary.unreadCount)}
        critical={summary.criticalEvent}
        devices={summary.devices}
        events={summary.events}
        people={summary.watchedPeople.length}
      />
    </>
  );
}
