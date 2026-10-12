"use client";

import {
  ArrowLeftIcon,
  CaretUpIcon,
  EyeIcon,
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
import { fallPreset } from "@/detection/fall";
import { isSourceEnded, observeSource } from "@/detection/runtime/source-health";
import { SourceResumer } from "@/detection/runtime/source-resumer";
import type { VideoSource } from "@/detection/runtime/video-source";
import type { DetectionWithSnapshot, Watcher, WatcherStats } from "@/detection/runtime/watcher";
import { LiveHost } from "@/features/live/camera-host";
import { cn } from "@/lib/cn";
import { sendAway, sendEvent, sendHeartbeat } from "../api";
import { saveDevice } from "../device-store";
import { Outbox } from "../outbox";
import { drawSkeletons } from "./skeleton";

const detectors: DetectedKind[] = ["fall", "scream", "cry", "glass", "alarm"];
const HIT_MS = 8000;
const METER_BARS = 18;

type Phase = "camera" | "models" | "running" | "interrupted" | "error-camera" | "error-models";
type Recent = { kind: DetectedKind; at: number };

/** Full-screen camera with body points, detector lights and a calm status panel. */
export function WatchView({
  device,
  cctvUrl,
  onExit,
  onUnpaired,
}: {
  /** null = test mode: detections stay on this screen. */
  device: PairResponse | null;
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
  const sourceRef = useRef<VideoSource | null>(null);
  const interruptRef = useRef<(() => void) | null>(null);
  const resumeRef = useRef<() => Promise<void>>(() => Promise.resolve());
  const lastFrameRef = useRef(0);
  const settingsRef = useRef<DetectionSettings>(defaultDetectionSettings);
  const pausedRef = useRef(false);
  const configuredRef = useRef(!device);
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
  const [expanded, setExpanded] = useState(false);
  const [liveChannels, setLiveChannels] = useState<readonly string[]>([]);
  const [viewers, setViewers] = useState(0);
  const liveRef = useRef<LiveHost | null>(null);
  const [hasMic, setHasMic] = useState(true);
  const [settings, setSettings] = useState(defaultDetectionSettings);
  const [configured, setConfigured] = useState(!device);
  const [hidden, setHidden] = useState(false);
  const [queued, setQueued] = useState(outbox.size);
  const [room, setRoom] = useState(device?.roomName ?? "");
  const [resumer] = useState(
    () =>
      new SourceResumer({
        canResume: (source) =>
          sourceRef.current === source &&
          Boolean(watcherRef.current) &&
          !pausedRef.current &&
          !document.hidden,
        onResuming() {
          watcherRef.current?.setPaused(true);
          // Begin audio before awaiting play so a Resume tap activates Safari audio.
          void watcherRef.current?.resumeAudio();
        },
        onResumed() {
          lastFrameRef.current = performance.now();
          watcherRef.current?.setPaused(!configuredRef.current);
        },
        onInterrupted: () => interruptRef.current?.(),
      }),
  );

  resumeRef.current = () => {
    const source = sourceRef.current;
    return source ? resumer.resume(source) : Promise.resolve();
  };

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
  // biome-ignore lint/correctness/useExhaustiveDependencies: Retry attempts intentionally restart the camera and models.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let cancelled = false;
    let runFailed = false;
    let source: VideoSource | null = null;
    let unobserve = () => {};
    const acquisition = new AbortController();
    const interrupted = () => {
      if (cancelled || runFailed) return;
      runFailed = true;
      resumer.cancel();
      unobserve();
      if (sourceRef.current === source) sourceRef.current = null;
      void watcherRef.current?.stop();
      source?.stop();
      setStats(null);
      setPhase("interrupted");
    };
    let lastStats = 0;
    let lastAudioState: WatcherStats["audioState"] | undefined;
    setPhase("camera");
    setStats(null);
    setRecent([]);
    (async () => {
      const [{ cameraSource, go2rtcSource }, { Watcher }] = await Promise.all([
        import("@/detection/runtime/video-source"),
        import("@/detection/runtime/watcher"),
      ]);
      // React may cancel this run right away (development double effects); never share the <video>.
      if (cancelled) return;
      try {
        source = cctvUrl
          ? await go2rtcSource(video, cctvUrl)
          : await cameraSource(video, acquisition.signal);
      } catch (error) {
        console.error("camera failed", error);
        if (!cancelled) setPhase("error-camera");
        return;
      }
      if (cancelled) return source.stop();
      sourceRef.current = source;
      interruptRef.current = interrupted;
      unobserve = observeSource(source, interrupted);
      if (runFailed) {
        unobserve();
        return;
      }
      setHasMic(Boolean(source.audio));
      setPhase("models");
      const watcher = new Watcher(source, settingsRef.current, {
        onDetection(detection: DetectionWithSnapshot) {
          if (cancelled || !configuredRef.current || pausedRef.current || document.hidden) return;
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
          if (cancelled || runFailed) return;
          const now = performance.now();
          if (now - lastStats < 250 && next.audioState === lastAudioState) return;
          lastStats = now;
          lastAudioState = next.audioState;
          setStats(next);
          setLevels((bars) => [...bars.slice(1), Math.min(1, Math.sqrt(next.level) * 2.2)]);
        },
        onPoses(poses) {
          if (cancelled || runFailed) return;
          lastFrameRef.current = performance.now();
          const canvas = canvasRef.current;
          if (canvas) drawSkeletons(canvas, video, pausedRef.current ? [] : poses, "#5EEAD4");
        },
        onError(error) {
          console.error("pose detection failed", error);
          if (!cancelled && !runFailed) {
            runFailed = true;
            unobserve();
            sourceRef.current = null;
            source?.stop();
            setPhase("error-models");
          }
        },
      });
      watcher.setPaused(!configuredRef.current || pausedRef.current || document.hidden);
      watcherRef.current = watcher;
      try {
        await watcher.start();
      } catch (error) {
        console.error("models failed", error);
        if (!cancelled && !runFailed) {
          runFailed = true;
          unobserve();
          sourceRef.current = null;
          source.stop();
          setPhase("error-models");
        }
        return;
      }
      if (!cancelled && !runFailed) {
        await resumeRef.current();
        if (!cancelled && !runFailed) setPhase("running");
      }
    })().catch((error) => {
      if (cancelled || runFailed) return;
      console.error("monitor initialization failed", error);
      runFailed = true;
      unobserve();
      sourceRef.current = null;
      void watcherRef.current?.stop();
      source?.stop();
      setPhase("error-models");
    });
    return () => {
      cancelled = true;
      resumer.cancel();
      unobserve();
      if (sourceRef.current === source) sourceRef.current = null;
      if (interruptRef.current === interrupted) interruptRef.current = null;
      acquisition.abort();
      void watcherRef.current?.stop();
      watcherRef.current = null;
      source?.stop();
    };
  }, [attempt, outbox, cctvUrl, resumer]);

  // Heartbeats keep the camera online and bring the guardian's latest settings.
  useEffect(() => {
    const current = deviceRef.current;
    if (!current || hidden || (phase !== "models" && phase !== "running")) return;
    let stopped = false;
    const beat = async () => {
      const result = await sendHeartbeat(current.deviceToken);
      if (stopped) return;
      if (result.ok) {
        settingsRef.current = result.data.settings;
        setSettings(result.data.settings);
        setLiveChannels(result.data.liveChannels ?? []);
        watcherRef.current?.configure(result.data.settings);
        if (!configuredRef.current) {
          configuredRef.current = true;
          setConfigured(true);
          void resumeRef.current();
        }
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
  }, [phase, hidden]);

  // Family members can ask to watch live. Copies of the camera tracks go straight to them.
  useEffect(() => {
    if (phase !== "running") return;
    const host = new LiveHost(() => {
      const video = videoRef.current?.srcObject;
      const tracks = new Map<string, MediaStreamTrack>();
      if (video instanceof MediaStream)
        for (const track of video.getTracks()) tracks.set(track.id, track);
      for (const track of sourceRef.current?.audio?.getAudioTracks() ?? [])
        tracks.set(track.id, track);
      return tracks.size ? new MediaStream([...tracks.values()]) : null;
    }, setViewers);
    liveRef.current = host;
    return () => {
      host.stop();
      if (liveRef.current === host) liveRef.current = null;
      setViewers(0);
    };
  }, [phase]);

  // Heartbeats bring this hour's and last hour's channel names; a dropped name ends its views.
  useEffect(() => {
    if (phase === "running") liveRef.current?.setChannels(liveChannels);
  }, [liveChannels, phase]);

  useEffect(() => {
    liveRef.current?.setBlocked(privacy || paused || hidden);
  }, [privacy, paused, hidden]);

  // Visibility can change while models load, before the running screen appears.
  useEffect(() => {
    const visibility = () => {
      resumer.cancel();
      setHidden(document.hidden);
      watcherRef.current?.setPaused(true);
      // Discard overlapping audio captured before the page became visible again.
      if (!document.hidden && !pausedRef.current) void resumeRef.current();
    };
    visibility();
    document.addEventListener("visibilitychange", visibility);
    return () => document.removeEventListener("visibilitychange", visibility);
  }, [resumer]);

  // Closing or hiding the camera page stops watching. Tell the family at once instead of
  // waiting for heartbeats to time out, so they see it offline and can reconnect it.
  useEffect(() => {
    const away = () => {
      const current = deviceRef.current;
      if (current && (document.hidden || document.visibilityState === "hidden"))
        sendAway(current.deviceToken);
    };
    const leaving = () => {
      const current = deviceRef.current;
      if (current) sendAway(current.deviceToken);
    };
    document.addEventListener("visibilitychange", away);
    window.addEventListener("pagehide", leaving);
    return () => {
      document.removeEventListener("visibilitychange", away);
      window.removeEventListener("pagehide", leaving);
    };
  }, []);

  // A live-but-stalled Safari camera must not keep showing a healthy status.
  useEffect(() => {
    if (phase !== "running") return;
    const timer = setInterval(() => {
      const source = sourceRef.current;
      if (!source || !configuredRef.current || document.hidden || pausedRef.current) return;
      if (isSourceEnded(source) || performance.now() - lastFrameRef.current > 12_000) {
        interruptRef.current?.();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [phase]);

  // Keep the screen on once both models have started.
  useEffect(() => {
    if (phase !== "running") return;
    let disposed = false;
    let lock: WakeLockSentinel | null = null;
    const acquire = async () => {
      try {
        const next = (await navigator.wakeLock?.request("screen")) ?? null;
        if (disposed) void next?.release();
        else lock = next;
      } catch {
        lock = null;
      }
    };
    const visibility = () => {
      if (!document.hidden) void acquire();
    };
    visibility();
    document.addEventListener("visibilitychange", visibility);
    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", visibility);
      void lock?.release();
    };
  }, [phase]);

  function togglePause() {
    resumer.cancel();
    const next = !paused;
    pausedRef.current = next;
    watcherRef.current?.setPaused(true);
    setPaused(next);
    const video = videoRef.current;
    if (next) video?.pause();
    else {
      void resumeRef.current();
    }
  }

  function restart() {
    resumer.cancel();
    pausedRef.current = false;
    setPaused(false);
    setAttempt((value) => value + 1);
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
            : settings.fall && stats && !stats.fallTracking
              ? t("watch.bodyIncomplete")
              : t("watch.calm");
  const failed = phase === "interrupted" || phase === "error-camera" || phase === "error-models";
  // The strongest sound the model hears now, so a test can see that audio is working.
  const heard = stats?.sound
    ? (Object.entries(stats.sound) as [DetectedKind, number][])
        .map(([kind, score]) => ({ kind, percent: Math.round(score * 100) }))
        .sort((a, b) => b.percent - a.percent)
        .find((item) => item.percent >= 5)
    : undefined;
  const loading = phase === "camera" || phase === "models" || (!configured && !failed);
  const isEnabled = (kind: DetectedKind) =>
    kind === "fall"
      ? settings.fall
      : kind === "scream" || kind === "cry"
        ? settings.distress
        : settings.hazard;

  return (
    <div className="dark fixed inset-0 overflow-hidden bg-[#060A14] text-foreground">
      <video
        ref={videoRef}
        // Always "visible": browsers pause muted video they consider hidden. Overlays cover it.
        className="absolute inset-0 size-full object-contain"
        muted
        playsInline
        onPause={() => {
          if (!pausedRef.current && !document.hidden) void resumeRef.current();
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
          onClick={() => {
            if (deviceRef.current) sendAway(deviceRef.current.deviceToken);
            onExit();
          }}
          className="glass inline-flex min-h-11 items-center gap-2 rounded-full px-4 font-bold"
        >
          <ArrowLeftIcon aria-hidden="true" className="size-5" />
          {t("watch.exit")}
        </button>
        <div className="flex gap-2">
          {phase === "running" && configured && (
            <span className="glass inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-bold">
              <i
                aria-hidden="true"
                className={cn(
                  "size-2 rounded-full",
                  paused || hidden
                    ? "bg-muted-foreground"
                    : alarm
                      ? "animate-blink bg-destructive shadow-[0_0_10px_var(--destructive)]"
                      : "animate-blink bg-primary shadow-[0_0_8px_var(--primary)]",
                )}
              />
              {paused || hidden ? t("watch.paused") : t("watch.watching")}
            </span>
          )}
          {viewers > 0 && (
            <span
              className="glass inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-bold"
              role="status"
            >
              <EyeIcon aria-hidden="true" className="size-4 text-primary-text" />
              {t("watch.beingWatched")}
            </span>
          )}
          {stats && viewers === 0 && (
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
                  {phase === "camera"
                    ? t("loading.camera")
                    : phase === "models"
                      ? t("loading.models")
                      : t("loading.settings")}
                </p>
                {phase === "models" && (
                  <p className="text-base text-muted-foreground">{t("loading.modelsHint")}</p>
                )}
              </>
            ) : (
              <>
                <p className="text-md">
                  {phase === "interrupted"
                    ? t("error.interrupted")
                    : phase === "error-camera"
                      ? t("error.camera")
                      : t("error.models")}
                </p>
                {device && <p className="text-base text-muted-foreground">{t("error.saved")}</p>}
                <Button onClick={restart}>
                  {phase === "interrupted" ? t("error.reopen") : common("actions.retry")}
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {phase === "running" && configured && (
        <section
          className="glass-strong absolute inset-x-2.5 bottom-[max(10px,env(safe-area-inset-bottom))] z-10 mx-auto grid max-w-xl grid-cols-1 gap-2.5 rounded-[22px] p-2.5 pl-4"
          aria-label={t("title")}
        >
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "truncate font-display text-md leading-6",
                  alarm && "text-destructive-text",
                )}
                aria-live="polite"
              >
                {title}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {[room, !device && t("watch.local")].filter(Boolean).join(" · ")}
              </p>
            </div>
            <button
              type="button"
              aria-label={t("watch.privacy")}
              aria-pressed={privacy}
              onClick={() => setPrivacy((value) => !value)}
              className={cn(
                "grid size-11 shrink-0 place-items-center rounded-full border border-hairline transition-colors active:scale-95",
                privacy ? "bg-primary text-primary-foreground" : "bg-white/8 text-foreground",
              )}
            >
              <EyeSlashIcon aria-hidden="true" className="size-5" />
            </button>
            <button
              type="button"
              aria-label={paused ? t("watch.resume") : t("watch.pause")}
              onClick={togglePause}
              className="grid size-11 shrink-0 place-items-center rounded-full border border-hairline bg-white/8 text-foreground active:scale-95"
            >
              {paused ? (
                <PlayIcon aria-hidden="true" className="size-5" />
              ) : (
                <PauseIcon aria-hidden="true" className="size-5" />
              )}
            </button>
            <button
              type="button"
              aria-label={t("watch.diagnostics")}
              aria-expanded={expanded}
              aria-controls="watch-details"
              onClick={() => setExpanded((value) => !value)}
              className="grid size-11 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-hairline"
            >
              <CaretUpIcon
                aria-hidden="true"
                className={cn("size-5 transition-transform", expanded && "rotate-180")}
              />
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <ul className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto [scrollbar-width:none]">
              {detectors.map((kind) => {
                const hit = recent.some((item) => item.kind === kind && now - item.at < HIT_MS);
                const active =
                  isEnabled(kind) &&
                  !paused &&
                  !hidden &&
                  (kind === "fall"
                    ? stats?.fallTracking ||
                      stats?.fallState === "falling" ||
                      stats?.fallState === "down"
                    : stats?.audioState === "running");
                return (
                  <li
                    key={kind}
                    className={cn(
                      "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-xs font-bold whitespace-nowrap transition-colors",
                      hit
                        ? "border-destructive bg-destructive/25 text-white"
                        : !isEnabled(kind)
                          ? "border-transparent text-muted-foreground/60 line-through"
                          : "border-hairline bg-white/6 text-muted-foreground",
                    )}
                  >
                    <i
                      aria-hidden="true"
                      className={cn(
                        "size-1.5 rounded-full",
                        hit
                          ? "animate-blink bg-destructive"
                          : !active
                            ? "bg-muted-foreground"
                            : "bg-primary shadow-[0_0_6px_var(--primary)]",
                      )}
                    />
                    {kindLabel(kind)}
                  </li>
                );
              })}
            </ul>
            {hasMic && stats?.audioState === "running" && heard && (
              <span className="shrink-0 text-xs font-bold text-muted-foreground tabular">
                {kindLabel(heard.kind)} {heard.percent}%
              </span>
            )}
            {hasMic && stats?.audioState === "running" ? (
              <div
                className="flex h-5 w-12 shrink-0 items-center gap-0.5"
                role="img"
                aria-label={t("watch.level")}
              >
                {levels.slice(-8).map((level, index) => (
                  <i
                    // biome-ignore lint/suspicious/noArrayIndexKey: fixed bars that only change height
                    key={index}
                    className="h-full flex-1 rounded-sm bg-primary transition-transform duration-100"
                    style={{ transform: `scaleY(${Math.max(0.12, level)})` }}
                  />
                ))}
              </div>
            ) : !hasMic ? (
              <MicrophoneSlashIcon
                aria-label={t("watch.noMic")}
                className="size-5 shrink-0 text-muted-foreground"
              />
            ) : null}
          </div>

          {hidden ? (
            <p className="text-xs font-bold text-warning-text" role="alert">
              {t("watch.hidden")}
            </p>
          ) : settings.fall && !paused && stats && !stats.fallTracking ? (
            <p className="text-xs text-warning-text">{t("watch.framingHint")}</p>
          ) : null}
          {queued > 0 && (
            <p className="text-xs font-bold text-warning-text">
              {t("watch.queued", { count: queued })}
            </p>
          )}
          {hasMic && stats?.audioState === "suspended" && (
            <Button
              size="sm"
              className="min-h-11"
              onClick={() => void watcherRef.current?.resumeAudio()}
            >
              {t("watch.enableMic")}
            </Button>
          )}
          {hasMic && stats?.audioState === "error" && (
            <div className="flex items-center justify-between gap-2" role="alert">
              <p className="text-xs text-warning-text">{t("watch.micError")}</p>
              <Button size="sm" variant="secondary" className="min-h-11 shrink-0" onClick={restart}>
                {common("actions.retry")}
              </Button>
            </div>
          )}

          <div
            id="watch-details"
            hidden={!expanded}
            className="grid gap-2 border-t border-hairline pt-2.5 pr-1.5 text-xs leading-5 text-muted-foreground"
          >
            <p>{t("watch.bodyCount", { count: stats?.people ?? 0 })}</p>
            <p className="tabular">
              {t("watch.micLevel", { level: ((stats?.level ?? 0) * 1000).toFixed(1) })}
              {stats?.heard &&
                ` · ${t("watch.heard", { name: stats.heard.name, percent: Math.round(stats.heard.score * 100) })}`}
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 tabular">
              {detectors
                .filter((kind) => kind !== "fall")
                .map((kind) => (
                  <span key={kind}>
                    {kindLabel(kind)}{" "}
                    {Math.round(
                      (stats?.sound?.[kind as keyof NonNullable<WatcherStats["sound"]>] ?? 0) * 100,
                    )}
                    %
                  </span>
                ))}
            </div>
            <p>{t("watch.placement")}</p>
            <p>{t("watch.waitHint", { seconds: fallPreset().downMs / 1000 })}</p>
            <p className="flex gap-2">
              <ShieldCheckIcon aria-hidden="true" className="size-4 shrink-0 text-primary-text" />
              {t("watch.note")}
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
