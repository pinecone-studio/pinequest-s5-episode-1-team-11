import { CameraIcon, UsersIcon, UsersThreeIcon } from "@phosphor-icons/react/dist/ssr";
import { getTranslations } from "next-intl/server";
import { FeaturePlaceholder } from "@/components/app/feature-placeholder";
import { ListGroup, ListItem } from "@/components/ui/list";
import { NotificationSettings } from "@/features/notifications";
import { routes } from "@/lib/routes";

/* Family is the third tab: devices, caregivers and watched people all start here. */
export default async function Page() {
  const t = await getTranslations("settings");
  const icon = "size-6 text-primary-text";
  return (
    <FeaturePlaceholder title={t("title")}>
      <ListGroup>
        <ListItem
          href={routes.devices}
          leading={<CameraIcon weight="duotone" aria-hidden="true" className={icon} />}
          title={t("devices")}
          description={t("devicesHint")}
        />
        <ListItem
          href={routes.people}
          leading={<UsersIcon weight="duotone" aria-hidden="true" className={icon} />}
          title={t("people")}
          description={t("peopleHint")}
        />
        <ListItem
          href={routes.household}
          leading={<UsersThreeIcon weight="duotone" aria-hidden="true" className={icon} />}
          title={t("household")}
          description={t("householdHint")}
        />
      </ListGroup>
      <NotificationSettings />
    </FeaturePlaceholder>
  );
}
