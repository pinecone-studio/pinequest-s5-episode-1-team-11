import type { DetectionSettings } from "@/contracts";
import { type PoseFeatures, type PoseFrame, pickPerson } from "./pose";

export type FallPreset = {
  /** Minimum hip drop, in torso lengths. */
  minDrop: number;
  /** Minimum average descent speed, in torso lengths per second. */
  minSpeed: number;
  /** The drop must happen within this time. */
  dropWindowMs: number;
  /** After the drop, the body must look lying down within this time. */
  settleMs: number;
  /** Stay down this long before alerting; getting up in time cancels it. */
  downMs: number;
  /** Upright this long counts as "got up". */
  getUpMs: number;
};

const base: Record<DetectionSettings["watching"], FallPreset> = {
  // Older adults: slower falls still count, alert quickly.
  elderly: {
    minDrop: 0.8,
    minSpeed: 1.3,
    dropWindowMs: 1200,
    settleMs: 1500,
    downMs: 3000,
    getUpMs: 1000,
  },
  // Wheelchair and mobility aids: shorter drops, alert quickly.
  disabled: {
    minDrop: 0.6,
    minSpeed: 1.2,
    dropWindowMs: 1200,
    settleMs: 1500,
    downMs: 3000,
    getUpMs: 1000,
  },
  // Children drop to the floor while playing: need a harder fall and longer stillness.
  child: {
    minDrop: 0.9,
    minSpeed: 1.8,
    dropWindowMs: 1000,
    settleMs: 1500,
    downMs: 6000,
    getUpMs: 1000,
  },
};
const scale = { low: [1.2, 1.25, 1.5], medium: [1, 1, 1], high: [0.85, 0.8, 0.7] } as const;

export function fallPreset({
  watching,
  sensitivity,
}: Pick<DetectionSettings, "watching" | "sensitivity">): FallPreset {
  const [drop, speed, down] = scale[sensitivity];
  const preset = base[watching];
  return {
    ...preset,
    minDrop: preset.minDrop * drop,
    minSpeed: preset.minSpeed * speed,
    downMs: preset.downMs * down,
  };
}

export type FallSignal = { time: number; onset: number; confidence: number };
export type FallState = "idle" | "watching" | "falling" | "down" | "alerted";

const isLying = (f: PoseFeatures) => f.torsoAngle >= 55 || f.aspect >= 1.1;
const isUpright = (f: PoseFeatures) => f.torsoAngle < 30 && f.aspect < 0.8;
const LOST_RESET_MS = 1500;

/**
 * Fall = a fast drop of the hips, then a lying posture, then staying down.
 * Feed it every pose frame in time order; it returns a signal once per fall.
 */
export class FallDetector {
  state: FallState = "idle";
  private history: { time: number; features: PoseFeatures }[] = [];
  private last: PoseFeatures | null = null;
  private lastSeen = 0;
  private referenceTorso = 0;
  private onset = 0;
  private dropAt = 0;
  private downSince = 0;
  private uprightSince = 0;
  private speed = 0;
  private lostDuringFall = false;

  constructor(private preset: FallPreset) {}

  configure(preset: FallPreset) {
    this.preset = preset;
  }

  reset() {
    this.state = "idle";
    this.history = [];
    this.last = null;
    this.referenceTorso = 0;
  }

  update(frame: PoseFrame): FallSignal | null {
    const features = pickPerson(frame.poses, this.last);
    return features ? this.seen(frame.time, features) : this.lost(frame.time);
  }

  private seen(time: number, features: PoseFeatures): FallSignal | null {
    this.last = features;
    this.lastSeen = time;
    if (isUpright(features)) {
      // Standing torso length is the stable unit; lying down foreshortens it.
      this.referenceTorso = this.referenceTorso
        ? this.referenceTorso * 0.9 + features.torso * 0.1
        : features.torso;
    }
    const unit = this.referenceTorso || features.torso;
    this.history.push({ time, features });
    while (this.history.length && this.history[0].time < time - this.preset.dropWindowMs) {
      this.history.shift();
    }
    this.uprightSince = isUpright(features) ? this.uprightSince || time : 0;
    const gotUp = this.uprightSince > 0 && time - this.uprightSince >= this.preset.getUpMs;

    switch (this.state) {
      case "idle":
      case "watching": {
        this.state = "watching";
        // The latest highest hip position is where the drop started.
        const highest = this.history.reduce((a, b) =>
          b.features.hip.y <= a.features.hip.y ? b : a,
        );
        const drop = (features.hip.y - highest.features.hip.y) / unit;
        const seconds = Math.max((time - highest.time) / 1000, 0.15);
        if (drop >= this.preset.minDrop && drop / seconds >= this.preset.minSpeed) {
          this.state = "falling";
          this.onset = highest.time;
          this.dropAt = time;
          this.speed = drop / seconds;
          this.lostDuringFall = false;
        }
        return null;
      }
      case "falling":
        if (isLying(features)) {
          this.state = "down";
          this.downSince = time;
        } else if (gotUp || time - this.dropAt > this.preset.settleMs) {
          this.state = "watching";
        }
        return null;
      case "down":
        if (gotUp) {
          this.state = "watching";
          return null;
        }
        return this.maybeAlert(time, features);
      case "alerted":
        if (gotUp) this.state = "watching";
        return null;
    }
  }

  private lost(time: number): FallSignal | null {
    if (this.state === "falling" || this.state === "down") {
      // Someone on the floor is often hidden by furniture: keep counting.
      this.lostDuringFall = true;
      if (this.state === "falling" && time - this.dropAt > this.preset.settleMs) {
        this.state = "down";
        this.downSince = this.dropAt;
      }
      return this.state === "down" ? this.maybeAlert(time, null) : null;
    }
    if (this.state === "alerted" && time - this.lastSeen > 10_000) this.state = "idle";
    if (time - this.lastSeen > LOST_RESET_MS) {
      this.history = [];
      this.last = null;
      if (this.state === "watching") this.state = "idle";
    }
    return null;
  }

  private maybeAlert(time: number, features: PoseFeatures | null): FallSignal | null {
    if (time - this.downSince < this.preset.downMs) return null;
    this.state = "alerted";
    const speedBonus = Math.min(1, this.speed / this.preset.minSpeed - 1) * 0.2;
    const postureBonus =
      features && (features.torsoAngle >= 70 || features.aspect >= 1.3) ? 0.15 : 0;
    const confidence = (0.6 + speedBonus + postureBonus) * (this.lostDuringFall ? 0.85 : 1);
    return { time, onset: this.onset, confidence: Math.min(0.98, Number(confidence.toFixed(2))) };
  }
}
