"use client";

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  DeviceMobileCameraIcon,
  HouseIcon,
  ShieldCheckIcon,
} from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { EventIcon } from "@/components/domain/event-icon";
import { StatusRing } from "@/components/domain/status-ring";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { completeOnboarding } from "../actions";

const slides = ["home", "detect", "alerts", "privacy"] as const;
type Slide = (typeof slides)[number];
const detected = ["fall", "scream", "cry", "glass", "alarm"] as const;

/** Each slide shows the real product piece it talks about, not a generic icon. */
function Hero({ slide }: { slide: Slide }) {
  const t = useTranslations("onboarding");
  const common = useTranslations("common");
  if (slide === "home")
    return (
      <StatusRing state="calm">
        <HouseIcon weight="duotone" className="size-14" />
      </StatusRing>
    );
  if (slide === "detect")
    return (
      <div className="grid justify-items-center gap-6">
        <StatusRing state="warning" className="size-[168px]">
          <DeviceMobileCameraIcon weight="duotone" className="size-12" />
        </StatusRing>
        <ul className="flex flex-wrap justify-center gap-2">
          {detected.map((kind) => (
            <li key={kind}>
              <EventIcon
                kind={kind}
                severity={kind === "fall" || kind === "alarm" ? "critical" : "warning"}
                size="sm"
              />
            </li>
          ))}
        </ul>
      </div>
    );
  if (slide === "alerts")
    return (
      <div className="grid w-full max-w-xs gap-3" aria-hidden="true">
        <div className="glass-strong flex items-start gap-3 rounded-lg p-4 text-left shadow-[0_24px_60px_-28px_var(--destructive)]">
          <EventIcon kind="fall" severity="critical" />
          <div className="min-w-0">
            <p className="text-xs font-bold text-muted-foreground">
              {common("appName")} · {t("now")}
            </p>
            <p className="font-bold">{common("eventKind.fall")}</p>
            <p className="text-sm text-muted-foreground">{t("sampleRoom")}</p>
          </div>
        </div>
        <div className="glass flex items-center gap-3 rounded-lg p-3 text-left opacity-70">
          <EventIcon kind="scream" severity="warning" size="sm" />
          <p className="text-sm font-bold">{common("eventKind.scream")}</p>
        </div>
      </div>
    );
  return (
    <StatusRing state="calm">
      <ShieldCheckIcon weight="duotone" className="size-14" />
    </StatusRing>
  );
}

export function IntroSlides() {
  const t = useTranslations("onboarding");
  const common = useTranslations("common");
  const reduceMotion = useReducedMotion();
  const [[index, direction], setPage] = useState<[number, number]>([0, 1]);
  const slide = slides[index];
  const last = index === slides.length - 1;
  const go = (next: number) => {
    if (next < 0 || next >= slides.length) return;
    setPage([next, next > index ? 1 : -1]);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") setPage(([i]) => [Math.min(i + 1, slides.length - 1), 1]);
      if (event.key === "ArrowLeft") setPage(([i]) => [Math.max(i - 1, 0), -1]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const offset = reduceMotion ? 0 : 48;
  return (
    <section
      aria-roledescription="carousel"
      aria-label={t("title")}
      className="mx-auto grid min-h-[calc(100dvh-64px)] w-full max-w-md grid-rows-[auto_1fr_auto] gap-6 md:max-w-lg"
    >
      <header className="flex items-center justify-between">
        <p className="font-display text-xl">{common("appName")}</p>
        <form action={completeOnboarding}>
          <Button type="submit" variant="ghost" size="sm">
            {t("skip")}
          </Button>
        </form>
      </header>

      <AnimatePresence mode="wait" initial={false} custom={direction}>
        <motion.div
          key={slide}
          custom={direction}
          initial={{ opacity: 0, x: direction * offset }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -direction * offset }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          drag={reduceMotion ? false : "x"}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.18}
          onDragEnd={(_, info) => {
            if (info.offset.x < -60) go(index + 1);
            if (info.offset.x > 60) go(index - 1);
          }}
          aria-live="polite"
          className="grid touch-pan-y content-center justify-items-center gap-10 text-center"
        >
          <div className="grid min-h-[236px] place-items-center">
            <Hero slide={slide} />
          </div>
          <div className="grid gap-3">
            <p className="text-sm font-bold text-primary-text tabular">
              {index + 1} / {slides.length}
            </p>
            <h1 className="font-display text-[28px] leading-9 text-balance md:text-4xl md:leading-[44px]">
              {t(`slides.${slide}.title`)}
            </h1>
            <p className="mx-auto max-w-sm text-md text-pretty text-muted-foreground">
              {t(`slides.${slide}.description`)}
            </p>
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="grid gap-6 pb-[max(8px,env(safe-area-inset-bottom))]">
        <nav aria-label={t("slideNavigation")} className="flex justify-center">
          {slides.map((item, i) => (
            <button
              key={item}
              type="button"
              aria-label={t("goToSlide", { number: i + 1 })}
              aria-current={i === index ? "step" : undefined}
              onClick={() => go(i)}
              className="grid size-6 place-items-center"
            >
              <span
                className={cn(
                  "h-2 rounded-full transition-[width,background-color] duration-300",
                  i === index ? "w-6 bg-primary" : "w-2 bg-muted-foreground/40",
                )}
              />
            </button>
          ))}
        </nav>
        <div className="grid grid-cols-[1fr_2fr] gap-3">
          <Button
            variant="secondary"
            onClick={() => go(index - 1)}
            className={cn(index === 0 && "invisible")}
            aria-hidden={index === 0 || undefined}
            tabIndex={index === 0 ? -1 : undefined}
          >
            <ArrowLeftIcon aria-hidden="true" />
            {t("back")}
          </Button>
          {last ? (
            <form action={completeOnboarding} className="grid">
              <Button type="submit">
                {t("start")}
                <ArrowRightIcon aria-hidden="true" />
              </Button>
            </form>
          ) : (
            <Button onClick={() => go(index + 1)}>
              {t("next")}
              <ArrowRightIcon aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
