import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/app/page-header";
import { Avatar } from "@/components/ui/avatar";
import { ListGroup, ListItem } from "@/components/ui/list";
import { Pill } from "@/components/ui/pill";
import { InvitePanel } from "@/features/household/components/invite-panel";
import { listMembers } from "@/features/household/queries";

export default async function Page() {
  const [t, members] = await Promise.all([getTranslations("household"), listMembers()]);

  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-10">
        <ListGroup title={t("members")}>
          {members.map((member) => (
            <ListItem
              key={member.userId}
              leading={<Avatar name={member.name} />}
              title={member.name}
              description={member.isMe ? t("you") : undefined}
              trailing={
                <Pill tone={member.role === "owner" ? "ok" : "neutral"} dot={false}>
                  {member.role === "owner" ? t("owner") : t("caregiver")}
                </Pill>
              }
            />
          ))}
        </ListGroup>
        <InvitePanel />
      </div>
    </>
  );
}
