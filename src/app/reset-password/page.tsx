import { getTranslations } from "next-intl/server";
import { AppFrame } from "@/components/app/app-frame";
import { PageHeader } from "@/components/app/page-header";
import { ResetPasswordForm } from "@/features/auth/components/recovery-forms";
import { safeNext } from "@/lib/auth/redirect";

/** Reached from the recovery email via /auth/callback; the action re-verifies the recovery session. */
export default async function ResetPassword({ searchParams }: PageProps<"/reset-password">) {
  const t = await getTranslations("auth");
  const { next } = await searchParams;
  return (
    <AppFrame width="narrow">
      <PageHeader title={t("resetTitle")} subtitle={t("resetDescription")} />
      <ResetPasswordForm next={safeNext(typeof next === "string" ? next : undefined)} />
    </AppFrame>
  );
}
