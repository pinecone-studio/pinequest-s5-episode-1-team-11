import type { DetectionSettings } from "@/contracts";
import { type Detection, DetectionEngine } from "../engine";
import type { FallState } from "../fall";
import { type PersonBox, type Pose, poseFeatures } from "../pose";
import type { SoundScores } from "../sounds";
import { createPoseRunner, type PoseRunner } from "./pose-runner";
import { captureSnapshot } from "./snapshot";
import { createSoundRunner, type SoundRunner } from "./sound-runner";
import type { VideoSource } from "./video-source";

/** Pose estimation rate. Enough for falls (~0.5 s), light enough for phones. */
const TARGET_FPS = 10;

export type WatcherStats = {
  fps: number;
  people: number;
  /** A visible shoulder/hip pair is needed; a face-only skeleton cannot track falls. */
  fallTracking: boolean;
  fallState: FallState;
  sound: SoundScores | null;
  /** Microphone loudness 0–1 (RMS), for the level meter. */
  level: number;
  /** What the sound model hears most, among all its classes. */
  heard: { name: string; score: number } | null;
  audioState: "unavailable" | "loading" | "running" | "suspended" | "error";
};
export type DetectionWithSnapshot = Detection & { snapshot?: string };
export type WatcherEvents = {
  onDetection(detection: DetectionWithSnapshot): void;
  onStats?(stats: WatcherStats): void;
  onPoses?(poses: Pose[]): void;
  onError?(error: unknown): void;
};

/** Runs both models on a source and reports detections. One per monitor screen. */
export class Watcher {
  private engine: DetectionEngine;
  private pose: PoseRunner | null = null;
  private sound: SoundRunner | null = null;
  private frameHandle = 0;
  private stopped = false;
  private paused = false;
  private frames: number[] = [];
  private stats: WatcherStats = {
    fps: 0,
    people: 0,
    fallTracking: false,
    fallState: "idle",
    sound: null,
    level: 0,
    heard: null,
    audioState: "unavailable",
  };

  constructor(
    private source: VideoSource,
    settings: DetectionSettings,
    private events: WatcherEvents,
  ) {
    this.engine = new DetectionEngine(settings);
  }

  /** Loads the models (several MB on first use; the browser caches them). */
  async start() {
    if (this.stopped) return;
    // Start audio before any model await; a mobile browser may still require a tap to resume it.
    this.stats.audioState = this.source.audio ? "loading" : "unavailable";
    const audioLoading = this.source.audio
      ? createSoundRunner(
          this.source.audio,
          (time, scores, level, top) => {
            if (this.stopped) return;
            this.stats = { ...this.stats, sound: scores, level, heard: top ?? null };
            if (!this.paused) {
              for (const detection of this.engine.sound(time, scores)) this.emit(detection);
            }
            this.events.onStats?.(this.stats);
          },
          {
            onState: (audioState) => {
              if (this.stopped || this.stats.audioState === "error") return;
              if (audioState === "suspended") this.engine.resetSoundEvidence();
              this.stats = { ...this.stats, audioState, sound: null, level: 0 };
              this.events.onStats?.(this.stats);
            },
            onError: () => this.audioFailed(),
          },
        )
          .then(async (runner) => {
            if (this.stopped) await runner.close();
            else this.sound = runner;
          })
          .catch(() => this.audioFailed())
      : Promise.resolve();
    try {
      this.pose = await createPoseRunner();
      if (this.stopped) return this.stop();
      this.schedule();
      await audioLoading;
      if (!this.stopped) this.events.onStats?.(this.stats);
    } catch (error) {
      await this.stop();
      throw error;
    }
  }

  configure(settings: DetectionSettings) {
    this.engine.configure(settings);
  }

  setPaused(paused: boolean) {
    if (this.paused === paused) return;
    this.paused = paused;
    this.engine.resetEvidence();
    this.frames = [];
    this.stats = {
      ...this.stats,
      fps: 0,
      people: 0,
      fallTracking: false,
      fallState: "idle",
      sound: null,
      level: 0,
    };
  }

  /** Called directly by a button so Safari receives a user activation. */
  resumeAudio(): Promise<void> {
    return this.sound?.resume().catch(() => this.audioFailed()) ?? Promise.resolve();
  }

  private audioFailed() {
    if (this.stopped) return;
    this.stats = { ...this.stats, audioState: "error", sound: null, level: 0 };
    this.events.onStats?.(this.stats);
  }

  async stop() {
    this.stopped = true;
    const video = this.source.video;
    if ("cancelVideoFrameCallback" in video) video.cancelVideoFrameCallback(this.frameHandle);
    cancelAnimationFrame(this.frameHandle);
    const pose = this.pose;
    const sound = this.sound;
    // Detach before awaiting cleanup so overlapping stops cannot close a runner twice.
    this.pose = null;
    this.sound = null;
    pose?.close();
    await sound?.close();
  }

  private schedule() {
    if (this.stopped) return;
    const video = this.source.video;
    this.frameHandle =
      "requestVideoFrameCallback" in video
        ? video.requestVideoFrameCallback(() => this.tick())
        : requestAnimationFrame(() => this.tick());
  }

  private lastRun = 0;
  private tick() {
    const now = performance.now();
    if (
      this.pose &&
      !this.paused &&
      now - this.lastRun >= 1000 / TARGET_FPS - 5 &&
      this.source.video.readyState >= 2
    ) {
      this.lastRun = now;
      let poses: Pose[];
      let people: PersonBox[];
      try {
        ({ poses, people } = this.pose.detect(this.source.video, now));
      } catch (error) {
        void this.stop();
        this.events.onError?.(error);
        return;
      }
      this.events.onPoses?.(poses);
      const video = this.source.video;
      const imageAspectRatio = video.videoWidth / video.videoHeight || 1;
      for (const detection of this.engine.pose({
        time: Date.now(),
        poses,
        imageAspectRatio,
        people,
      }))
        this.emit(detection);
      this.frames.push(now);
      while (this.frames.length && this.frames[0] < now - 1000) this.frames.shift();
      this.stats = {
        ...this.stats,
        fps: this.frames.length,
        people: poses.length,
        fallTracking: poses.some((pose) => poseFeatures(pose, imageAspectRatio) !== null),
        fallState: this.engine.fallState,
      };
      this.events.onStats?.(this.stats);
    }
    this.schedule();
  }

  private emit(detection: Detection) {
    const snapshot = detection.wantsSnapshot ? captureSnapshot(this.source.video) : undefined;
    this.events.onDetection({ ...detection, snapshot });
  }
}
