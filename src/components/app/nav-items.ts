import { BellIcon, HouseIcon, type Icon, UsersThreeIcon } from "@phosphor-icons/react";
import { routes } from "@/lib/routes";

/** The three app sections. Phones show them as a bottom tab bar, wide screens as a sidebar. */
export const navItems: { href: string; key: "home" | "events" | "family"; icon: Icon }[] = [
  { href: routes.home, key: "home", icon: HouseIcon },
  { href: routes.events, key: "events", icon: BellIcon },
  { href: routes.settings, key: "family", icon: UsersThreeIcon },
];

/** Devices live under Family, so /devices/* highlights the Family item. */
export function activeNavIndex(pathname: string) {
  const section = pathname.startsWith(routes.devices) ? routes.settings : pathname;
  return Math.max(
    0,
    navItems.findIndex((item) => section === item.href || section.startsWith(`${item.href}/`)),
  );
}
