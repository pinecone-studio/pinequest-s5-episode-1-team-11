import type { Icon } from "@phosphor-icons/react";
import {
  BellIcon,
  FireIcon,
  SmileySadIcon,
  SpeakerHighIcon,
  WifiSlashIcon,
  WineIcon,
} from "@phosphor-icons/react/dist/ssr";
import type { EventKind, Severity } from "@/contracts";
import { cn } from "@/lib/cn";
import { FallIcon } from "./fall-icon";

const icons: Record<Exclude<EventKind, "fall">, Icon> = {
  scream: SpeakerHighIcon,
  cry: SmileySadIcon,
  glass: WineIcon,
  alarm: FireIcon,
  offline: WifiSlashIcon,
  test: BellIcon,
};

const tones: Record<Severity, string> = {
  critical: "bg-destructive/16 border-destructive/36 text-destructive-text",
  warning: "bg-warning/16 border-warning/36 text-warning-text",
  info: "bg-muted-foreground/16 border-muted-foreground/36 text-muted-foreground",
};

const sizes = {
  sm: "size-10 rounded-sm [&_svg]:size-5",
  md: "size-12 rounded-md [&_svg]:size-6",
  lg: "size-16 rounded-lg [&_svg]:size-8",
};

/** Tinted square with the event type's icon. Decorative: put the event name in text next to it. */
export function EventIcon({
  kind,
  severity,
  size = "md",
  className,
}: {
  kind: EventKind;
  severity: Severity;
  size?: keyof typeof sizes;
  className?: string;
}) {
  const Glyph = kind === "fall" ? null : icons[kind];
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-grid shrink-0 place-items-center border",
        tones[severity],
        sizes[size],
        className,
      )}
    >
      {Glyph ? <Glyph weight="duotone" /> : <FallIcon />}
    </span>
  );
}
