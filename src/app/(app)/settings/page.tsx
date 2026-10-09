import { CameraIcon, UsersIcon, UsersThreeIcon } from "@phosphor-icons/react/dist/ssr";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/app/page-header";
import { defaultPalette, isPalette, PALETTE_COOKIE } from "@/components/theme/palettes";
import { LanguageSelect, ModeSelect, PaletteSelect } from "@/components/theme/theme-switcher";
import { ListGroup, ListItem } from "@/components/ui/list";
import { NotificationSettings } from "@/features/notifications";
import { AccountPanel } from "@/features/settings/components/account-panel";
import { getProfile } from "@/features/settings/queries";
import { isSupabaseConfigured } from "@/lib/env";
import { routes } from "@/lib/routes";

/* Family is the third tab: devices, caregivers and watched people all start here. */
export default async function Page() {
  const [t, cookieStore, profile] = await Promise.all([
    getTranslations("settings"),
    cookies(),
    getProfile(),
  ]);
  const saved = cookieStore.get(PALETTE_COOKIE)?.value;
  const palette = isPalette(saved) ? saved : defaultPalette;
  const icon = "size-6 text-primary-text";

  return (
    <>
      <PageHeader title={t("title")} />
      <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-10">
        <div className="grid gap-8">
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
        </div>
        <div className="grid gap-8">
          <section aria-labelledby="appearance" className="grid gap-3">
            <h2 id="appearance" className="pl-1 text-base font-bold text-muted-foreground">
              {t("appearance")}
            </h2>
            <LanguageSelect />
            <ModeSelect />
            <PaletteSelect value={palette} />
          </section>
          <AccountPanel profile={profile} demo={!isSupabaseConfigured} />
        </div>
      </div>
    </>
  );
}
