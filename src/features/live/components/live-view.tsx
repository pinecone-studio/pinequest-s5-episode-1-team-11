"use client";

import {
  EyeSlashIcon,
  SpeakerHighIcon,
  SpeakerSlashIcon,
  VideoCameraIcon,
  XIcon,
} from "@phosphor-icons/react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/cn";
import { createClient } from "@/lib/supabase/client";
import { openLiveView } from "../actions";
import { ICE_SERVERS, isLiveSignal, LIVE_EVENT, type LiveSignal } from "../protocol";
import { playWhep } from "../whep";

type State = "idle" | "connecting" | "live" | "blocked" | "busy" | "timeout" | "ended" | "failed";
const HELLO_EVERY_MS = 3000;
const GIVE_UP_MS = 20_000;

/**
 * "Watch now": opens a direct video connection to one camera, only while this panel is open.
 * A phone camera answers over a broadcast channel; a CCTV camera streams from the camera server.
 */
export function LiveView({
  deviceId,
  online,
  cctv = false,
}: {
  deviceId: string;
  online: boolean;
  cctv?: boolean;
}) {
  const t = useTranslations("live");
  const videoRef = useRef<HTMLVideoElement>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const [state, setState] = useState<State>("idle");
  const [muted, setMuted] = useState(true);

  useEffect(() => () => stopRef.current?.(), []);

  function show(stream: MediaStream) {
    const video = videoRef.current;
    if (video && video.srcObject !== stream) {
      video.srcObject = stream;
      void video.play().catch(() => undefined);
    }
    setState("live");
  }

  async function startCctv() {
    const response = await fetch(`/api/v1/app/devices/${deviceId}/stream`, {
      method: "POST",
    }).catch(() => null);
    const access = response?.ok
      ? ((await response.json()) as { whep: string; token: string })
      : null;
    if (!access) return setState("failed");
    const ended = (next: State) => {
      const video = videoRef.current;
      if (video) video.srcObject = null;
      stopRef.current = null;
      setState(next);
    };
    try {
      const stop = await playWhep(access.whep, access.token, show, ended);
      stopRef.current = () => {
        stop();
        ended("idle");
      };
    } catch {
      ended("failed");
    }
  }

  async function start() {
    stopRef.current?.();
    setState("connecting");
    if (cctv) return startCctv();
    const access = await openLiveView(deviceId);
    const client = createClient();
    if (!access.ok || !client) return setState("failed");

    const viewer = crypto.randomUUID();
    let connection: RTCPeerConnection | null = null;
    let channel: RealtimeChannel | null = null;
    let answered = false;
    const pending: RTCIceCandidateInit[] = [];
    const send = (signal: LiveSignal) =>
      void channel?.send({ type: "broadcast", event: LIVE_EVENT, payload: signal });

    const hello = setInterval(() => {
      if (!answered) send({ kind: "hello", viewer });
    }, HELLO_EVERY_MS);
    const giveUp = setTimeout(() => {
      if (!answered) finish("timeout", true);
    }, GIVE_UP_MS);

    function finish(next: State, notify: boolean) {
      clearInterval(hello);
      clearTimeout(giveUp);
      if (notify) send({ kind: "bye", viewer, from: "viewer" });
      connection?.close();
      connection = null;
      if (channel) void channel.unsubscribe();
      channel = null;
      const video = videoRef.current;
      if (video) video.srcObject = null;
      stopRef.current = null;
      setState(next);
    }
    stopRef.current = () => finish("idle", true);

    async function receive(signal: LiveSignal) {
      if (signal.viewer !== viewer) return;
      if (signal.kind === "busy") return finish("busy", false);
      if (signal.kind === "bye" && signal.from === "camera") return finish("ended", false);
      if (signal.kind === "blocked") return setState(signal.blocked ? "blocked" : "live");
      if (signal.kind === "offer") {
        answered = true;
        connection?.close();
        const peer = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        connection = peer;
        peer.ontrack = ({ streams }) => {
          const video = videoRef.current;
          if (video && streams[0] && video.srcObject !== streams[0]) {
            video.srcObject = streams[0];
            void video.play().catch(() => undefined);
          }
          setState((current) => (current === "blocked" ? current : "live"));
        };
        peer.onicecandidate = ({ candidate }) => {
          if (candidate)
            send({ kind: "ice", viewer, from: "viewer", candidate: candidate.toJSON() });
        };
        peer.onconnectionstatechange = () => {
          if (peer.connectionState === "failed") finish("failed", true);
        };
        await peer.setRemoteDescription({ type: "offer", sdp: signal.sdp });
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        send({ kind: "answer", viewer, sdp: answer.sdp ?? "" });
        for (const candidate of pending.splice(0)) await peer.addIceCandidate(candidate);
      } else if (signal.kind === "ice" && signal.from === "camera") {
        if (connection?.remoteDescription) await connection.addIceCandidate(signal.candidate);
        else pending.push(signal.candidate);
      }
    }

    channel = client
      .channel(access.channel, { config: { broadcast: { self: false } } })
      .on("broadcast", { event: LIVE_EVENT }, ({ payload }) => {
        if (isLiveSignal(payload)) void receive(payload).catch(() => finish("failed", true));
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") send({ kind: "hello", viewer });
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") finish("failed", false);
      });
  }

  const open = state === "connecting" || state === "live" || state === "blocked";
  const message =
    state === "busy"
      ? t("busy")
      : state === "timeout"
        ? t("timeout")
        : state === "ended"
          ? t("ended")
          : state === "failed"
            ? t("failed")
            : null;

  return (
    <section className="grid gap-3" aria-label={t("title")}>
      {open ? (
        <div className="relative overflow-hidden rounded-xl border border-hairline bg-black">
          <video
            ref={videoRef}
            className="aspect-[3/4] max-h-[70vh] w-full object-contain sm:aspect-video"
            playsInline
            autoPlay
            muted={muted}
          />
          {state !== "live" && (
            <div className="absolute inset-0 grid place-items-center bg-black/70 p-6 text-center">
              {state === "blocked" ? (
                <p className="flex items-center gap-2 font-bold text-white">
                  <EyeSlashIcon aria-hidden="true" className="size-5" />
                  {t("blocked")}
                </p>
              ) : (
                <p className="flex items-center gap-2 font-bold text-white" role="status">
                  <Spinner className="size-5" />
                  {t("connecting")}
                </p>
              )}
            </div>
          )}
          <div className="absolute inset-x-3 top-3 flex items-center justify-between gap-2">
            <span
              className={cn(
                "inline-flex min-h-9 items-center gap-2 rounded-full bg-black/60 px-3 text-sm font-bold text-white",
                state !== "live" && "opacity-0",
              )}
            >
              <i className="size-2 animate-blink rounded-full bg-destructive" aria-hidden="true" />
              {t("live")}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMuted((value) => !value)}
                aria-label={muted ? t("unmute") : t("mute")}
                className="grid size-11 place-items-center rounded-full bg-black/60 text-white"
              >
                {muted ? (
                  <SpeakerSlashIcon aria-hidden="true" className="size-5" />
                ) : (
                  <SpeakerHighIcon aria-hidden="true" className="size-5" />
                )}
              </button>
              <button
                type="button"
                onClick={() => stopRef.current?.()}
                aria-label={t("close")}
                className="grid size-11 place-items-center rounded-full bg-black/60 text-white"
              >
                <XIcon aria-hidden="true" className="size-5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-2">
          <Button className="w-fit" disabled={!online} onClick={() => void start()}>
            <VideoCameraIcon aria-hidden="true" />
            {t("watch")}
          </Button>
          <p className="text-sm text-muted-foreground">
            {online ? t(cctv ? "hintCctv" : "hint") : t("offline")}
          </p>
          {message && (
            <p className="text-sm font-bold text-warning-text" role="status">
              {message}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
