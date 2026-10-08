import { getTranslations } from "next-intl/server";
import { AppFrame } from "@/components/app/app-frame";
import { PageHeader } from "@/components/app/page-header";
import { AcceptInviteForm } from "@/features/household/components/accept-invite-form";
import { getInvite } from "@/features/household/queries";

export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const [t, invite] = await Promise.all([getTranslations("household"), getInvite(code)]);

  return (
    <AppFrame width="narrow">
      {invite ? (
        <>
          <PageHeader
            title={t("invitedBy", { name: invite.invitedBy })}
            subtitle={invite.householdName}
          />
          <AcceptInviteForm code={invite.code} />
        </>
      ) : (
        <>
          <PageHeader title={t("inviteTitle")} />
          <p
            role="alert"
            className="glass rounded-lg p-4 text-base font-semibold text-destructive-text"
          >
            {t("inviteInvalid")}
          </p>
        </>
      )}
    </AppFrame>
  );
}
