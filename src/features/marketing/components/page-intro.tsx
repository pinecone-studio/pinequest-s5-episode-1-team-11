import type { ReactNode } from "react";

/** Title block for the public reading pages: one display headline and a short lead. */
export function PageIntro({
  title,
  lead,
  children,
}: {
  title: string;
  lead: string;
  children?: ReactNode;
}) {
  return (
    <header className="grid max-w-3xl gap-4">
      <h1 className="font-display text-[clamp(34px,5.6vw,60px)] leading-[1.05] tracking-[-0.02em] text-balance">
        {title}
      </h1>
      <p className="max-w-[56ch] text-lg leading-relaxed text-muted-foreground">{lead}</p>
      {children}
    </header>
  );
}
