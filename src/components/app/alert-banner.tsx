"use client";

import { XIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { EventIcon } from "@/components/domain/event-icon";
import type { EventKind, Severity } from "@/contracts";
import { cn } from "@/lib/cn";
import { routes } from "@/lib/routes";
import { createClient } from "@/lib/supabase/client";

type Incoming = {
  id: string;
  kind: EventKind;
  severity: Severity;
  personName: string | null;
  roomName: string;
};

const WARNING_MS = 10_000;
const ALARM_EVERY_MS = 2_500;
const ALARM_FOR_MS = 60_000;

let audio: AudioContext | null = null;

/** Browsers (iOS most strictly) only start sound from a tap, so every tap keeps the context awake. */
function unlockAudio() {
  try {
    audio ??= new AudioContext();
    if (audio.state !== "running") void audio.resume();
  } catch {}
}

function play(tones: number[], volume: number, type: OscillatorType) {
  unlockAudio();
  const context = audio;
  if (!context) return;
  const gain = context.createGain();
  gain.gain.value = volume;
  gain.connect(context.destination);
  tones.forEach((frequency, index) => {
    const tone = context.createOscillator();
    tone.type = type;
    tone.frequency.value = frequency;
    tone.connect(gain);
    const start = context.currentTime + index * 0.2;
    tone.start(start);
    tone.stop(start + 0.17);
  });
}

/**
 * In-app notice for a new detection while Halo is open, on every screen. Push notifications still
 * arrive when the app is closed; this is the same news for someone already looking at the app.
 */
export function AlertBanner({ householdId }: { householdId: string }) {
  const t = useTranslations("common");
  const [alert, setAlert] = useState<Incoming | null>(null);

  useEffect(() => {
    const client = createClient();
    if (!client) return;
    const channel = client
      .channel(`alerts:${householdId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "events",
          filter: `household_id=eq.${householdId}`,
        },
        ({ new: row }) => {
          const event = row as {
            id: string;
            kind: EventKind;
            severity: Severity;
            person_name: string | null;
            room_name: string;
          };
          if (event.severity === "info") return;
          setAlert({
            id: event.id,
            kind: event.kind,
            severity: event.severity,
            personName: event.person_name,
            roomName: event.room_name,
          });
          navigator.vibrate?.(event.severity === "critical" ? [200, 80, 200, 80, 200] : [120]);
        },
      )
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [householdId]);

  useEffect(() => {
    // Ringer-switch on iPhone mutes web audio unless the page asks for playback (Safari 17+).
    const session = (navigator as { audioSession?: { type: string } }).audioSession;
    if (session) session.type = "playback";
    window.addEventListener("pointerdown", unlockAudio);
    window.addEventListener("keydown", unlockAudio);
    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
  }, []);

  useEffect(() => {
    if (!alert) return;
    if (alert.severity !== "critical") {
      play([880, 660], 0.12, "sine");
      const timer = setTimeout(() => setAlert(null), WARNING_MS);
      return () => clearTimeout(timer);
    }
    // Critical rings until someone opens or closes the banner, capped so it never rings forever.
    const alarm = () => play([988, 784, 988, 784], 0.18, "square");
    alarm();
    const repeat = setInterval(alarm, ALARM_EVERY_MS);
    const stop = setTimeout(() => clearInterval(repeat), ALARM_FOR_MS);
    return () => {
      clearInterval(repeat);
      clearTimeout(stop);
    };
  }, [alert]);

  if (!alert) return null;
  const critical = alert.severity === "critical";
  const href = critical ? routes.alert(alert.id) : routes.event(alert.id);
  return (
    <div
      role="alert"
      data-tone={critical ? "alert" : undefined}
      className="fixed inset-x-3 top-[max(12px,env(safe-area-inset-top))] z-50 mx-auto max-w-md animate-drop-in sm:inset-x-auto sm:right-6 sm:mx-0 sm:w-[420px]"
    >
      <div
        className={cn(
          "glass-strong flex items-center gap-3 rounded-[22px] border-destructive/40 p-3 pr-2 shadow-[0_24px_60px_-20px_rgb(0_0_0/0.8)]",
          critical && "ring-2 ring-destructive",
        )}
      >
        <Link
          href={href}
          onClick={() => setAlert(null)}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl"
        >
          <EventIcon
            kind={alert.kind}
            severity={alert.severity}
            size="lg"
            className={
              critical ? "animate-wiggle border-destructive bg-destructive text-white" : undefined
            }
          />
          <span className="grid min-w-0 gap-0.5">
            <span className="text-xs font-bold tracking-[0.08em] text-muted-foreground uppercase">
              Halo · {t("alertBanner.now")}
            </span>
            <b className="truncate text-md">{t(`eventKind.${alert.kind}`)}</b>
            <span className="truncate text-sm text-muted-foreground">
              {[alert.personName, alert.roomName].filter(Boolean).join(" · ")}.{" "}
              {critical ? t("alertBanner.critical") : t("alertBanner.warning")}
            </span>
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setAlert(null)}
          aria-label={t("actions.close")}
          className="grid size-11 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-hairline"
        >
          <XIcon aria-hidden="true" className="size-5" />
        </button>
      </div>
    </div>
  );
}
