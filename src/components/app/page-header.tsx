import type { ReactNode } from "react";

/** Large screen title with an optional subtitle and a button on the right. */
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="flex items-start justify-between gap-3 pt-2">
      <div className="grid min-w-0 gap-0.5">
        <h1 className="font-display text-[26px] leading-8 text-balance lg:text-[32px] lg:leading-10">
          {title}
        </h1>
        {subtitle && <p className="text-base font-semibold text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}
