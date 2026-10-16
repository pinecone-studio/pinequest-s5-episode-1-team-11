"use client";

import { SpeakerHighIcon, SpeakerSlashIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { playWhep } from "../whep";

type State = "connecting" | "live" | "ended" | "failed";

/**
 * Reads the WHEP address and token from the URL hash (never sent to a server log) and plays the
 * camera full screen. The mobile app opens this page in a WebView, so both apps share one player.
 */
export function CameraWatch() {
  const t = useTranslations("live");
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<State>("connecting");
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const whep = hash.get("whep");
    const token = hash.get("token");
    let stop: (() => void) | null = null;
    let alive = true;
    if (!whep?.startsWith("https://") || !token) {
      queueMicrotask(() => setState("failed"));
      return;
    }
    playWhep(
      whep,
      token,
      (stream) => {
        const video = videoRef.current;
        if (video && video.srcObject !== stream) {
          video.srcObject = stream;
          void video.play().catch(() => undefined);
        }
        if (alive) setState("live");
      },
      (reason) => alive && setState(reason),
    )
      .then((stopper) => {
        if (alive) stop = stopper;
        else stopper();
      })
      .catch(() => alive && setState("failed"));
    return () => {
      alive = false;
      stop?.();
    };
  }, []);

  return (
    <main className="relative grid min-h-dvh place-items-center bg-black">
      <video
        ref={videoRef}
        className="h-dvh w-full object-contain"
        playsInline
        autoPlay
        muted={muted}
      />
      {state !== "live" && (
        <p
          className="absolute flex items-center gap-2 p-6 text-center font-bold text-white"
          role="status"
        >
          {state === "connecting" && <Spinner className="size-5" />}
          {t(state === "connecting" ? "connecting" : state)}
        </p>
      )}
      {state === "live" && (
        <button
          type="button"
          onClick={() => setMuted((value) => !value)}
          aria-label={muted ? t("unmute") : t("mute")}
          className="absolute top-4 right-4 grid size-11 place-items-center rounded-full bg-black/60 text-white"
        >
          {muted ? (
            <SpeakerSlashIcon aria-hidden="true" className="size-5" />
          ) : (
            <SpeakerHighIcon aria-hidden="true" className="size-5" />
          )}
        </button>
      )}
    </main>
  );
}
