import { getTranslations } from "next-intl/server";

export default async function Home() {
  const t = await getTranslations("common");
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
      <h1 className="text-3xl font-semibold">{t("appName")}</h1>
      <p className="opacity-70">{t("tagline")}</p>
    </main>
  );
}
