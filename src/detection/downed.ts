import type { FallSignal } from "./fall";
import { type PersonBox, type PoseFrame, poseFeatures } from "./pose";

/** A person box this much wider than tall (in real pixels) is lying down. */
const LYING_SHAPE = 1.2;
/** …or this much shorter than the same person standing (sitting or curled up on the floor). */
const SHORT = 0.55;
/** The box must reach this close to the floor, in standing heights. */
const NEAR_FLOOR = 0.3;
/** Box evidence is weaker than a pose, so it must hold still this long. */
const DOWN_MS = 3000;
/** The box centre may drift this much while "still" (box detectors jitter). */
const STILL = 0.12;
/** Someone must have been seen standing this recently. */
const STANDING_MEMORY_MS = 60_000;

/**
 * Backup for when the pose model loses someone on the floor: it finds people by their face, so a
 * person lying face away or face down is often missed entirely. A plain person detector still
 * sees the body. Someone seen standing who is now a low, lying-shaped or much shorter box that
 * stays put for a few seconds is reported as down.
 */
export class DownedDetector {
  /** The last standing person's height and where their feet were (0–1 image units). */
  private standing: { height: number; bottom: number; at: number } | null = null;
  private down: { since: number; x: number; y: number } | null = null;
  private alerted = false;

  reset() {
    this.standing = null;
    this.down = null;
    this.alerted = false;
  }

  update(frame: PoseFrame): FallSignal | null {
    const ratio = frame.imageAspectRatio && frame.imageAspectRatio > 0 ? frame.imageAspectRatio : 1;
    if (frame.poses.length) {
      this.learnStanding(frame, ratio);
      // While a pose is visible the pose rules decide.
      this.down = null;
      return null;
    }
    const box = largest(frame.people ?? []);
    if (!box || !this.standing || frame.time - this.standing.at > STANDING_MEMORY_MS) {
      this.down = null;
      return null;
    }
    const lyingShape = box.width * ratio >= box.height * LYING_SHAPE;
    const short = box.height <= this.standing.height * SHORT;
    const nearFloor =
      box.y + box.height >= this.standing.bottom - this.standing.height * NEAR_FLOOR;
    if (!(lyingShape || short) || !nearFloor) {
      this.down = null;
      return null;
    }
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    if (!this.down || Math.hypot((x - this.down.x) * ratio, y - this.down.y) > STILL)
      this.down = { since: frame.time, x, y };
    if (this.alerted || frame.time - this.down.since < DOWN_MS) return null;
    this.alerted = true;
    return { time: frame.time, onset: this.down.since, confidence: 0.6 };
  }

  private learnStanding(frame: PoseFrame, ratio: number) {
    for (const pose of frame.poses) {
      const features = poseFeatures(pose, ratio);
      // Only a whole, upright body gives a true standing height.
      if (!features?.ankle || features.torsoAngle >= 30 || features.shoulder.y >= features.hip.y)
        continue;
      const top = pose[0]?.visibility >= 0.5 ? pose[0].y : features.shoulder.y;
      const height = features.ankle.y - top;
      if (height < 0.2) continue;
      this.standing = { height, bottom: features.ankle.y, at: frame.time };
      // Back on their feet: a later fall may be reported again.
      this.alerted = false;
    }
  }
}

function largest(boxes: readonly PersonBox[]) {
  let best: PersonBox | null = null;
  for (const box of boxes)
    if (!best || box.width * box.height > best.width * best.height) best = box;
  return best;
}
