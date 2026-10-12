import {
  ArrowRightIcon,
  BellRingingIcon,
  CheckIcon,
  LinkSimpleIcon,
  ShieldCheckIcon,
  VideoCameraIcon,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { HaloMark } from "@/features/marketing/components/halo-mark";
import { HeroOrb } from "@/features/marketing/components/hero-orb";
import { PrivacyBoundary } from "@/features/marketing/components/privacy-boundary";
import { Signals } from "@/features/marketing/components/signals";
import { Story } from "@/features/marketing/components/story";
import { routes } from "@/lib/routes";

export default async function Page() {
  const t = await getTranslations("marketing");
  const steps = [
    { key: "connect", Icon: LinkSimpleIcon },
    { key: "watch", Icon: VideoCameraIcon },
    { key: "review", Icon: BellRingingIcon },
  ] as const;
  return (
    <>
      <section className="grid min-h-[calc(100dvh-120px)] items-center gap-10 pt-4 lg:grid-cols-[1.05fr_0.95fr] lg:gap-6">
        <div className="grid gap-7">
          <h1 className="max-w-[12ch] font-display text-[clamp(40px,7.4vw,76px)] leading-[1.02] tracking-[-0.025em] text-balance">
            {t("hero.title")}
          </h1>
          <p className="max-w-[52ch] text-lg leading-relaxed text-muted-foreground">
            {t("hero.body")}
          </p>
          <div className="grid gap-3 sm:flex sm:flex-wrap">
            <Button asChild size="lg">
              <Link href="/onboarding">
                {t("hero.start")}
                <ArrowRightIcon aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href={routes.monitor}>{t("hero.try")}</Link>
            </Button>
          </div>
          <p className="flex max-w-[52ch] items-start gap-2 text-base text-muted-foreground">
            <ShieldCheckIcon
              weight="duotone"
              className="mt-0.5 size-5 shrink-0 text-primary-text"
              aria-hidden="true"
            />
            {t("hero.privacy")}
          </p>
        </div>
        <HeroOrb
          count={t("hero.orbCount")}
          label={t("hero.orbLabel")}
          caption={t("hero.example")}
          rooms={(["living", "bedroom", "kitchen"] as const).map((key) => ({
            name: t(`hero.rooms.${key}`),
            status: t("hero.online"),
          }))}
        />
      </section>

      <Story />

      <Signals />

      <section aria-labelledby="boundary-title" className="grid gap-8">
        <div className="grid max-w-2xl gap-3">
          <h2
            id="boundary-title"
            className="font-display text-[clamp(28px,4.4vw,44px)] leading-[1.1]"
          >
            {t("boundary.title")}
          </h2>
          <p className="text-md leading-relaxed text-muted-foreground">{t("boundary.body")}</p>
        </div>
        <PrivacyBoundary />
        <Link
          href="/privacy"
          className="flex min-h-11 w-fit items-center gap-2 text-base font-bold text-primary-text underline-offset-4 hover:underline"
        >
          {t("boundary.more")}
          <ArrowRightIcon aria-hidden="true" className="size-4" />
        </Link>
      </section>

      <section aria-labelledby="steps-title" className="grid gap-8">
        <h2 id="steps-title" className="font-display text-[clamp(28px,4.4vw,44px)] leading-[1.1]">
          {t("steps.title")}
        </h2>
        <ol className="relative grid gap-8 md:grid-cols-3 md:gap-6">
          <span
            aria-hidden="true"
            className="absolute top-7 bottom-7 left-7 w-px bg-hairline md:top-7 md:right-[16%] md:bottom-auto md:left-[10%] md:h-px md:w-auto"
          />
          {steps.map(({ key, Icon }, index) => (
            <li key={key} className="relative grid grid-cols-[56px_1fr] gap-4 md:grid-cols-1">
              <span className="glass-strong relative grid size-14 place-items-center rounded-full text-primary-text">
                <Icon weight="duotone" className="size-6" aria-hidden="true" />
                <b className="absolute -top-1 -right-1 grid size-6 place-items-center rounded-full bg-primary text-xs text-primary-foreground tabular-nums">
                  {index + 1}
                </b>
              </span>
              <div className="grid content-start gap-2">
                <h3 className="text-lg font-bold">{t(`steps.${key}.title`)}</h3>
                <p className="max-w-sm text-base leading-relaxed text-muted-foreground">
                  {t(`steps.${key}.body`)}
                </p>
                {key === "connect" && (
                  <span
                    aria-hidden="true"
                    className="glass mt-1 w-fit rounded-xl px-4 py-2 font-display text-xl tracking-[0.12em] tabular-nums"
                  >
                    {t("steps.code")}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="glass relative grid justify-items-center gap-5 overflow-hidden rounded-xl px-6 py-14 text-center sm:px-10 lg:py-20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-40 left-1/2 size-[420px] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl"
        />
        <HaloMark className="relative size-14 animate-breathe shadow-[0_0_48px_-4px_var(--primary)]" />
        <h2 className="relative max-w-[18ch] font-display text-[clamp(28px,4.4vw,44px)] leading-[1.1] text-balance">
          {t("closing.title")}
        </h2>
        <p className="relative max-w-[56ch] text-md leading-relaxed text-muted-foreground">
          {t("closing.body")}
        </p>
        <div className="relative grid w-full gap-3 sm:flex sm:w-auto sm:flex-wrap sm:justify-center">
          <Button asChild size="lg">
            <Link href="/onboarding">
              {t("closing.start")}
              <ArrowRightIcon aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link href="/cameras">{t("closing.guide")}</Link>
          </Button>
        </div>
        <p className="relative flex max-w-[56ch] gap-2 text-sm text-muted-foreground">
          <CheckIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {t("closing.limit")}
        </p>
      </section>
    </>
  );
}
