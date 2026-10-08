import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/app/page-header";
import { Avatar } from "@/components/ui/avatar";
import { ListGroup, ListItem } from "@/components/ui/list";
import { listMembers } from "@/features/household/queries";

export default async function Page() {
  const [t, members] = await Promise.all([getTranslations("household"), listMembers()]);

  return (
    <>
      <PageHeader title={t("title")} />
      <ListGroup title={t("members")}>
        {members.map((member) => (
          <ListItem
            key={member.userId}
            leading={<Avatar name={member.name} />}
            title={
              <>
                {member.name}
                {member.isMe && (
                  <span className="ml-2 text-sm font-medium text-muted-foreground">{t("you")}</span>
                )}
              </>
            }
            description={member.role === "owner" ? t("owner") : t("caregiver")}
          />
        ))}
      </ListGroup>
    </>
  );
}
