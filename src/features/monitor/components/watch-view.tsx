"use client";

import {
  ArrowLeftIcon,
  EyeSlashIcon,
  MicrophoneSlashIcon,
  PauseIcon,
  PlayIcon,
  ShieldCheckIcon,
} from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  type DetectionSettings,
  defaultDetectionSettings,
  HEARTBEAT_INTERVAL_MS,
  type PairResponse,
} from "@/contracts";
import type { DetectedKind } from "@/detection/engine";
import type { VideoSource } from "@/detection/runtime/video-source";
import type { DetectionWithSnapshot, Watcher, WatcherStats } from "@/detection/runtime/watcher";
import { cn } from "@/lib/cn";
import { sendEvent, sendHeartbeat } from "../api";
import { saveDevice } from "../device-store";
import { Outbox } from "../outbox";
import { drawSkeletons } from "./skeleton";

const detectors: DetectedKind[] = ["fall", "scream", "cry", "glass", "alarm"];
const HIT_MS = 8000;
const METER_BARS = 18;

type Phase = "camera" | "models" | "running" | "error-camera" | "error-models";
type Recent = { kind: DetectedKind; at: number };

/** Full-screen camera with body points, detector lights and a calm status panel. */
export function WatchView({
  device,
  testVideo,
  cctvUrl,
  onExit,
  onUnpaired,
}: {
  /** null = test mode: detections stay on this screen. */
  device: PairResponse | null;
  /** Development only: watch a recording instead of the camera. */
  testVideo?: string;
  /** go2rtc WebRTC endpoint: watch a CCTV camera instead of this device's camera. */
  cctvUrl?: string;
  onExit(): void;
  onUnpaired(): void;
}) {
  const t = useTranslations("monitor");
  const common = useTranslations("common");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const watcherRef = useRef<Watcher | null>(null);
  const settingsRef = useRef<DetectionSettings>(defaultDetectionSettings);
  const pausedRef = useRef(false);
  const deviceRef = useRef(device);
  const unpairedRef = useRef(onUnpaired);
  unpairedRef.current = onUnpaired;
  const [outbox] = useState(() => new Outbox(typeof window === "undefined" ? null : localStorage));

  const [attempt, setAttempt] = useState(0);
  const [phase, setPhase] = useState<Phase>("camera");
  const [stats, setStats] = useState<WatcherStats | null>(null);
  const [levels, setLevels] = useState<number[]>(() => Array(METER_BARS).fill(0));
  const [recent, setRecent] = useState<Recent[]>([]);
  const [paused, setPaused] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [hasMic, setHasMic] = useState(true);
  const [hidden, setHidden] = useState(false);
  const [queued, setQueued] = useState(outbox.size);
  const [room, setRoom] = useState(device?.roomName ?? "");

  // Sends waiting detections; a removed camera goes back to pairing.
  const flushRef = useRef(async () => {});
  flushRef.current = async () => {
    const current = deviceRef.current;
    if (!current) return;
    const outcome = await outbox.flush((event) => sendEvent(current.deviceToken, event));
    setQueued(outbox.size);
    if (outcome === "unauthorized") unpairedRef.current();
  };

  // Camera → models → watching. Re-runs on "retry".
  useEffect(() => {
    const video = videoRef.current;
    if (!video || attempt < 0) return;
    let cancelled = false;
    let source: VideoSource | null = null;
    let lastStats = 0;
    setPhase("camera");
    (async () => {
      const [{ cameraSource, fileSource, go2rtcSource }, { Watcher }] = await Promise.all([
        import("@/detection/runtime/video-source"),
        import("@/detection/runtime/watcher"),
      ]);
      // React may cancel this run right away (development double effects); never share the <video>.
      if (cancelled) return;
      try {
        source = cctvUrl
          ? await go2rtcSource(video, cctvUrl)
          : testVideo
            ? await fileSource(video, testVideo)
            : await cameraSource(video);
      } catch (error) {
        console.error("camera failed", error);
        if (!cancelled) setPhase("error-camera");
        return;
      }
      if (cancelled) return source.stop();
      setHasMic(Boolean(source.audio));
      setPhase("models");
      const watcher = new Watcher(source, settingsRef.current, {
        onDetection(detection: DetectionWithSnapshot) {
          if (cancelled || pausedRef.current) return;
          const paired = deviceRef.current;
          setRecent((list) => [{ kind: detection.kind, at: Date.now() }, ...list.slice(0, 9)]);
          navigator.vibrate?.([120, 60, 120]);
          if (!paired) return;
          outbox.add({
            idempotencyKey: crypto.randomUUID(),
            kind: detection.kind,
            confidence: detection.confidence,
            occurredAt: new Date(detection.time).toISOString(),
            snapshot: detection.snapshot,
          });
          setQueued(outbox.size);
          void flushRef.current();
        },
        onStats(next) {
          const now = performance.now();
          if (now - lastStats < 250) return;
          lastStats = now;
          setStats(next);
          setLevels((bars) => [...bars.slice(1), Math.min(1, Math.sqrt(next.level) * 2.2)]);
        },
        onPoses(poses) {
          const canvas = canvasRef.current;
          if (canvas) drawSkeletons(canvas, video, pausedRef.current ? [] : poses, "#5EEAD4");
        },
      });
      watcherRef.current = watcher;
      try {
        await watcher.start();
      } catch (error) {
        console.error("models failed", error);
        if (!cancelled) {
          source.stop();
          setPhase("error-models");
        }
        return;
      }
      if (!cancelled) setPhase("running");
    })();
    return () => {
      cancelled = true;
      void watcherRef.current?.stop();
      watcherRef.current = null;
      source?.stop();
    };
  }, [attempt, outbox, testVideo, cctvUrl]);

  // Heartbeats keep the camera online and bring the guardian's latest settings.
  useEffect(() => {
    const current = deviceRef.current;
    if (!current) return;
    let stopped = false;
    const beat = async () => {
      const result = await sendHeartbeat(current.deviceToken);
      if (stopped) return;
      if (result.ok) {
        settingsRef.current = result.data.settings;
        watcherRef.current?.configure(result.data.settings);
        setRoom(result.data.roomName);
        saveDevice({ ...current, name: result.data.name, roomName: result.data.roomName });
      } else if (result.reason === "unauthorized") {
        unpairedRef.current();
      }
      await flushRef.current();
    };
    void beat();
    const timer = setInterval(beat, HEARTBEAT_INTERVAL_MS);
    const online = () => void flushRef.current();
    window.addEventListener("online", online);
    return () => {
      stopped = true;
      clearInterval(timer);
      window.removeEventListener("online", online);
    };
  }, []);

  // Keep the screen on; browsers pause cameras in background tabs.
  useEffect(() => {
    if (phase !== "running") return;
    let lock: WakeLockSentinel | null = null;
    const acquire = async () => {
      try {
        lock = (await navigator.wakeLock?.request("screen")) ?? null;
      } catch {
        lock = null;
      }
    };
    const visibility = () => {
      setHidden(document.hidden);
      if (!document.hidden) void acquire();
    };
    void acquire();
    document.addEventListener("visibilitychange", visibility);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      void lock?.release();
    };
  }, [phase]);

  function togglePause() {
    const next = !paused;
    pausedRef.current = next;
    setPaused(next);
    const video = videoRef.current;
    if (next) video?.pause();
    else void video?.play();
  }

  const now = Date.now();
  const latest = recent.find((item) => now - item.at < HIT_MS);
  const alarm = Boolean(latest);
  const kindLabel = (kind: DetectedKind) => t(`detector.${kind}`);
  const title = latest
    ? t("watch.detected", { kind: kindLabel(latest.kind) })
    : paused
      ? t("watch.pausedTitle")
      : stats?.fallState === "falling"
        ? t("watch.falling")
        : stats?.fallState === "down"
          ? t("watch.down")
          : stats && stats.people === 0
            ? t("watch.noPerson")
            : t("watch.calm");
  const loading = phase === "camera" || phase === "models";
  const failed = phase === "error-camera" || phase === "error-models";

  return (
    <div className="dark fixed inset-0 overflow-hidden bg-[#060A14] text-foreground">
      <video
        ref={videoRef}
        // Always "visible": browsers pause muted video they consider hidden. Overlays cover it.
        className="absolute inset-0 size-full object-cover"
        muted
        playsInline
        onPause={(event) => {
          // Only the pause button may stop the picture; resume after power-saving pauses.
          if (!pausedRef.current) void event.currentTarget.play().catch(() => undefined);
        }}
      />
      <div
        aria-hidden="true"
        className={cn(
          "absolute inset-0 bg-[repeating-linear-gradient(90deg,#0B1222_0_14px,#09101E_14px_28px)] transition-[clip-path] duration-500 ease-[var(--ease-standard)]",
          privacy ? "[clip-path:inset(0_0_0_0)]" : "[clip-path:inset(0_0_100%_0)]",
        )}
      />
      <div aria-hidden="true" className="absolute inset-0">
        <canvas ref={canvasRef} className="size-full" />
      </div>
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 transition-opacity duration-300",
          "shadow-[inset_0_0_0_3px_var(--destructive),inset_0_0_120px_16px_rgb(239_68_68/0.5)]",
          alarm ? "opacity-100" : "opacity-0",
        )}
      />

      <header className="absolute inset-x-3 top-[max(12px,env(safe-area-inset-top))] z-20 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onExit}
          className="glass inline-flex min-h-11 items-center gap-2 rounded-full px-4 font-bold"
        >
          <ArrowLeftIcon aria-hidden="true" className="size-5" />
          {t("watch.exit")}
        </button>
        <div className="flex gap-2">
          {phase === "running" && (
            <span className="glass inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-bold">
              <i
                aria-hidden="true"
                className={cn(
                  "size-2 rounded-full",
                  paused
                    ? "bg-muted-foreground"
                    : alarm
                      ? "animate-blink bg-destructive shadow-[0_0_10px_var(--destructive)]"
                      : "animate-blink bg-primary shadow-[0_0_8px_var(--primary)]",
                )}
              />
              {paused ? t("watch.paused") : t("watch.watching")}
            </span>
          )}
          {stats && (
            <span className="glass inline-flex min-h-11 items-center rounded-full px-4 text-sm font-bold tabular">
              {stats.fps} fps
            </span>
          )}
        </div>
      </header>

      {privacy && (
        <p className="glass absolute top-1/2 left-1/2 z-10 -translate-1/2 rounded-full px-4 py-2 text-sm font-bold whitespace-nowrap">
          {t("watch.privacyNote")}
        </p>
      )}

      {(loading || failed) && (
        <div className="absolute inset-0 z-10 grid place-items-center bg-[#060A14] p-6">
          <div className="grid max-w-sm justify-items-center gap-4 text-center" role="status">
            {loading ? (
              <>
                <Spinner className="size-8 text-primary" />
                <p className="font-display text-xl">
                  {phase === "camera" ? t("loading.camera") : t("loading.models")}
                </p>
                {phase === "models" && (
                  <p className="text-base text-muted-foreground">{t("loading.modelsHint")}</p>
                )}
              </>
            ) : (
              <>
                <p className="text-md">
                  {phase === "error-camera" ? t("error.camera") : t("error.models")}
                </p>
                <Button onClick={() => setAttempt((value) => value + 1)}>
                  {common("actions.retry")}
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {phase === "running" && (
        <section
          className="glass-strong absolute inset-x-2.5 bottom-[max(12px,env(safe-area-inset-bottom))] z-10 mx-auto grid max-w-xl gap-4 rounded-xl px-4 pt-5 pb-4"
          aria-label={t("title")}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p
                className={cn("font-display text-xl", alarm && "text-destructive-text")}
                aria-live="polite"
              >
                {title}
              </p>
              <p className="mt-1 truncate text-sm text-muted-foreground">
                {[room, !device && t("watch.local")].filter(Boolean).join(" · ")}
              </p>
            </div>
            {queued > 0 && (
              <p className="max-w-40 text-right text-xs font-bold text-warning-text">
                {t("watch.queued", { count: queued })}
              </p>
            )}
          </div>

          <ul className="flex flex-wrap gap-2">
            {detectors.map((kind) => {
              const hit = recent.some((item) => item.kind === kind && now - item.at < HIT_MS);
              return (
                <li
                  key={kind}
                  className={cn(
                    "inline-flex min-h-10 items-center gap-2 rounded-full border px-3 text-sm font-bold transition-colors",
                    hit
                      ? "border-destructive bg-destructive/25 text-white"
                      : "border-hairline bg-white/6 text-muted-foreground",
                  )}
                >
                  <i
                    aria-hidden="true"
                    className={cn(
                      "size-1.5 rounded-full",
                      hit
                        ? "animate-blink bg-destructive"
                        : paused
                          ? "bg-muted-foreground"
                          : "bg-primary shadow-[0_0_6px_var(--primary)]",
                    )}
                  />
                  {kindLabel(kind)}
                </li>
              );
            })}
          </ul>

          {hasMic ? (
            <div className="flex h-7 items-center gap-1" role="img" aria-label={t("watch.level")}>
              {levels.map((level, index) => (
                <i
                  // biome-ignore lint/suspicious/noArrayIndexKey: fixed bars that only change height
                  key={index}
                  className="h-full flex-1 rounded-sm bg-primary transition-transform duration-100"
                  style={{ transform: `scaleY(${Math.max(0.08, level)})` }}
                />
              ))}
            </div>
          ) : (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <MicrophoneSlashIcon aria-hidden="true" className="size-5" />
              {t("watch.noMic")}
            </p>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="secondary"
              aria-pressed={privacy}
              onClick={() => setPrivacy((value) => !value)}
              className={cn(privacy && "bg-primary text-primary-foreground")}
            >
              <EyeSlashIcon aria-hidden="true" />
              {t("watch.privacy")}
            </Button>
            <Button variant="secondary" onClick={togglePause} disabled={phase !== "running"}>
              {paused ? <PlayIcon aria-hidden="true" /> : <PauseIcon aria-hidden="true" />}
              {paused ? t("watch.resume") : t("watch.pause")}
            </Button>
          </div>

          {hidden ? (
            <p className="text-sm font-bold text-warning-text" role="alert">
              {t("watch.hidden")}
            </p>
          ) : (
            <p className="flex gap-2 text-sm text-muted-foreground">
              <ShieldCheckIcon aria-hidden="true" className="size-5 shrink-0 text-primary-text" />
              {t("watch.note")}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
