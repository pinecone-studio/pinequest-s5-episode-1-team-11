import { CameraIcon, UsersIcon, UsersThreeIcon } from "@phosphor-icons/react/dist/ssr";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/app/page-header";
import { defaultPalette, isPalette, PALETTE_COOKIE } from "@/components/theme/palettes";
import { LanguageSelect, ModeSelect, PaletteSelect } from "@/components/theme/theme-switcher";
import { ListGroup, ListItem } from "@/components/ui/list";
import { NotificationSettings } from "@/features/notifications";
import { routes } from "@/lib/routes";

export default async function Page() {
  const [t, cookieStore] = await Promise.all([getTranslations("settings"), cookies()]);

  const savedPalette = cookieStore.get(PALETTE_COOKIE)?.value;
  const palette = isPalette(savedPalette) ? savedPalette : defaultPalette;
  const icon = "size-6 text-primary-text";

  return (
    <>
      <PageHeader title={t("title")} />
      <div className="grid items-start gap-5 lg:grid-cols-2 xl:grid-cols-3">
        <ListGroup title={t("familyLinks")}>
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

        <section className="glass grid content-start gap-5 rounded-lg p-4 md:p-5">
          <h2 className="text-base font-bold">{t("appearance")}</h2>
          <LanguageSelect />
          <ModeSelect />
          <PaletteSelect value={palette} />
        </section>

        <NotificationSettings />
      </div>
    </>
  );
}
