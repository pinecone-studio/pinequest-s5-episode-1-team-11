import { HeartIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { LanguageSelect } from "@/components/theme/theme-switcher";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";

export default async function MarketingLayout({ children }: { children: ReactNode }) {
  const t = await getTranslations("marketing");
  return (
    <div className="min-h-dvh bg-aurora-calm bg-fixed">
      <header className="mx-auto grid max-w-6xl gap-4 border-b border-hairline px-5 py-5 md:px-8 lg:px-10">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/"
            aria-label={t("nav.home")}
            className="flex min-h-11 items-center gap-3 font-display text-xl"
          >
            <HeartIcon weight="duotone" className="size-8 text-primary-text" aria-hidden="true" />
            Halo
          </Link>
          <Button asChild variant="secondary" size="sm" className="min-h-11">
            <Link href={routes.login}>{t("nav.login")}</Link>
          </Button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <nav aria-label={t("nav.label")} className="flex flex-wrap gap-x-5">
            <Link href="/cameras" className="flex min-h-11 items-center text-base font-bold">
              {t("cameras")}
            </Link>
            <Link href="/faq" className="flex min-h-11 items-center text-base font-bold">
              {t("faq")}
            </Link>
          </nav>
          <div className="w-44">
            <LanguageSelect />
          </div>
        </div>
      </header>
      <main className="mx-auto grid max-w-6xl gap-12 px-5 py-8 md:px-8 lg:gap-20 lg:px-10 lg:py-16">
        {children}
      </main>
      <footer className="mx-auto grid max-w-6xl gap-5 border-t border-hairline px-5 py-8 md:px-8 lg:px-10">
        <p className="max-w-2xl text-base text-muted-foreground">{t("footer.note")}</p>
        <nav aria-label={t("footer.label")} className="flex flex-wrap gap-x-6">
          <Link href="/privacy" className="flex min-h-11 items-center text-base">
            {t("privacy")}
          </Link>
          <Link href="/faq" className="flex min-h-11 items-center text-base">
            {t("faq")}
          </Link>
          <Link href="/cameras" className="flex min-h-11 items-center text-base">
            {t("cameras")}
          </Link>
          <Link href={routes.home} className="flex min-h-11 items-center text-base">
            {t("nav.dashboard")}
          </Link>
        </nav>
      </footer>
    </div>
  );
}
