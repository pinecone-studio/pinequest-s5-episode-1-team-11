import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { HaloMark } from "@/features/marketing/components/halo-mark";
import { SiteHeader } from "@/features/marketing/components/site-header";
import { routes } from "@/lib/routes";

export default async function MarketingLayout({ children }: { children: ReactNode }) {
  const [t, locale] = await Promise.all([getTranslations("marketing"), getLocale()]);
  const links = [
    { href: "/cameras", label: t("cameras") },
    { href: "/faq", label: t("faq") },
    { href: "/privacy", label: t("privacy") },
    { href: routes.home, label: t("nav.dashboard") },
  ];
  return (
    <div className="min-h-dvh overflow-x-clip bg-aurora-calm bg-fixed">
      <SiteHeader locale={locale} />
      <main className="mx-auto grid max-w-6xl gap-24 px-5 pt-10 pb-20 md:px-8 lg:gap-36 lg:px-10 lg:pt-12 lg:pb-28">
        {children}
      </main>
      <footer className="px-3 pb-4 md:px-6">
        <div className="glass mx-auto grid max-w-6xl gap-8 rounded-[28px] p-6 md:grid-cols-[1fr_auto] md:items-end md:p-8">
          <div className="grid gap-4">
            <Link href="/" className="flex w-fit items-center gap-2.5 font-display text-lg">
              <HaloMark className="size-7" />
              Halo
            </Link>
            <p className="max-w-xl text-base leading-relaxed text-muted-foreground">
              {t("footer.note")}
            </p>
          </div>
          <nav aria-label={t("footer.label")} className="grid gap-x-6 sm:flex sm:flex-wrap">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex min-h-11 items-center text-base font-bold text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}
