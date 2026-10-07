import { AppFrame } from "@/components/app/app-frame";
import { BottomNav } from "@/components/app/bottom-nav";
import { requireUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/env";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (isSupabaseConfigured) await requireUser();
  return (
    <>
      <AppFrame>{children}</AppFrame>
      <BottomNav />
    </>
  );
}
