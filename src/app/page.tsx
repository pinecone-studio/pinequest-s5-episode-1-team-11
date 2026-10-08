import { getTranslations } from "next-intl/server";

export default async function Home() {
  const t = await getTranslations("common");
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2 bg-aurora-calm p-6 text-center">
      <h1 className="font-display text-3xl">{t("appName")}</h1>
      <p className="text-muted-foreground">{t("tagline")}</p>
    </main>
  );
}
