import {
  DatabaseIcon,
  EyeIcon,
  HandPalmIcon,
  ImageIcon,
  MonitorPlayIcon,
  SlidersHorizontalIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react/dist/ssr";
import { getTranslations } from "next-intl/server";
import { PageIntro } from "@/features/marketing/components/page-intro";
import { PrivacyBoundary } from "@/features/marketing/components/privacy-boundary";

const sections = [
  { key: "video", Icon: EyeIcon },
  { key: "events", Icon: ImageIcon },
  { key: "live", Icon: MonitorPlayIcon },
  { key: "access", Icon: UsersThreeIcon },
  { key: "permissions", Icon: HandPalmIcon },
  { key: "control", Icon: SlidersHorizontalIcon },
  { key: "hosting", Icon: DatabaseIcon },
] as const;

export default async function Page() {
  const t = await getTranslations("marketing");
  return (
    <div className="grid gap-14">
      <PageIntro title={t("privacy")} lead={t("privacyContent.lead")} />
      <PrivacyBoundary />
      <div className="grid gap-x-12 gap-y-10 md:grid-cols-2">
        {sections.map(({ key, Icon }) => (
          <section key={key} className="grid content-start gap-3 border-t border-hairline pt-6">
            <h2 className="flex items-center gap-3 text-xl font-bold">
              <Icon
                weight="duotone"
                className="size-6 shrink-0 text-primary-text"
                aria-hidden="true"
              />
              {t(`privacyContent.${key}.title`)}
            </h2>
            <p className="max-w-[60ch] text-md leading-relaxed text-muted-foreground">
              {t(`privacyContent.${key}.body`)}
            </p>
          </section>
        ))}
      </div>
    </div>
  );
}
