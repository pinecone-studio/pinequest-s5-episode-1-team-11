import { type ComponentProps, useId } from "react";
import { cn } from "@/lib/cn";

export type InputProps = ComponentProps<"input"> & {
  label: string;
  /** Persistent help text under the field. */
  hint?: string;
  /** Error text; also marks the field invalid. */
  error?: string;
};

export function Input({ label, hint, error, id, className, ...props }: InputProps) {
  const auto = useId();
  const inputId = id ?? auto;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  return (
    <div className="grid gap-2">
      <label htmlFor={inputId} className="pl-1 text-base font-bold text-muted-foreground">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={[errorId, hintId].filter(Boolean).join(" ") || undefined}
        className={cn(
          "glass min-h-[52px] w-full rounded-md px-4 text-md text-foreground placeholder:text-muted-foreground/70 aria-invalid:border-destructive",
          className,
        )}
        {...props}
      />
      {error && (
        <p id={errorId} className="pl-1 text-sm font-semibold text-destructive-text">
          {error}
        </p>
      )}
      {hint && (
        <p id={hintId} className="pl-1 text-sm text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}
