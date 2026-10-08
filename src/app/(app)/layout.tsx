import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AppFrame } from "@/components/app/app-frame";
import { BottomNav } from "@/components/app/bottom-nav";
import { SideNav } from "@/components/app/side-nav";
import { getHousehold, getProfile, getUnreadCount } from "@/lib/data/queries";
import { isSupabaseConfigured } from "@/lib/env";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const household = await getHousehold();
  if (isSupabaseConfigured && !household) redirect("/setup-household");
  const [t, unreadCount, profile] = await Promise.all([
    getTranslations("common"),
    getUnreadCount(),
    getProfile(),
  ]);
  return (
    <>
      <AppFrame sidebar>
        {!isSupabaseConfigured && <p className="text-xs text-muted-foreground">{t("demo")}</p>}
        {children}
      </AppFrame>
      <SideNav newEvents={unreadCount} profileName={profile.name} householdName={household?.name} />
      <BottomNav newEvents={unreadCount} />
    </>
  );
}
