import {
  CpuIcon,
  DeviceMobileIcon,
  HouseLineIcon,
  UsersThreeIcon,
  VideoCameraIcon,
} from "@phosphor-icons/react/dist/ssr";
import { getTranslations } from "next-intl/server";

/**
 * The privacy line drawn as a diagram: video and audio stay inside the home,
 * only a small event packet travels to the family.
 */
export async function PrivacyBoundary() {
  const t = await getTranslations("marketing.boundary");
  return (
    <figure
      aria-label={`${t("home")}: ${t("camera")}, ${t("model")}. ${t("stays")}. ${t("packet")} → ${t("family")}.`}
      className="grid items-stretch gap-0 md:grid-cols-[minmax(0,1.2fr)_minmax(96px,0.8fr)_minmax(0,0.9fr)]"
    >
      <div className="relative grid gap-4 rounded-xl border-[1.5px] border-dashed border-primary/45 bg-primary/5 p-5">
        <span className="flex items-center gap-2 text-sm font-bold text-primary-text">
          <HouseLineIcon weight="duotone" className="size-5" aria-hidden="true" />
          {t("home")}
        </span>
        <div className="flex flex-wrap gap-2" aria-hidden="true">
          <span className="glass flex items-center gap-2 rounded-full py-2 pr-4 pl-2.5 text-sm font-bold">
            <VideoCameraIcon weight="duotone" className="size-5 text-primary-text" />
            {t("camera")}
          </span>
          <span className="glass flex items-center gap-2 rounded-full py-2 pr-4 pl-2.5 text-sm font-bold">
            <CpuIcon weight="duotone" className="size-5 text-primary-text" />
            {t("model")}
          </span>
        </div>
        <p className="text-sm text-muted-foreground" aria-hidden="true">
          {t("stays")}
        </p>
      </div>
      <div aria-hidden="true" className="relative grid min-h-24 place-items-center md:min-h-0">
        <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-gradient-to-b from-primary/60 to-primary/20 md:inset-x-0 md:inset-y-auto md:top-1/2 md:left-0 md:h-px md:w-auto md:translate-x-0 md:bg-gradient-to-r" />
        <span className="absolute inset-y-0 left-1/2 w-3 -translate-x-1/2 md:hidden">
          <span className="absolute size-3 animate-packet-y rounded-full bg-primary shadow-[0_0_16px_var(--primary)]" />
        </span>
        <span className="absolute inset-x-0 top-1/2 hidden h-3 -translate-y-1/2 md:block">
          <span className="absolute size-3 animate-packet-x rounded-full bg-primary shadow-[0_0_16px_var(--primary)]" />
        </span>
        <span className="glass-strong relative rounded-full px-3 py-1.5 text-xs font-bold whitespace-nowrap">
          {t("packet")}
        </span>
      </div>
      <div className="glass grid content-center gap-3 rounded-xl p-5" aria-hidden="true">
        <span className="flex items-center gap-2 text-sm font-bold">
          <UsersThreeIcon weight="duotone" className="size-5 text-primary-text" />
          {t("family")}
        </span>
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="grid size-12 place-items-center rounded-2xl border border-hairline bg-white/5"
            >
              <DeviceMobileIcon weight="duotone" className="size-6 text-muted-foreground" />
            </span>
          ))}
        </div>
      </div>
    </figure>
  );
}
