import { getTranslations } from "next-intl/server";
import { AppFrame } from "@/components/app/app-frame";
import { PageHeader } from "@/components/app/page-header";
import { AuthForm } from "@/features/auth/components/auth-form";
import { safeNext } from "@/lib/auth/redirect";
import { isSupabaseConfigured } from "@/lib/env";

export default async function SignUp({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const t = await getTranslations("auth");
  const params = await searchParams;
  return (
    <AppFrame width="narrow">
      <p className="font-display text-xl text-primary-text">Halo</p>
      <PageHeader title={t("signup")} subtitle={t("welcome")} />
      <AuthForm mode="signup" next={safeNext(params.next)} configured={isSupabaseConfigured} />
    </AppFrame>
  );
}
