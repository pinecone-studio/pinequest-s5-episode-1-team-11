import { getTranslations } from "next-intl/server";

/** Public slot consumed by Settings. The notification feature owner replaces its contents. */
export async function NotificationSettings() {
  const t = await getTranslations("notifications");
  return (
    <section className="glass grid gap-2 rounded-lg p-4">
      <h2 className="text-base font-bold">{t("title")}</h2>
      <p className="text-sm text-muted-foreground">{t("pending")}</p>
    </section>
  );
}
