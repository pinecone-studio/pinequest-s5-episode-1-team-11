"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";

export type SegmentedOption<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  options: readonly SegmentedOption<T>[];
  value: T;
  onValueChange: (value: T) => void;
  /** Describes the group for screen readers, e.g. "Шүүлтүүр". */
  label: string;
  className?: string;
};

/** One-of-N switcher with a sliding highlight. Native radios, so arrow keys work. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onValueChange,
  label,
  className,
}: Props<T>) {
  const name = useId();
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  return (
    <fieldset
      className={cn("glass relative m-0 grid min-h-[52px] min-w-0 rounded-full p-1", className)}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      <legend className="sr-only">{label}</legend>
      <span
        aria-hidden="true"
        className="absolute inset-y-1 left-1 rounded-full border border-white/15 bg-white/12 transition-transform duration-[380ms] ease-[var(--ease-snappy)]"
        style={{
          width: `calc((100% - 8px) / ${options.length})`,
          transform: `translateX(${index * 100}%)`,
        }}
      />
      {options.map((o) => (
        <label
          key={o.value}
          className="relative z-10 grid min-h-11 cursor-pointer place-items-center rounded-full px-1 text-center text-sm font-bold text-muted-foreground transition-colors has-checked:text-foreground has-focus-visible:outline-3 has-focus-visible:outline-ring"
        >
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={o.value === value}
            onChange={() => onValueChange(o.value)}
            className="sr-only"
          />
          {o.label}
        </label>
      ))}
    </fieldset>
  );
}
