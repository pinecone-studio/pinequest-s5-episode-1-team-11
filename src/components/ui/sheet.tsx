"use client";

import type { ReactNode } from "react";
import { Drawer } from "vaul";
import { cn } from "@/lib/cn";

/**
 * Bottom sheet that can be dragged down to close.
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
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <Drawer.Trigger asChild>{trigger}</Drawer.Trigger>}
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-scrim" />
        <Drawer.Content
          className={cn(
            "fixed inset-x-3 bottom-3 z-50 mx-auto grid max-h-[calc(100dvh-64px)] max-w-lg gap-4 overflow-y-auto rounded-[34px] border border-glass-border bg-card px-5 pt-4 pb-[max(20px,env(safe-area-inset-bottom))] outline-none",
            className,
          )}
        >
          <span
            aria-hidden="true"
            className="mx-auto h-[5px] w-[42px] rounded-full bg-foreground/20"
          />
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
