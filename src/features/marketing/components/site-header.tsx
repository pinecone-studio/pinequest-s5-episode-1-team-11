"use client";

import { ListIcon, XIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { setLocale } from "@/i18n/actions";
import { cn } from "@/lib/cn";
import { routes } from "@/lib/routes";
import { HaloMark } from "./halo-mark";

const links = [
  { href: "/cameras", key: "cameras" },
  { href: "/faq", key: "faq" },
  { href: "/privacy", key: "privacy" },
] as const;

/** Floating glass bar for the public pages: logo, links, language and sign in. */
export function SiteHeader({ locale }: { locale: string }) {
  const t = useTranslations("marketing");
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the menu after navigating.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs on route change only
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const switchLanguage = () =>
    start(async () => {
      await setLocale(locale === "mn" ? "en" : "mn");
      router.refresh();
    });

  const language = (
    <button
      type="button"
      onClick={switchLanguage}
      aria-label={t("nav.language")}
      aria-busy={pending || undefined}
      className="grid min-h-11 min-w-11 place-items-center rounded-full px-3 text-sm font-bold text-muted-foreground transition-colors hover:bg-hairline hover:text-foreground disabled:opacity-50"
      disabled={pending}
    >
      {t("nav.languageShort")}
    </button>
  );

  return (
    <header className="sticky top-3 z-50 px-3 md:top-4 md:px-6">
      <div
        className={cn(
          "glass-strong mx-auto flex max-w-6xl items-center gap-2 rounded-full py-1.5 pr-1.5 pl-3 transition-shadow duration-300",
          scrolled && "shadow-[0_18px_40px_-22px_rgb(2_6_23/0.7)]",
        )}
      >
        <Link
          href="/"
          aria-label={t("nav.home")}
          className="flex min-h-11 items-center gap-2.5 rounded-full pr-2 font-display text-lg"
        >
          <HaloMark className="size-7" />
          Halo
        </Link>
        <nav aria-label={t("nav.label")} className="mx-auto hidden items-center gap-1 md:flex">
          {links.map((link) => {
            const current = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center rounded-full px-4 text-base font-bold transition-colors",
                  current
                    ? "bg-white/10 text-foreground"
                    : "text-muted-foreground hover:bg-hairline hover:text-foreground",
                )}
              >
                {t(link.key)}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <span className="hidden md:block">{language}</span>
          <Button asChild size="sm" className="min-h-11">
            <Link href={routes.login}>{t("nav.login")}</Link>
          </Button>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="site-menu"
            aria-label={open ? t("nav.close") : t("nav.menu")}
            className="grid size-11 place-items-center rounded-full text-foreground hover:bg-hairline md:hidden"
          >
            {open ? (
              <XIcon className="size-5" aria-hidden="true" />
            ) : (
              <ListIcon className="size-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
      <div
        id="site-menu"
        hidden={!open}
        className="glass-strong absolute inset-x-3 top-full mt-2 rounded-[28px] p-2 shadow-[0_24px_48px_-20px_rgb(2_6_23/0.8)] md:hidden"
      >
        <nav aria-label={t("nav.label")} className="grid">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={pathname === link.href ? "page" : undefined}
              className="flex min-h-12 items-center rounded-2xl px-4 text-md font-bold aria-[current=page]:bg-white/10"
            >
              {t(link.key)}
            </Link>
          ))}
        </nav>
        <div className="mt-1 flex items-center justify-between border-t border-hairline px-2 pt-2">
          <Link
            href={routes.home}
            className="flex min-h-11 items-center px-2 text-base font-bold text-primary-text"
          >
            {t("nav.dashboard")}
          </Link>
          {language}
        </div>
      </div>
    </header>
  );
}
