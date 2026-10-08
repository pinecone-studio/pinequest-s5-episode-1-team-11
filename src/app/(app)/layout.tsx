import { AppFrame } from "@/components/app/app-frame";
import { BottomNav } from "@/components/app/bottom-nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppFrame>{children}</AppFrame>
      <BottomNav />
    </>
  );
}
