"use client";

import { CaretDownIcon } from "@phosphor-icons/react";
import { Accordion as Primitive } from "radix-ui";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Questions that open one at a time, e.g. the FAQ. */
export function Accordion({
  items,
  className,
}: {
  items: { id: string; title: string; content: ReactNode }[];
  className?: string;
}) {
  return (
    <Primitive.Root
      type="single"
      collapsible
      className={cn("glass overflow-hidden rounded-lg", className)}
    >
      {items.map((item) => (
        <Primitive.Item key={item.id} value={item.id} className="border-hairline [&+&]:border-t">
          <Primitive.Header>
            <Primitive.Trigger className="group flex min-h-14 w-full items-center justify-between gap-3 px-4 text-left text-md font-bold">
              {item.title}
              <CaretDownIcon
                aria-hidden="true"
                className="size-5 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180"
              />
            </Primitive.Trigger>
          </Primitive.Header>
          <Primitive.Content className="px-4 pb-4 text-base text-muted-foreground">
            {item.content}
          </Primitive.Content>
        </Primitive.Item>
      ))}
    </Primitive.Root>
  );
}
