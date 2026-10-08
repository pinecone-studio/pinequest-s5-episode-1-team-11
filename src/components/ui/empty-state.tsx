import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Shown when a list has nothing yet: what is missing and what to do next. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid justify-items-center gap-2 px-6 py-12 text-center", className)}>
      {icon && <span className="mb-1 text-primary-text [&_svg]:size-8">{icon}</span>}
      <p className="text-md font-bold">{title}</p>
      {description && <p className="max-w-[32ch] text-base text-muted-foreground">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
