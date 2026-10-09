import { getTranslations } from "next-intl/server";
import { AppFrame } from "@/components/app/app-frame";
import { PageHeader } from "@/components/app/page-header";
import { EmailLinkForm } from "@/features/auth/components/recovery-forms";
import { safeNext } from "@/lib/auth/redirect";

export default async function ForgotPassword({ searchParams }: PageProps<"/forgot-password">) {
  const t = await getTranslations("auth");
  const { next, type } = await searchParams;
  const kind = type === "confirmation" ? "confirmation" : "recovery";
  return (
    <AppFrame width="narrow">
      <PageHeader
        title={kind === "recovery" ? t("forgotTitle") : t("confirmTitle")}
        subtitle={kind === "recovery" ? t("forgotDescription") : t("confirmDescription")}
      />
      <EmailLinkForm kind={kind} next={safeNext(typeof next === "string" ? next : undefined)} />
    </AppFrame>
  );
}
