import {
  ArrowRightIcon,
  BellRingingIcon,
  CheckIcon,
  DeviceMobileIcon,
  EyeIcon,
  HeartIcon,
  ShieldCheckIcon,
  VideoCameraIcon,
  WaveformIcon,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { routes } from "@/lib/routes";

export default async function Page() {
  const t = await getTranslations("marketing");
  const features = [
    { key: "detection", Icon: EyeIcon },
    { key: "sound", Icon: WaveformIcon },
    { key: "family", Icon: HeartIcon },
    { key: "privacy", Icon: ShieldCheckIcon },
  ] as const;
  return (
    <>
      <section className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="grid gap-6">
          <Pill dot={false} className="w-fit">
            {t("hero.eyebrow")}
          </Pill>
          <h1 className="max-w-[18ch] font-display text-[36px] leading-tight text-balance sm:text-[44px] lg:text-[52px]">
            {t("hero.title")}
          </h1>
          <p className="max-w-xl text-md leading-relaxed text-muted-foreground">{t("hero.body")}</p>
          <div className="grid gap-3 sm:flex sm:flex-wrap">
            <Button asChild>
              <Link href="/onboarding">
                {t("hero.start")}
                <ArrowRightIcon aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href={routes.monitor}>{t("hero.try")}</Link>
            </Button>
          </div>
          <p className="flex items-start gap-2 text-base text-muted-foreground">
            <ShieldCheckIcon
              className="mt-0.5 size-5 shrink-0 text-primary-text"
              aria-hidden="true"
            />
            {t("hero.privacy")}
          </p>
        </div>
        <div className="glass relative grid gap-5 overflow-hidden rounded-xl p-5 sm:p-8">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-md font-bold">
              <HeartIcon className="size-5 text-primary-text" weight="fill" aria-hidden="true" />
              Halo
            </span>
            <Pill dot={false}>{t("preview.label")}</Pill>
          </div>
          <div
            className="relative grid min-h-48 place-items-center overflow-hidden rounded-lg border border-primary/15 bg-primary/5"
            aria-hidden="true"
          >
            <div className="absolute h-32 w-52 rounded-t-[80px] border border-primary/20" />
            <span className="absolute bottom-6 left-5 h-12 w-20 rounded-t-md border border-primary/20 bg-primary/10" />
            <span className="absolute right-5 bottom-6 h-24 w-12 rounded-t-full border border-primary/20 bg-primary/10" />
            <span className="z-10 grid size-20 place-items-center rounded-full border border-primary/20 bg-card text-primary-text">
              <VideoCameraIcon weight="duotone" className="size-10" />
            </span>
          </div>
          <div className="grid gap-1">
            <h2 className="text-lg font-bold">{t("preview.room")}</h2>
            <p className="text-base text-muted-foreground">{t("preview.caption")}</p>
          </div>
          <div className="flex items-start gap-3 rounded-md border border-warning/25 bg-warning/5 p-4">
            <BellRingingIcon
              weight="duotone"
              className="size-6 shrink-0 text-warning-text"
              aria-hidden="true"
            />
            <div className="grid gap-1">
              <p className="text-md font-bold">{t("preview.alert")}</p>
              <p className="text-base text-muted-foreground">{t("preview.action")}</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{t("preview.example")}</p>
        </div>
      </section>
      <section className="grid gap-6">
        <div className="grid gap-3">
          <h2 className="font-display text-2xl">{t("features.title")}</h2>
          <p className="max-w-2xl text-md text-muted-foreground">{t("features.body")}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {features.map(({ key, Icon }) => (
            <article key={key} className="glass grid gap-3 rounded-lg p-6">
              <Icon weight="duotone" className="size-7 text-primary-text" aria-hidden="true" />
              <h3 className="text-lg font-bold">{t(`features.${key}.title`)}</h3>
              <p className="text-base leading-relaxed text-muted-foreground">
                {t(`features.${key}.body`)}
              </p>
            </article>
          ))}
        </div>
      </section>
      <section className="grid gap-6">
        <h2 className="font-display text-2xl">{t("steps.title")}</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {(["connect", "watch", "review"] as const).map((key, index) => (
            <article key={key} className="grid gap-3 border-t border-hairline pt-5">
              <span className="tabular text-xl font-bold text-primary-text">0{index + 1}</span>
              <h3 className="text-lg font-bold">{t(`steps.${key}.title`)}</h3>
              <p className="text-base leading-relaxed text-muted-foreground">
                {t(`steps.${key}.body`)}
              </p>
            </article>
          ))}
        </div>
      </section>
      <section className="glass grid gap-6 rounded-xl p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="grid gap-3">
          <div className="flex items-center gap-3">
            <DeviceMobileIcon className="size-7 text-primary-text" aria-hidden="true" />
            <h2 className="font-display text-xl">{t("closing.title")}</h2>
          </div>
          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
            {t("closing.body")}
          </p>
          <p className="flex gap-2 text-sm text-muted-foreground">
            <CheckIcon aria-hidden="true" className="size-4 shrink-0" />
            {t("closing.limit")}
          </p>
        </div>
        <Button asChild>
          <Link href="/cameras">
            {t("closing.guide")}
            <ArrowRightIcon aria-hidden="true" />
          </Link>
        </Button>
      </section>
    </>
  );
}
