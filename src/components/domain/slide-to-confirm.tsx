"use client";

import { ArrowRightIcon, CheckIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { type PointerEvent, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * "Би очиж байна" — drag the thumb to the end, or tap it twice (accessible alternative).
 * Prevents accidental confirms on important actions.
 */
export function SlideToConfirm({
  label,
  onConfirm,
  disabled,
  className,
}: {
  label: string;
  onConfirm: () => void;
  disabled?: boolean;
  className?: string;
}) {
  const t = useTranslations("common.slideToConfirm");
  const track = useRef<HTMLDivElement>(null);
  const start = useRef<{ x: number; max: number } | null>(null);
  const [x, setX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [armed, setArmed] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const id = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(id);
  }, [armed]);

  function finish(max: number) {
    setX(max);
    setDone(true);
    navigator.vibrate?.(14);
    setTimeout(onConfirm, 300);
  }

  function onPointerDown(e: PointerEvent<HTMLButtonElement>) {
    if (disabled || done || armed || !track.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = { x: e.clientX, max: track.current.clientWidth - 56 - 16 };
  }
  function onPointerMove(e: PointerEvent<HTMLButtonElement>) {
    const s = start.current;
    if (!s) return;
    const dx = Math.max(0, Math.min(s.max, e.clientX - s.x));
    if (!dragging && dx < 8) return;
    setDragging(true);
    setX(dx);
  }
  function onPointerUp() {
    const s = start.current;
    start.current = null;
    if (!s || !dragging) return;
    setDragging(false);
    if (x >= s.max * 0.86) finish(s.max);
    else setX(0);
  }
  function onClick() {
    if (disabled || done || dragging || x > 0) return;
    if (!armed) {
      setArmed(true);
      navigator.vibrate?.(10);
      return;
    }
    finish(track.current ? track.current.clientWidth - 56 - 16 : 0);
  }

  const max = track.current ? track.current.clientWidth - 72 : 1;
  return (
    <div
      ref={track}
      className={cn("glass-strong relative h-[72px] overflow-hidden rounded-full p-2", className)}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-y-0 left-0 rounded-full bg-[linear-gradient(90deg,transparent,color-mix(in_srgb,var(--primary)_38%,transparent))]",
          !dragging && "transition-[width] duration-300",
        )}
        style={{ width: done ? "100%" : x + 72 }}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 grid content-center gap-1 pl-20 transition-opacity"
        style={{ opacity: armed || done ? 0 : 1 - x / max }}
      >
        <b className="text-lg">{label}</b>
        <small className="text-sm font-semibold text-muted-foreground">{t("hint")}</small>
      </span>
      <button
        type="button"
        disabled={disabled}
        aria-label={armed ? t("again") : `${label}. ${t("hint")}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={onClick}
        className={cn(
          "relative z-10 grid h-14 touch-none place-items-center rounded-full bg-primary font-bold text-primary-foreground shadow-[0_8px_20px_-8px_var(--primary)] disabled:opacity-50",
          armed ? "w-full" : "w-14",
          !dragging && "transition-[transform,width] duration-500 ease-[var(--ease-smooth)]",
        )}
        style={{ transform: armed ? undefined : `translateX(${x}px)` }}
      >
        {done ? (
          <CheckIcon weight="bold" className="size-6" />
        ) : armed ? (
          t("again")
        ) : (
          <ArrowRightIcon weight="bold" className="size-6" />
        )}
      </button>
    </div>
  );
}
