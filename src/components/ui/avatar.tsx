import { cn } from "@/lib/cn";

const sizes = { sm: "size-8 text-xs", md: "size-11 text-base", lg: "size-16 text-lg" } as const;
const rings = {
  none: "",
  ok: "ring-2 ring-primary ring-offset-2 ring-offset-background",
  rest: "ring-2 ring-muted-foreground ring-offset-2 ring-offset-background",
  alert: "ring-2 ring-destructive ring-offset-2 ring-offset-background animate-pulse",
} as const;

/** Round initials badge. The ring shows the person's state: active, resting, or in danger. */
export function Avatar({
  name,
  size = "md",
  ring = "none",
  className,
}: {
  name: string;
  size?: keyof typeof sizes;
  ring?: keyof typeof rings;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-grid shrink-0 place-items-center rounded-full border border-glass-border bg-muted font-bold uppercase",
        sizes[size],
        rings[ring],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

/** "Дулмаа эмээ" → "ДЭ", "Тэмүүлэн" → "ТЭ". */
export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
