import { redirect } from "next/navigation";
import { AppFrame } from "@/components/app/app-frame";
import { IntroSlides } from "@/features/onboarding/components/intro-slides";
import { hasSeenOnboarding } from "@/features/onboarding/queries";
import { routes } from "@/lib/routes";

export default async function Page() {
  if (await hasSeenOnboarding()) redirect(routes.login);
  return (
    <AppFrame className="min-h-dvh content-center py-8">
      <IntroSlides />
    </AppFrame>
  );
}
