import { ShieldCheckIcon } from "@phosphor-icons/react/dist/ssr";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/app/page-header";
export default async function Page() {
  const t = await getTranslations("marketing");
  return (
    <div className="grid max-w-3xl gap-8">
      <PageHeader title={t("privacy")} subtitle={t("privacyContent.subtitle")} />
      <div className="flex gap-3 rounded-lg border border-primary/20 bg-primary/5 p-5">
        <ShieldCheckIcon className="size-7 shrink-0 text-primary-text" aria-hidden="true" />
        <p className="text-md leading-relaxed">{t("privacyContent.lead")}</p>
      </div>
      {(["video", "events", "access", "permissions", "control", "hosting"] as const).map((key) => (
        <section key={key} className="grid gap-3">
          <h2 className="text-lg font-bold">{t(`privacyContent.${key}.title`)}</h2>
          <p className="text-base leading-relaxed text-muted-foreground">
            {t(`privacyContent.${key}.body`)}
          </p>
        </section>
      ))}
    </div>
  );
}
