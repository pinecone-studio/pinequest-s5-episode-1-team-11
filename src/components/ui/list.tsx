import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

/** A titled group of rows on one glass card, separated by hairlines. */
export function ListGroup({
  title,
  className,
  children,
}: {
  title?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("grid gap-3", className)}>
      {title && <h2 className="pl-1 text-base font-bold text-muted-foreground">{title}</h2>}
      <div className="glass overflow-hidden rounded-lg [&>*+*]:border-t [&>*+*]:border-hairline">
        {children}
      </div>
    </section>
  );
}

type ItemProps = {
  title: ReactNode;
  description?: ReactNode;
  /** Icon, Avatar or EventIcon on the left. */
  leading?: ReactNode;
  /** Pill, Switch or value on the right. Links get a chevron automatically. */
  trailing?: ReactNode;
  className?: string;
} & (
  | { href: ComponentProps<typeof Link>["href"]; onClick?: never }
  | { href?: never; onClick?: () => void }
);

/** One row: 64px minimum. Becomes a link with href, a button with onClick, plain otherwise. */
export function ListItem({
  title,
  description,
  leading,
  trailing,
  className,
  href,
  onClick,
}: ItemProps) {
  const body = (
    <>
      {leading && <span className="shrink-0">{leading}</span>}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-md font-bold">{title}</span>
        {description && (
          <span className="mt-0.5 block truncate text-sm text-muted-foreground">{description}</span>
        )}
      </span>
      {trailing}
      {href && !trailing && (
        <CaretRightIcon aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
      )}
    </>
  );
  const base = cn("flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left", className);
  if (href)
    return (
      <Link href={href} className={cn(base, "transition-colors hover:bg-hairline")}>
        {body}
      </Link>
    );
  if (onClick)
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(base, "transition-colors hover:bg-hairline")}
      >
        {body}
      </button>
    );
  return <div className={base}>{body}</div>;
}
