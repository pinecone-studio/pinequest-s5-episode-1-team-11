import { getTranslations } from "next-intl/server";
import { AppFrame } from "@/components/app/app-frame";
import { PageHeader } from "@/components/app/page-header";
import { AuthForm } from "@/features/auth/components/auth-form";
import { safeNext } from "@/lib/auth/redirect";
import { requireUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/env";

export default async function SetupHousehold({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const t = await getTranslations("auth");
  if (isSupabaseConfigured) await requireUser();
  const params = await searchParams;
  return (
    <AppFrame width="narrow">
      <PageHeader title={t("householdTitle")} subtitle={t("householdDescription")} />
      <AuthForm mode="household" next={safeNext(params.next)} configured={isSupabaseConfigured} />
    </AppFrame>
  );
}
