"use client";

import { VideoCameraIcon } from "@phosphor-icons/react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

type Room = { name: string; status: string };

const chipPlace = [
  "left-0 top-[12%] sm:-left-4",
  "right-0 top-[44%] sm:-right-6 [animation-delay:-2.4s]",
  "left-[6%] bottom-[6%] [animation-delay:-4.6s]",
];

/**
 * The app's Home orb at hero scale, ringed by the rooms it watches.
 * Its highlight leans toward the pointer so the page feels alive without moving content.
 */
export function HeroOrb({
  count,
  label,
  rooms,
  caption,
}: {
  count: string;
  label: string;
  rooms: Room[];
  caption: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const box = el.getBoundingClientRect();
        const x = Math.max(-1, Math.min(1, (e.clientX - box.left - box.width / 2) / box.width));
        const y = Math.max(-1, Math.min(1, (e.clientY - box.top - box.height / 2) / box.height));
        el.style.setProperty("--hx", `${34 + x * 14}%`);
        el.style.setProperty("--hy", `${28 + y * 14}%`);
        el.style.setProperty("--tx", `${x * 10}px`);
        el.style.setProperty("--ty", `${y * 10}px`);
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <figure className="relative mx-auto grid w-full max-w-[540px] gap-3">
      <div
        ref={ref}
        aria-hidden="true"
        className="relative grid aspect-square w-full place-items-center [--hx:34%] [--hy:28%] [--st:var(--primary)] [--tx:0px] [--ty:0px]"
      >
        <span className="absolute inset-[4%] rounded-full border border-hairline" />
        <span className="absolute inset-[16%] rounded-full border border-dashed border-hairline" />
        <span className="absolute inset-[10%] animate-sonar rounded-full border-[1.5px] border-[var(--st)] opacity-0" />
        <span className="absolute inset-[10%] animate-sonar rounded-full border-[1.5px] border-[var(--st)] opacity-0 [animation-delay:-4s]" />
        <span className="absolute inset-[24%] translate-x-[var(--tx)] translate-y-[var(--ty)] transition-transform duration-700 ease-[var(--ease-smooth)]">
          <span className="block size-full animate-breathe rounded-full bg-[radial-gradient(circle_at_var(--hx)_var(--hy),var(--orb-highlight)_0%,var(--st)_24%,color-mix(in_srgb,var(--st)_55%,var(--background))_72%,color-mix(in_srgb,var(--st)_22%,var(--background))_100%)] shadow-[0_0_120px_-10px_var(--st)]" />
        </span>
        <span className="relative grid justify-items-center gap-1 text-primary-foreground">
          <b className="font-display text-[clamp(40px,7vw,64px)] leading-none tabular-nums">
            {count}
          </b>
          <span className="text-md font-bold">{label}</span>
        </span>
        {rooms.map((room, i) => (
          <span
            key={room.name}
            className={cn(
              "glass absolute flex animate-float items-center gap-2 rounded-full py-2 pr-4 pl-2 text-sm font-bold",
              chipPlace[i],
            )}
          >
            <span className="grid size-8 place-items-center rounded-full bg-primary/15 text-primary-text">
              <VideoCameraIcon weight="duotone" className="size-4" />
            </span>
            <span className="grid leading-tight">
              {room.name}
              <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <span className="size-1.5 rounded-full bg-primary" />
                {room.status}
              </span>
            </span>
          </span>
        ))}
      </div>
      <figcaption className="text-center text-xs text-muted-foreground">{caption}</figcaption>
    </figure>
  );
}
