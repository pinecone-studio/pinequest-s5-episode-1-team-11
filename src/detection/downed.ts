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
/** A standing reference counts this long; after that the box is judged by its shape alone. */
const STANDING_MEMORY_MS = 60_000;
/** With no standing reference only a clearly lying shape counts (a seated person with legs out
 * is about as wide as tall), and it must stay put this long. */
const UNSEEN_LYING_SHAPE = 1.8;
const UNSEEN_DOWN_MS = 10_000;

/**
 * Backup for when the pose model loses someone on the floor: it finds people by their face, so a
 * person lying face away or face down is often missed entirely. A plain person detector still
 * sees the body. Someone seen standing who is now a low, lying-shaped or much shorter box that
 * stays put for a few seconds is reported as down. Someone never seen standing (already lying
 * when the camera started) is reported once a lying-shaped box has stayed put for 10 s.
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
    if (!box) {
      this.down = null;
      return null;
    }
    const standing =
      this.standing && frame.time - this.standing.at <= STANDING_MEMORY_MS ? this.standing : null;
    const lyingShape = box.width * ratio >= box.height * LYING_SHAPE;
    const down = standing
      ? (lyingShape || box.height <= standing.height * SHORT) &&
        box.y + box.height >= standing.bottom - standing.height * NEAR_FLOOR
      : box.width * ratio >= box.height * UNSEEN_LYING_SHAPE;
    if (!down) {
      this.down = null;
      return null;
    }
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    if (!this.down || Math.hypot((x - this.down.x) * ratio, y - this.down.y) > STILL)
      this.down = { since: frame.time, x, y };
    if (this.alerted || frame.time - this.down.since < (standing ? DOWN_MS : UNSEEN_DOWN_MS))
      return null;
    this.alerted = true;
    return { time: frame.time, onset: this.down.since, confidence: standing ? 0.6 : 0.5 };
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
