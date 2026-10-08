import type { DetectionSettings } from "@/contracts";
import { type Detection, DetectionEngine } from "../engine";
import type { FallState } from "../fall";
import type { Pose } from "../pose";
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
  fallState: FallState;
  sound: SoundScores | null;
  /** Microphone loudness 0–1 (RMS), for the level meter. */
  level: number;
};
export type DetectionWithSnapshot = Detection & { snapshot?: string };
export type WatcherEvents = {
  onDetection(detection: DetectionWithSnapshot): void;
  onStats?(stats: WatcherStats): void;
  onPoses?(poses: Pose[]): void;
};

/** Runs both models on a source and reports detections. One per monitor screen. */
export class Watcher {
  private engine: DetectionEngine;
  private pose: PoseRunner | null = null;
  private sound: SoundRunner | null = null;
  private frameHandle = 0;
  private stopped = false;
  private frames: number[] = [];
  private stats: WatcherStats = { fps: 0, people: 0, fallState: "idle", sound: null, level: 0 };

  constructor(
    private source: VideoSource,
    settings: DetectionSettings,
    private events: WatcherEvents,
  ) {
    this.engine = new DetectionEngine(settings);
  }

  /** Loads the models (several MB on first use; the browser caches them). */
  async start() {
    this.pose = await createPoseRunner();
    if (this.source.audio) {
      this.sound = await createSoundRunner(this.source.audio, (time, scores, level) => {
        this.stats = { ...this.stats, sound: scores, level };
        for (const detection of this.engine.sound(time, scores)) this.emit(detection);
      });
    }
    if (this.stopped) return this.stop();
    this.schedule();
  }

  configure(settings: DetectionSettings) {
    this.engine.configure(settings);
  }

  async stop() {
    this.stopped = true;
    const video = this.source.video;
    if ("cancelVideoFrameCallback" in video) video.cancelVideoFrameCallback(this.frameHandle);
    cancelAnimationFrame(this.frameHandle);
    this.pose?.close();
    this.pose = null;
    await this.sound?.close();
    this.sound = null;
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
      now - this.lastRun >= 1000 / TARGET_FPS - 5 &&
      this.source.video.readyState >= 2
    ) {
      this.lastRun = now;
      const poses = this.pose.detect(this.source.video, now);
      this.events.onPoses?.(poses);
      for (const detection of this.engine.pose({ time: Date.now(), poses })) this.emit(detection);
      this.frames.push(now);
      while (this.frames.length && this.frames[0] < now - 1000) this.frames.shift();
      this.stats = {
        ...this.stats,
        fps: this.frames.length,
        people: poses.length,
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
