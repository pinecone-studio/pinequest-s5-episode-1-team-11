"use client";

import { CheckIcon, CpuIcon, MicrophoneIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { EventIcon } from "@/components/domain/event-icon";
import { cn } from "@/lib/cn";
import { HaloMark } from "./halo-mark";

const steps = ["watch", "detect", "notify", "respond"] as const;
type Step = (typeof steps)[number];

/**
 * Scroll story: the text column scrolls past a sticky stage, and the stage plays the
 * moment step by step (camera → fall → push → seen). Every step is also readable as text.
 */
export function Story() {
  const t = useTranslations("marketing.story");
  const [active, setActive] = useState(0);
  const items = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.index));
        }
      },
      { rootMargin: "-48% 0px -48% 0px" },
    );
    for (const el of items.current) if (el) observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const goTo = (index: number) => {
    const el = items.current[index];
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
  };

  return (
    <section aria-labelledby="story-title" className="grid gap-8">
      <div className="grid max-w-2xl gap-3">
        <h2 id="story-title" className="font-display text-[clamp(28px,4.4vw,44px)] leading-[1.1]">
          {t("title")}
        </h2>
        <p className="text-md leading-relaxed text-muted-foreground">{t("body")}</p>
      </div>
      <div className="relative flex flex-col lg:grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-12">
        <div className="sticky top-0 z-10 -mx-5 bg-background/80 px-5 pt-[76px] pb-2 backdrop-blur-xl [mask-image:linear-gradient(to_bottom,black_calc(100%-12px),transparent)] md:-mx-8 md:px-8 lg:static lg:order-2 lg:mx-0 lg:bg-transparent lg:px-0 lg:pt-0 lg:pb-0 lg:backdrop-blur-none lg:[mask-image:none]">
          <div className="lg:sticky lg:top-28">
            <Stage step={steps[active]} />
            <div className="mt-3 flex items-center justify-between gap-3">
              <ol aria-label={t("progress")} className="flex gap-1.5">
                {steps.map((step, i) => (
                  <li key={step}>
                    <button
                      type="button"
                      onClick={() => goTo(i)}
                      aria-current={i === active ? "step" : undefined}
                      className="group grid min-h-11 place-items-center px-1"
                    >
                      <span className="sr-only">{t(`${step}.label`)}</span>
                      <span
                        aria-hidden="true"
                        className={cn(
                          "block h-1.5 rounded-full transition-all duration-500 ease-[var(--ease-smooth)]",
                          i === active
                            ? "w-10 bg-primary"
                            : "w-4 bg-foreground/20 group-hover:bg-foreground/40",
                        )}
                      />
                    </button>
                  </li>
                ))}
              </ol>
              <p className="text-right text-xs text-muted-foreground">{t("example")}</p>
            </div>
          </div>
        </div>
        <ol className="grid lg:order-1">
          {steps.map((step, i) => (
            <li
              key={step}
              ref={(el) => {
                items.current[i] = el;
              }}
              data-index={i}
              className="flex min-h-[46vh] items-center py-6 lg:min-h-[78vh]"
            >
              <div
                className={cn(
                  "grid gap-3 transition-opacity duration-500",
                  i === active ? "opacity-100" : "opacity-40",
                )}
              >
                <span
                  className={cn(
                    "w-fit rounded-full border px-3 py-1 text-sm font-bold transition-colors duration-500",
                    i === active
                      ? step === "detect" || step === "notify"
                        ? "border-destructive/40 bg-destructive/12 text-destructive-text"
                        : "border-primary/40 bg-primary/12 text-primary-text"
                      : "border-hairline text-muted-foreground",
                  )}
                >
                  {i + 1} · {t(`${step}.label`)}
                </span>
                <h3 className="font-display text-[clamp(22px,3vw,30px)] leading-tight">
                  {t(`${step}.title`)}
                </h3>
                <p className="max-w-md text-md leading-relaxed text-muted-foreground">
                  {t(`${step}.body`)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/** The illustrated moment. Decorative: the step text says the same thing. */
function Stage({ step }: { step: Step }) {
  const t = useTranslations("marketing.story.stage");
  const fallen = step !== "watch";
  const alarm = step === "detect" || step === "notify";
  const onPhone = step === "notify" || step === "respond";
  return (
    <div
      aria-hidden="true"
      className="glass-strong relative h-[320px] overflow-hidden rounded-xl sm:h-[380px] lg:h-[min(560px,70vh)]"
    >
      <div className="absolute inset-0 bg-aurora-calm opacity-70" />
      <div
        className={cn(
          "absolute inset-0 bg-aurora-alert transition-opacity duration-700",
          alarm ? "opacity-60" : "opacity-0",
        )}
      />

      {/* Camera view */}
      <div
        className={cn(
          "absolute inset-3 overflow-hidden rounded-lg border border-white/10 bg-black/35 transition-[opacity,transform,filter] duration-700 ease-[var(--ease-smooth)] sm:inset-4",
          onPhone && "scale-[0.92] opacity-35 blur-[3px]",
        )}
      >
        <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-2 p-3 text-xs font-bold text-white/85">
          <span className="flex items-center gap-2">
            <span
              className={cn(
                "size-2 rounded-full",
                alarm ? "animate-blink bg-destructive" : "bg-primary",
              )}
            />
            {t("room")} · {t("watching")}
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-2 py-1">
            <CpuIcon className="size-3.5" />
            {t("onDevice")}
          </span>
        </div>
        <Room />
        <Skeleton fallen={fallen} alarm={alarm} label={t("fall")} />
        <div className="absolute right-3 bottom-3 left-3 flex items-center gap-2 text-white/70">
          <MicrophoneIcon className="size-4 shrink-0" />
          <span className="flex h-6 flex-1 items-center gap-[3px]">
            {wave.map((h, i) => (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: fixed decorative bars
                key={i}
                className={cn(
                  "w-full origin-center animate-wave rounded-full",
                  alarm ? "bg-destructive/80" : "bg-white/40",
                )}
                style={{ height: `${h}%`, animationDelay: `${-i * 0.09}s` }}
              />
            ))}
          </span>
        </div>
        {/* Viewfinder corners */}
        <span className="absolute top-10 left-3 size-5 rounded-tl-md border-t-2 border-l-2 border-white/30" />
        <span className="absolute top-10 right-3 size-5 rounded-tr-md border-t-2 border-r-2 border-white/30" />
      </div>

      {/* Caregiver's phone */}
      <div
        className={cn(
          "absolute top-1/2 left-1/2 aspect-[9/16] h-[92%] -translate-x-1/2 transition-[opacity,transform] duration-700 ease-[var(--ease-smooth)]",
          onPhone ? "-translate-y-1/2 opacity-100" : "translate-y-[20%] opacity-0",
        )}
      >
        <div className="relative size-full overflow-hidden rounded-[34px] border-[5px] border-black/70 bg-background shadow-[0_30px_60px_-20px_rgb(0_0_0/0.8)]">
          <div
            className={cn(
              "absolute inset-0 transition-opacity duration-700",
              step === "respond" ? "bg-aurora-calm opacity-100" : "bg-aurora-alert opacity-100",
            )}
          />
          <div className="absolute top-2 left-1/2 h-4 w-16 -translate-x-1/2 rounded-full bg-black/80" />
          <p className="relative mt-9 text-center font-display text-[34px] leading-none text-white tabular-nums">
            {t("time")}
          </p>
          {/* Push */}
          <div
            className={cn(
              "glass-strong absolute inset-x-2.5 top-[30%] rounded-2xl p-2.5 transition-[opacity,transform] duration-500 ease-[var(--ease-snappy)]",
              step === "notify"
                ? "translate-y-0 opacity-100 delay-300"
                : "-translate-y-6 opacity-0",
            )}
          >
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
              <HaloMark className="size-3.5" />
              Halo
              <span className="ml-auto font-semibold">{t("now")}</span>
            </div>
            <div className="mt-1.5 flex items-start gap-2">
              <EventIcon
                kind="fall"
                severity="critical"
                size="sm"
                className="size-8 [&_svg]:size-4"
              />
              <span className="grid min-w-0">
                <b className="text-sm">{t("fall")}</b>
                <span className="text-[11px] leading-4 text-muted-foreground">{t("pushBody")}</span>
              </span>
            </div>
          </div>
          {/* Seen */}
          <div
            className={cn(
              "absolute inset-x-0 top-[24%] grid justify-items-center gap-3 px-3 transition-[opacity,transform] duration-500",
              step === "respond"
                ? "translate-y-0 opacity-100 delay-200"
                : "translate-y-4 opacity-0",
            )}
          >
            <span className="relative grid size-24 place-items-center">
              <span className="absolute inset-0 animate-sonar rounded-full border-[1.5px] border-primary opacity-0" />
              <span className="size-16 animate-breathe rounded-full bg-[radial-gradient(circle_at_34%_28%,var(--orb-highlight)_0%,var(--primary)_30%,color-mix(in_srgb,var(--primary)_40%,var(--background))_100%)] shadow-[0_0_40px_-4px_var(--primary)]" />
            </span>
            <b className="font-display text-base text-white">{t("calm")}</b>
            <span className="glass grid w-full gap-2 rounded-2xl p-2 text-left">
              <span className="flex min-w-0 items-center gap-2">
                <EventIcon
                  kind="fall"
                  severity="critical"
                  size="sm"
                  className="size-7 rounded-[10px] [&_svg]:size-4"
                />
                <b className="min-w-0 text-xs leading-tight">{t("fall")}</b>
              </span>
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="flex items-center gap-1 rounded-full bg-primary/15 px-2 py-1 text-[11px] font-bold text-primary-text">
                  <CheckIcon weight="bold" className="size-3" />
                  {t("seen")}
                </span>
                <span className="text-[11px] leading-tight text-muted-foreground">
                  {t("seenBy")}
                </span>
              </span>
            </span>
          </div>
          {/* Heartbeat while it is unanswered */}
          <span
            className={cn(
              "absolute bottom-[12%] left-1/2 size-14 -translate-x-1/2 animate-heartbeat rounded-full bg-[radial-gradient(circle_at_34%_28%,#fee2e2_0%,var(--destructive)_30%,#7f1d1d_100%)] shadow-[0_0_40px_-4px_var(--destructive)] transition-opacity duration-500",
              step === "notify" ? "opacity-100" : "opacity-0",
            )}
          />
        </div>
      </div>
    </div>
  );
}

const wave = [
  30, 55, 40, 70, 45, 85, 60, 35, 75, 50, 90, 40, 65, 30, 80, 55, 45, 70, 35, 60, 50, 85, 40, 30,
];

/** A quiet living room drawn in hairlines. */
function Room() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 400 300"
      preserveAspectRatio="xMidYMax slice"
      className="absolute inset-0 size-full text-white"
    >
      <line x1="0" y1="232" x2="400" y2="232" stroke="currentColor" strokeOpacity=".18" />
      <rect
        x="28"
        y="70"
        width="70"
        height="90"
        rx="6"
        fill="none"
        stroke="currentColor"
        strokeOpacity=".14"
      />
      <line x1="63" y1="70" x2="63" y2="160" stroke="currentColor" strokeOpacity=".1" />
      <path
        d="M262 232v-46a14 14 0 0 1 14-14h84a14 14 0 0 1 14 14v46M254 204h128v28H254z"
        fill="currentColor"
        fillOpacity=".05"
        stroke="currentColor"
        strokeOpacity=".2"
      />
      <path
        d="M312 120a22 22 0 0 1 44 0z"
        fill="currentColor"
        fillOpacity=".06"
        stroke="currentColor"
        strokeOpacity=".18"
      />
      <line x1="334" y1="120" x2="334" y2="172" stroke="currentColor" strokeOpacity=".18" />
    </svg>
  );
}

/** Pose keypoints the way the detector sees a person. Tips over when a fall is detected. */
function Skeleton({ fallen, alarm, label }: { fallen: boolean; alarm: boolean; label: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 400 300"
      preserveAspectRatio="xMidYMax slice"
      className="absolute inset-0 size-full"
    >
      <g transform="translate(26 0)">
        <g
          className="transition-transform duration-[900ms] ease-[var(--ease-smooth)] [transform-box:view-box]"
          style={{
            transformOrigin: "176px 232px",
            transform: fallen ? "rotate(-84deg)" : "none",
          }}
        >
          <g
            fill="none"
            stroke={alarm ? "var(--destructive)" : "var(--primary)"}
            strokeWidth="3"
            strokeLinecap="round"
            className="transition-[stroke] duration-500"
          >
            <path d="M176 112v52M176 122l-20 28M176 122l20 26M176 164l-14 34l-4 34M176 164l14 34l4 34" />
            <circle cx="176" cy="98" r="12" />
          </g>
          <g fill="white">
            {[
              [176, 122],
              [156, 150],
              [196, 148],
              [176, 164],
              [162, 198],
              [190, 198],
              [158, 232],
              [194, 232],
            ].map(([cx, cy]) => (
              <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3.5" />
            ))}
          </g>
        </g>
        <g className="transition-opacity duration-500" style={{ opacity: alarm ? 1 : 0 }}>
          <rect
            x="22"
            y="188"
            width="194"
            height="72"
            rx="10"
            fill="none"
            stroke="var(--destructive)"
            strokeWidth="2"
            strokeDasharray="8 6"
          />
          <rect
            x="22"
            y="158"
            width={label.length * 8 + 24}
            height="24"
            rx="12"
            fill="var(--destructive)"
          />
          <text
            x="34"
            y="174"
            fill="white"
            fontSize="12"
            fontWeight="700"
            fontFamily="var(--font-sans)"
          >
            {label}
          </text>
        </g>
      </g>
    </svg>
  );
}
