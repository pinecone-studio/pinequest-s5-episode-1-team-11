"use client";

import { BellIcon, HouseIcon, type Icon, UsersThreeIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { routes } from "@/lib/routes";

const tabs: {
  href: "/home" | "/events" | "/settings";
  key: "home" | "events" | "family";
  icon: Icon;
}[] = [
  { href: routes.home, key: "home", icon: HouseIcon },
  { href: routes.events, key: "events", icon: BellIcon },
  { href: routes.settings, key: "family", icon: UsersThreeIcon },
];

/** Devices belong to Family; adding a camera and alerts have no tab bar. */
export function BottomNav({ newEvents = 0 }: { newEvents?: number }) {
  const t = useTranslations("common.nav");
  const pathname = usePathname();
  if (pathname.endsWith("/alert") || pathname === routes.newDevice) return null;
  const section = pathname.startsWith(routes.devices) ? routes.settings : pathname;
  const active = Math.max(
    0,
    tabs.findIndex((tab) => section === tab.href || section.startsWith(`${tab.href}/`)),
  );
  return (
    <nav
      aria-label={t("label")}
      className="glass-strong fixed inset-x-3.5 bottom-[max(16px,env(safe-area-inset-bottom))] z-40 mx-auto grid h-[70px] max-w-md grid-cols-3 rounded-[35px] p-2"
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-1.5 left-1.5 w-[calc((100%-12px)/3)] rounded-[29px] border border-white/14 bg-white/10 transition-transform duration-[380ms] ease-[var(--ease-snappy)]"
        style={{ transform: `translateX(${active * 100}%)` }}
      />
      {tabs.map((tab, i) => {
        const current = i === active;
        const Glyph = tab.icon;
        const badge = tab.key === "events" && newEvents > 0;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={current ? "page" : undefined}
            aria-label={
              badge ? `${t(tab.key)}, ${t("newEvents", { count: newEvents })}` : undefined
            }
            className={cn(
              "relative z-10 grid min-h-11 content-center justify-items-center gap-1 rounded-[26px] text-xs font-bold transition-colors",
              current ? "text-foreground" : "text-muted-foreground",
            )}
          >
            <Glyph
              weight={current ? "fill" : "bold"}
              className={cn("size-6", current && "text-primary-text")}
              aria-hidden="true"
            />
            {t(tab.key)}
            {badge && (
              <b className="absolute top-0.5 left-[calc(50%+6px)] grid h-5 min-w-5 place-items-center rounded-full bg-destructive px-1.5 text-xs text-destructive-foreground">
                {newEvents}
              </b>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
