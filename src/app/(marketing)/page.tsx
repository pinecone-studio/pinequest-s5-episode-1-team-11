import { ArrowDownIcon, ArrowRightIcon, CheckIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { HaloMark } from "@/features/marketing/components/halo-mark";
import {
  Closing,
  Detections,
  LiveDemo,
  RevealTitle,
  Steps,
} from "@/features/marketing/components/landing-motion";
import { getDemoFixtures } from "@/lib/data/demo";

export default async function Page() {
  const [t, demo] = await Promise.all([getTranslations("marketing"), getDemoFixtures()]);
  return (
    <>
      <section className="relative grid min-h-[calc(100dvh-120px)] items-center gap-12 pt-4 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8">
        {/* Quiet dotted grid fading out from the centre, with one soft accent glow. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-x-[50vw] -inset-y-24 -z-10 bg-[radial-gradient(var(--hairline)_1.2px,transparent_1.2px)] [background-size:24px_24px] [mask-image:radial-gradient(60%_60%_at_60%_45%,black,transparent)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/4 right-0 -z-10 size-[520px] rounded-full bg-primary/15 blur-[120px]"
        />
        <div className="grid gap-7">
          <span className="glass inline-flex w-fit animate-rise items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-bold">
            <span aria-hidden="true" className="size-2 animate-blink rounded-full bg-primary" />
            {t("hero.eyebrow")}
          </span>
          <RevealTitle
            text={t("hero.title")}
            accent={2}
            className="max-w-[12ch] font-display text-[clamp(44px,6vw,80px)] leading-[1] tracking-[-0.03em] text-balance"
          />
          <p className="max-w-[44ch] animate-rise text-lg leading-relaxed text-muted-foreground [animation-delay:300ms]">
            {t("hero.body")}
          </p>
          <div className="grid animate-rise gap-3 [animation-delay:420ms] sm:flex sm:flex-wrap">
            <Button asChild size="lg">
              <Link href="/onboarding">
                {t("hero.start")}
                <ArrowRightIcon aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="ghost">
              <a href="#how">
                {t("hero.how")}
                <ArrowDownIcon aria-hidden="true" />
              </a>
            </Button>
          </div>
          <ul className="grid animate-rise grid-cols-3 gap-4 border-t border-hairline pt-6 [animation-delay:540ms] sm:max-w-md">
            {(["watch", "kinds", "private"] as const).map((fact) => (
              <li key={fact} className="grid gap-0.5">
                <b className="font-display text-2xl">{t(`hero.facts.${fact}.value`)}</b>
                <span className="text-sm text-muted-foreground">
                  {t(`hero.facts.${fact}.label`)}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <LiveDemo
          name={demo.profile.name}
          devices={demo.devices}
          events={demo.events}
          people={demo.watchedPeople.length}
        />
      </section>

      <Detections />

      <Steps />

      <Closing>
        <HaloMark className="relative size-14 animate-breathe shadow-[0_0_48px_-4px_var(--primary)]" />
        <h2 className="relative max-w-[18ch] font-display text-[clamp(28px,4.4vw,48px)] leading-[1.1] text-balance">
          {t("closing.title")}
        </h2>
        <Button asChild size="lg" className="relative">
          <Link href="/onboarding">
            {t("closing.start")}
            <ArrowRightIcon aria-hidden="true" />
          </Link>
        </Button>
        <p className="relative flex max-w-[56ch] gap-2 text-sm text-muted-foreground">
          <CheckIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {t("closing.limit")}
        </p>
      </Closing>
    </>
  );
}
