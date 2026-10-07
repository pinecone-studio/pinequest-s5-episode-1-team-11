import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AppFrame } from "@/components/app/app-frame";
import { BottomNav } from "@/components/app/bottom-nav";
import { getHousehold, getUnreadCount } from "@/lib/data/queries";
import { isSupabaseConfigured } from "@/lib/env";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (isSupabaseConfigured && !(await getHousehold())) redirect("/setup-household");
  const [t, unreadCount] = await Promise.all([getTranslations("common"), getUnreadCount()]);
  return (
    <>
      <AppFrame>
        {!isSupabaseConfigured && <p className="text-xs text-muted-foreground">{t("demo")}</p>}
        {children}
      </AppFrame>
      <BottomNav newEvents={unreadCount} />
    </>
  );
}
