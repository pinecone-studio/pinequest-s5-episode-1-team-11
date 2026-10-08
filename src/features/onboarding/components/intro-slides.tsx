"use client";

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BellRingingIcon,
  HeartIcon,
  HouseIcon,
  ShieldCheckIcon,
} from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { completeOnboarding } from "../actions";

const slides = [
  { key: "home", Icon: HouseIcon },
  { key: "care", Icon: HeartIcon },
  { key: "alerts", Icon: BellRingingIcon },
  { key: "privacy", Icon: ShieldCheckIcon },
] as const;

export function IntroSlides() {
  const t = useTranslations("onboarding");
  const [currentSlide, setCurrentSlide] = useState(0);
  const isLastSlide = currentSlide === slides.length - 1;
  const { key, Icon } = slides[currentSlide];

  return (
    <section
      aria-label={t("title")}
      className="mx-auto grid w-full max-w-md gap-8 md:max-w-xl md:gap-10"
    >
      <header className="flex items-center justify-between">
        <p className="font-display text-xl font-bold text-primary-text">{t("brand")}</p>
        <form action={completeOnboarding}>
          <Button type="submit" variant="ghost" size="sm">
            {t("skip")}
          </Button>
        </form>
      </header>

      <div className="grid justify-items-center gap-8 text-center">
        <div
          aria-hidden="true"
          className="relative grid size-56 place-items-center rounded-full bg-primary/10 md:size-64"
        >
          <div className="grid size-36 place-items-center rounded-full bg-card shadow-xl md:size-40">
            <Icon className="size-16 text-primary md:size-20" weight="duotone" />
          </div>
          <span className="absolute right-8 top-8 size-4 rounded-full bg-primary/40" />
          <span className="absolute bottom-9 left-7 size-3 rounded-full bg-primary/60" />
        </div>

        <div className="grid gap-3">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">
            {t("step", { current: currentSlide + 1, total: slides.length })}
          </p>
          <h1 className="font-display text-3xl font-bold leading-tight text-primary-text md:text-4xl">
            {t(`slides.${key}.title`)}
          </h1>
          <p className="mx-auto max-w-md text-base leading-relaxed text-muted-foreground md:text-lg">
            {t(`slides.${key}.description`)}
          </p>
        </div>
      </div>

      <nav aria-label={t("slideNavigation")} className="flex justify-center gap-2">
        {slides.map((slide, index) => (
          <button
            key={slide.key}
            type="button"
            aria-label={t("goToSlide", { number: index + 1 })}
            aria-current={index === currentSlide ? "step" : undefined}
            onClick={() => setCurrentSlide(index)}
            className={`h-2.5 rounded-full transition-all ${
              index === currentSlide ? "w-8 bg-primary" : "w-2.5 bg-muted-foreground/30"
            }`}
          />
        ))}
      </nav>

      <div className="grid grid-cols-[1fr_2fr] gap-3">
        <Button
          variant="secondary"
          disabled={currentSlide === 0}
          onClick={() => setCurrentSlide((slide) => slide - 1)}
        >
          <ArrowLeftIcon aria-hidden="true" />
          {t("back")}
        </Button>
        {isLastSlide ? (
          <form action={completeOnboarding}>
            <Button type="submit" block>
              {t("start")}
              <ArrowRightIcon aria-hidden="true" />
            </Button>
          </form>
        ) : (
          <Button onClick={() => setCurrentSlide((slide) => slide + 1)}>
            {t("next")}
            <ArrowRightIcon aria-hidden="true" />
          </Button>
        )}
      </div>
    </section>
  );
}
