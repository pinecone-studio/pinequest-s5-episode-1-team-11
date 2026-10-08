"use client";

import type { ReactNode } from "react";
import { Drawer } from "vaul";
import { cn } from "@/lib/cn";
import { DESKTOP, useMediaQuery } from "@/lib/use-media-query";

/**
 * Bottom sheet on phones (drag down to close), side panel on wide screens (drag right to close).
 * <Sheet trigger={<Button>Засах</Button>} title="Нэр засах">…</Sheet>
 * or control it with open / onOpenChange.
 */
export function Sheet({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  children,
  className,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: ReactNode;
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
}) {
  const wide = useMediaQuery(DESKTOP);
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} direction={wide ? "right" : "bottom"}>
      {trigger && <Drawer.Trigger asChild>{trigger}</Drawer.Trigger>}
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-scrim" />
        <Drawer.Content
          className={cn(
            "fixed z-50 grid content-start gap-4 overflow-y-auto border border-glass-border bg-card outline-none",
            wide
              ? "inset-y-4 right-4 w-[420px] max-w-[calc(100vw-32px)] rounded-[28px] p-6"
              : "inset-x-3 bottom-3 mx-auto max-h-[calc(100dvh-64px)] max-w-lg rounded-[34px] px-5 pt-4 pb-[max(20px,env(safe-area-inset-bottom))]",
            className,
          )}
        >
          {!wide && (
            <span
              aria-hidden="true"
              className="mx-auto h-[5px] w-[42px] rounded-full bg-foreground/20"
            />
          )}
          <div className="grid gap-1">
            <Drawer.Title className="font-display text-lg">{title}</Drawer.Title>
            {description ? (
              <Drawer.Description className="text-base text-muted-foreground">
                {description}
              </Drawer.Description>
            ) : (
              <Drawer.Description className="sr-only">{title}</Drawer.Description>
            )}
          </div>
          {children}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

export const SheetClose = Drawer.Close;
