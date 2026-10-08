"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/cn";
import { routes } from "@/lib/routes";
import { activeNavIndex, navItems } from "./nav-items";

/** Wide-screen (≥1024px) glass sidebar: brand, the three sections, and who is signed in. */
export function SideNav({
  newEvents = 0,
  profileName,
  householdName,
}: {
  newEvents?: number;
  profileName: string;
  householdName?: string;
}) {
  const t = useTranslations("common.nav");
  const active = activeNavIndex(usePathname());
  return (
    <aside className="glass-strong fixed inset-y-4 left-4 z-40 hidden w-60 flex-col rounded-[28px] p-3 lg:flex">
      <Link href={routes.home} className="flex items-center gap-3 rounded-2xl px-3 py-3">
        <span
          aria-hidden="true"
          className="size-8 rounded-full bg-[radial-gradient(circle_at_34%_28%,var(--orb-highlight)_0%,var(--primary)_40%,color-mix(in_srgb,var(--primary)_40%,var(--background))_100%)] shadow-[0_0_18px_-2px_var(--primary)]"
        />
        <span className="font-display text-xl">Halo</span>
      </Link>
      <nav aria-label={t("label")} className="mt-4 grid gap-1">
        {navItems.map((item, i) => {
          const current = i === active;
          const Glyph = item.icon;
          const badge = item.key === "events" && newEvents > 0;
          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={current ? "page" : undefined}
              aria-label={
                badge ? `${t(item.key)}, ${t("newEvents", { count: newEvents })}` : undefined
              }
              className={cn(
                "flex min-h-12 items-center gap-3 rounded-2xl border px-3 text-md font-bold transition-colors",
                current
                  ? "border-white/14 bg-white/10 text-foreground"
                  : "border-transparent text-muted-foreground hover:bg-hairline hover:text-foreground",
              )}
            >
              <Glyph
                weight={current ? "fill" : "bold"}
                aria-hidden="true"
                className={cn("size-6", current && "text-primary-text")}
              />
              {t(item.key)}
              {badge && (
                <b className="ml-auto grid h-6 min-w-6 place-items-center rounded-full bg-destructive px-2 text-xs text-destructive-foreground">
                  {newEvents}
                </b>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto flex min-w-0 items-center gap-3 rounded-2xl px-3 py-3">
        <Avatar name={profileName} size="sm" />
        <span className="grid min-w-0">
          <b className="truncate text-base">{profileName}</b>
          {householdName && (
            <span className="truncate text-sm text-muted-foreground">{householdName}</span>
          )}
        </span>
      </div>
    </aside>
  );
}
