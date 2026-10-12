"use client";

import {
  ArrowSquareOutIcon,
  DesktopIcon,
  VideoCameraIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { useState } from "react";
import { SegmentedControl } from "@/components/ui/segmented-control";

type Guide = {
  label: string;
  title: string;
  body: string;
  steps: string[];
  limit?: string;
  links?: { href: string; label: string }[];
  actions?: ReactNode;
};

/** Two setup paths behind one switch, each as a numbered track. */
export function CameraGuide({
  browser,
  ip,
  switchLabel,
}: {
  browser: Guide;
  ip: Guide;
  switchLabel: string;
}) {
  const [path, setPath] = useState<"browser" | "ip">("browser");
  const guide = path === "browser" ? browser : ip;
  const Icon = path === "browser" ? DesktopIcon : VideoCameraIcon;
  return (
    <div className="grid gap-6">
      <SegmentedControl
        label={switchLabel}
        className="w-full max-w-md"
        value={path}
        onValueChange={setPath}
        options={[
          { value: "browser", label: browser.label },
          { value: "ip", label: ip.label },
        ]}
      />
      <section
        key={path}
        className="glass grid animate-rise gap-8 rounded-xl p-6 sm:p-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-12"
      >
        <div className="grid content-start gap-4">
          <span className="grid size-14 place-items-center rounded-2xl bg-primary/15 text-primary-text">
            <Icon weight="duotone" className="size-7" aria-hidden="true" />
          </span>
          <h2 className="font-display text-2xl">{guide.title}</h2>
          <p className="text-md leading-relaxed text-muted-foreground">{guide.body}</p>
          {guide.actions}
        </div>
        <div className="grid content-start gap-6">
          <ol className="relative grid gap-6">
            <span aria-hidden="true" className="absolute top-5 bottom-5 left-5 w-px bg-hairline" />
            {guide.steps.map((step, index) => (
              <li key={step} className="relative grid grid-cols-[40px_1fr] gap-4">
                <span className="glass-strong grid size-10 place-items-center rounded-full font-bold text-primary-text tabular-nums">
                  {index + 1}
                </span>
                <p className="pt-2 text-md leading-relaxed">{step}</p>
              </li>
            ))}
          </ol>
          {guide.limit && (
            <p className="flex gap-3 rounded-2xl border border-warning/30 bg-warning/8 p-4 text-base leading-relaxed text-warning-text">
              <WarningIcon weight="duotone" className="size-5 shrink-0" aria-hidden="true" />
              {guide.limit}
            </p>
          )}
          {guide.links && (
            <ul className="grid gap-1">
              {guide.links.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-h-11 items-center gap-2 text-base font-bold text-primary-text underline-offset-4 hover:underline"
                  >
                    {link.label}
                    <ArrowSquareOutIcon className="size-4" aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
