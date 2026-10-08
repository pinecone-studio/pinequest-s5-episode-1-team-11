"use client";

import { AlertDialog as Primitive } from "radix-ui";
import type { ReactNode } from "react";
import { Button } from "./button";

/**
 * Asks before something that cannot be undone, e.g. deleting a device.
 * Extra content (such as a "type УСТГАХ" field) goes in children.
 */
export function AlertDialog({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  destructive = true,
  confirmDisabled,
  loading,
  children,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: ReactNode;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  destructive?: boolean;
  confirmDisabled?: boolean;
  loading?: boolean;
  children?: ReactNode;
}) {
  return (
    <Primitive.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <Primitive.Trigger asChild>{trigger}</Primitive.Trigger>}
      <Primitive.Portal>
        <Primitive.Overlay className="fixed inset-0 z-50 bg-scrim" />
        <Primitive.Content className="fixed top-1/2 left-1/2 z-50 grid w-[calc(100%-32px)] max-w-sm -translate-x-1/2 -translate-y-1/2 gap-4 rounded-[28px] border border-glass-border bg-card p-6">
          <Primitive.Title className="font-display text-lg">{title}</Primitive.Title>
          {description && (
            <Primitive.Description className="text-base text-muted-foreground">
              {description}
            </Primitive.Description>
          )}
          {children}
          <div className="grid gap-2">
            <Button
              variant={destructive ? "destructive" : "primary"}
              block
              onClick={onConfirm}
              disabled={confirmDisabled}
              loading={loading}
            >
              {confirmLabel}
            </Button>
            <Primitive.Cancel asChild>
              <Button variant="secondary" block>
                {cancelLabel}
              </Button>
            </Primitive.Cancel>
          </div>
        </Primitive.Content>
      </Primitive.Portal>
    </Primitive.Root>
  );
}
