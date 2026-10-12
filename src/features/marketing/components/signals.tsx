"use client";

import { MicrophoneIcon, VideoCameraIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { type KeyboardEvent, useRef, useState } from "react";
import { EventIcon } from "@/components/domain/event-icon";
import { severityOf } from "@/contracts";
import { cn } from "@/lib/cn";

const kinds = ["fall", "scream", "cry", "glass", "alarm"] as const;
type Kind = (typeof kinds)[number];

/** Bar shapes per sound: a sharp burst, a long wail, a crack, a steady beep. */
const shapes: Record<Exclude<Kind, "fall">, number[]> = {
  scream: [10, 18, 40, 92, 100, 96, 88, 80, 70, 60, 48, 36, 26, 18, 12, 10, 8, 8, 6, 6],
  cry: [20, 40, 60, 50, 66, 54, 70, 58, 64, 52, 68, 56, 62, 50, 66, 54, 60, 48, 56, 44],
  glass: [6, 8, 100, 30, 84, 20, 60, 14, 40, 10, 24, 8, 16, 8, 12, 6, 8, 6, 6, 6],
  alarm: [90, 90, 90, 8, 8, 90, 90, 90, 8, 8, 90, 90, 90, 8, 8, 90, 90, 90, 8, 8],
};

/** Pick a signal and see what Halo watches or listens for. Tabs, so arrow keys move between them. */
export function Signals() {
  const t = useTranslations("marketing.signals");
  const [kind, setKind] = useState<Kind>("fall");
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const severity = severityOf[kind];

  const onKey = (e: KeyboardEvent, i: number) => {
    const delta =
      e.key === "ArrowDown" || e.key === "ArrowRight"
        ? 1
        : e.key === "ArrowUp" || e.key === "ArrowLeft"
          ? -1
          : 0;
    if (!delta) return;
    e.preventDefault();
    const next = (i + delta + kinds.length) % kinds.length;
    setKind(kinds[next]);
    tabs.current[next]?.focus();
  };

  return (
    <section aria-labelledby="signals-title" className="grid gap-8">
      <div className="grid max-w-2xl gap-3">
        <h2 id="signals-title" className="font-display text-[clamp(28px,4.4vw,44px)] leading-[1.1]">
          {t("title")}
        </h2>
        <p className="text-md leading-relaxed text-muted-foreground">{t("body")}</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-6">
        <div
          role="tablist"
          aria-label={t("label")}
          aria-orientation="vertical"
          className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] lg:mx-0 lg:grid lg:overflow-visible lg:px-0"
        >
          {kinds.map((k, i) => {
            const selected = k === kind;
            return (
              <button
                key={k}
                ref={(el) => {
                  tabs.current[i] = el;
                }}
                type="button"
                role="tab"
                id={`signal-tab-${k}`}
                aria-selected={selected}
                aria-controls="signal-panel"
                tabIndex={selected ? 0 : -1}
                onClick={() => setKind(k)}
                onKeyDown={(e) => onKey(e, i)}
                className={cn(
                  "flex min-h-16 shrink-0 snap-start items-center gap-3 rounded-2xl border p-2 pr-4 text-left transition-[background-color,border-color,transform] duration-300 active:scale-[0.98]",
                  selected
                    ? "glass border-white/20"
                    : "border-transparent hover:border-hairline hover:bg-hairline",
                )}
              >
                <EventIcon kind={k} severity={severityOf[k]} />
                <span className="grid">
                  <b className="text-md whitespace-nowrap">{t(`${k}.name`)}</b>
                  <span className="text-sm text-muted-foreground">
                    {k === "fall" ? t("camera") : t("mic")}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <div
          id="signal-panel"
          role="tabpanel"
          aria-labelledby={`signal-tab-${kind}`}
          className="glass relative grid min-h-[340px] content-between gap-6 overflow-hidden rounded-xl p-6 sm:p-8"
        >
          <div
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute -top-24 -right-24 size-72 rounded-full blur-3xl transition-colors duration-500",
              severity === "critical" ? "bg-destructive/25" : "bg-warning/20",
            )}
          />
          <div key={kind} className="relative grid animate-rise gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <EventIcon kind={kind} severity={severity} size="lg" />
              <span
                className={cn(
                  "rounded-full border px-3 py-1 text-sm font-bold",
                  severity === "critical"
                    ? "border-destructive/40 text-destructive-text"
                    : "border-warning/40 text-warning-text",
                )}
              >
                {t(severity === "critical" ? "critical" : "warning")}
              </span>
              <span className="flex items-center gap-1.5 text-sm font-bold text-muted-foreground">
                {kind === "fall" ? (
                  <VideoCameraIcon weight="duotone" className="size-5" aria-hidden="true" />
                ) : (
                  <MicrophoneIcon weight="duotone" className="size-5" aria-hidden="true" />
                )}
                {kind === "fall" ? t("camera") : t("mic")}
              </span>
            </div>
            <h3 className="font-display text-2xl">{t(`${kind}.name`)}</h3>
            <p className="max-w-lg text-md leading-relaxed text-muted-foreground">
              {t(`${kind}.body`)}
            </p>
          </div>
          <div aria-hidden="true" className="relative h-20">
            {kind === "fall" ? (
              <FallTrace />
            ) : (
              <Wave bars={shapes[kind]} critical={severity === "critical"} />
            )}
          </div>
          <p className="relative text-sm text-muted-foreground">{t("note")}</p>
        </div>
      </div>
    </section>
  );
}

function Wave({ bars, critical }: { bars: number[]; critical: boolean }) {
  return (
    <div className="flex h-full items-center gap-1.5">
      {bars.map((h, i) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed decorative bars
          key={i}
          className={cn(
            "w-full animate-wave rounded-full transition-[height] duration-500 ease-[var(--ease-smooth)]",
            critical ? "bg-destructive/70" : "bg-warning/70",
          )}
          style={{ height: `${Math.max(h, 6)}%`, animationDelay: `${-i * 0.07}s` }}
        />
      ))}
    </div>
  );
}

/** Head height over time: steady, a sudden drop, then staying down. */
function FallTrace() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 400 80"
      preserveAspectRatio="none"
      className="size-full overflow-visible"
    >
      <path
        d="M0 14 H170 C190 14 196 66 214 66 H400"
        fill="none"
        stroke="var(--destructive)"
        strokeWidth="3"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        pathLength={1}
        className="[stroke-dasharray:1] animate-draw"
      />
      <line
        x1="0"
        y1="66"
        x2="400"
        y2="66"
        stroke="currentColor"
        strokeOpacity=".15"
        strokeDasharray="4 6"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
