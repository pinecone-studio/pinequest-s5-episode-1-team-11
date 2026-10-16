import { type PoseFeatures, type PoseFrame, pickPerson } from "./pose";

export type FallPreset = {
  /** Minimum descent, in torso lengths, before considering a collapse. */
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

/** One profile for anyone at home, tuned to report someone on the floor quickly. */
const base: FallPreset = {
  minDrop: 0.6,
  minSpeed: 1.0,
  dropWindowMs: 1500,
  settleMs: 2000,
  downMs: 1000,
  getUpMs: 1000,
};

export function fallPreset(): FallPreset {
  return { ...base };
}

export type FallSignal = { time: number; onset: number; confidence: number };
export type FallState = "idle" | "watching" | "falling" | "down" | "alerted";

const isLying = (f: PoseFeatures) =>
  f.torsoAngle >= 55 || (f.hasLowerBody && f.aspect >= 1.1 && f.torsoAngle >= 30);
const isUpright = (f: PoseFeatures) =>
  f.shoulder.y < f.hip.y && f.torsoAngle < 30 && (!f.hasLowerBody || f.aspect < 0.8);
const LOST_RESET_MS = 1500;
/** Head-drop rule: the head falls a quarter of the frame quickly and stays in the lower part. */
const HEAD_DROP = 0.25;
const HEAD_FLOOR_Y = 0.6;
const HEAD_SPEED = 0.4;
const HEAD_WINDOW_MS = 1200;
const HEAD_DOWN_MS = 1000;
/** Head within this share of the person's standing height above the floor counts as on the floor. */
const NEAR_FLOOR = 0.25;
/** The same head must have been seen high (standing or sitting) this recently. */
const HIGH_HEAD_MEMORY_MS = 15_000;
/** Someone seen upright recently who has been lying this long is reported, however they got down. */
const LYING_ALERT_MS = 1500;
/** Lying flat this long is reported with no fall seen (already down when the camera started). */
const LYING_UNSEEN_MS = 10_000;
/** With no fall seen the trunk must be level: someone reclined on a sofa tilts 40–65°. */
const LEVEL_TRUNK = 70;
const UPRIGHT_MEMORY_MS = 60_000;
/** Hips this many standing torso lengths below their standing height are on the floor. */
const FLOOR_SIT_DROP = 1.3;
// Bending over also tilts the trunk: lying means the feet are near hip height, not far below.
const isFlat = (f: PoseFeatures) =>
  (f.torsoAngle >= 60 || (f.hasLowerBody && f.aspect >= 1.3 && f.torsoAngle >= 40)) &&
  (!f.ankle || f.ankle.y - f.hip.y < f.torso * 0.8);
type Sample = { time: number; features: PoseFeatures };
type MotionCandidate = { baseline: Sample; speed: number; expires: number };

function compactBody(features: PoseFeatures, height: number, torso: number, factor = 0.5) {
  return (
    features.hasLowerBody &&
    features.bodyHeight <= height * factor &&
    features.torso <= torso * (factor + 0.1)
  );
}

/**
 * Fall = rapid descent and a collapsed posture, then staying down.
 * Feed it every pose frame in time order; it returns a signal once per fall.
 */
export class FallDetector {
  state: FallState = "idle";
  private history: Sample[] = [];
  private last: PoseFeatures | null = null;
  private lastSeen = 0;
  private referenceTorso = 0;
  private onset = 0;
  private dropAt = 0;
  private downSince = 0;
  private uprightSince = 0;
  private speed = 0;
  private lostDuringFall = false;
  /** A fast drop of at least a torso length: strong enough to stand on its own. */
  private strongDrop = false;
  private lastUprightAt = 0;
  private head: { time: number; x: number; y: number }[] = [];
  private headDrop: { at: number; baselineY: number } | null = null;
  /** Floor level under the feet and standing head-to-feet height, learned while standing. */
  private floor: { y: number; height: number } | null = null;
  private nearFloorSince = 0;
  private highHeadAt = 0;
  private flatSince = 0;
  private levelSince = 0;
  /** Hip height while standing, and when it was last seen there. */
  private standingHip: { y: number; torso: number; at: number } | null = null;
  private lowSince = 0;
  private collapsePostureFrames = 0;
  private motion: MotionCandidate | null = null;
  private depthHeight = 0;
  private depthTorso = 0;
  private onsetBodyHeight = 0;
  private lastFrameTime: number | null = null;

  constructor(private preset: FallPreset) {}

  reset() {
    this.state = "idle";
    this.history = [];
    this.last = null;
    this.lastSeen = 0;
    this.referenceTorso = 0;
    this.onset = 0;
    this.dropAt = 0;
    this.downSince = 0;
    this.uprightSince = 0;
    this.speed = 0;
    this.lostDuringFall = false;
    this.strongDrop = false;
    this.lastUprightAt = 0;
    this.flatSince = 0;
    this.levelSince = 0;
    this.standingHip = null;
    this.lowSince = 0;
    this.collapsePostureFrames = 0;
    this.motion = null;
    this.depthHeight = 0;
    this.depthTorso = 0;
    this.onsetBodyHeight = 0;
    this.lastFrameTime = null;
  }

  update(frame: PoseFrame): FallSignal | null {
    if (!Number.isFinite(frame.time)) return null;
    if (this.lastFrameTime !== null) {
      if (frame.time === this.lastFrameTime) return null;
      // A resumed stream or changed clock has no continuous trajectory to compare.
      if (frame.time < this.lastFrameTime || frame.time - this.lastFrameTime > LOST_RESET_MS) {
        this.reset();
        // Head tracking survives ordinary resets (a body without hips), but not a broken clock.
        this.head = [];
        this.headDrop = null;
        this.nearFloorSince = 0;
        this.highHeadAt = 0;
      }
    }
    const features = pickPerson(frame.poses, this.last, frame.imageAspectRatio);
    if (features && this.last) {
      const ratio =
        frame.imageAspectRatio && Number.isFinite(frame.imageAspectRatio)
          ? frame.imageAspectRatio
          : 1;
      const distance = Math.hypot(
        (features.hip.x - this.last.hip.x) * ratio,
        features.hip.y - this.last.hip.y,
      );
      // A large identity jump must not join one person's upright pose to another on the floor.
      const unit = this.referenceTorso || this.last.torso;
      if (distance > unit * 2.5) {
        if (this.state === "falling" || this.state === "down") {
          // Another pose does not prove that the person already seen falling has recovered.
          this.lastFrameTime = frame.time;
          return this.lost(frame.time);
        }
        this.reset();
      }
    }
    this.lastFrameTime = frame.time;
    const signal = features ? this.seen(frame.time, features) : this.lost(frame.time);
    if (signal) {
      this.headDrop = null;
      return signal;
    }
    return this.trackHead(frame);
  }

  /**
   * The head is the landmark pose models find most reliably. When the shoulders or hips are out
   * of view, a head that drops fast into the lower part of the picture and stays there (or
   * vanishes below it) is still a fall.
   */
  private trackHead(frame: PoseFrame): FallSignal | null {
    const time = frame.time;
    const previous = this.head[this.head.length - 1];
    let nose: { x: number; y: number } | null = null;
    for (const pose of frame.poses) {
      const point = pose[0];
      if (!point || point.visibility < 0.5 || point.y < 0 || point.y > 1) continue;
      if (
        !nose ||
        (previous &&
          Math.hypot(point.x - previous.x, point.y - previous.y) <
            Math.hypot(nose.x - previous.x, nose.y - previous.y))
      )
        nose = { x: point.x, y: point.y };
    }
    // A head that jumps across the picture between frames is another person, not a fall.
    if (nose && previous && Math.hypot(nose.x - previous.x, nose.y - previous.y) > 0.3) {
      this.head = [];
      this.headDrop = null;
      this.highHeadAt = 0;
    }
    if (nose) this.head.push({ time, ...nose });
    while (this.head.length && this.head[0].time < time - HEAD_WINDOW_MS) this.head.shift();

    // Learn where the floor is from the feet of someone standing tall in the picture.
    for (const pose of frame.poses) {
      const head = pose[0];
      const feet = [27, 28, 29, 30, 31, 32]
        .map((index) => pose[index])
        .filter((point) => point && point.visibility >= 0.5 && point.y >= 0 && point.y <= 1);
      if (!head || head.visibility < 0.5 || !feet.length) continue;
      const footY = Math.max(...feet.map((point) => point.y));
      const height = footY - head.y;
      if (height < 0.3) continue;
      this.floor = this.floor
        ? { y: this.floor.y * 0.9 + footY * 0.1, height: this.floor.height * 0.9 + height * 0.1 }
        : { y: footY, height };
    }
    if (nose && this.floor && nose.y < this.floor.y - this.floor.height * 0.6)
      this.highHeadAt = time;
    // A head that was just high and is now this close to the floor is someone down,
    // however they got there.
    const nearFloor =
      nose !== null &&
      this.floor !== null &&
      this.highHeadAt > 0 &&
      time - this.highHeadAt <= HIGH_HEAD_MEMORY_MS &&
      nose.y >= this.floor.y - this.floor.height * NEAR_FLOOR;
    this.nearFloorSince = nearFloor ? this.nearFloorSince || time : 0;
    if (
      this.nearFloorSince > 0 &&
      time - this.nearFloorSince >= HEAD_DOWN_MS &&
      this.state !== "alerted"
    ) {
      const onset = this.nearFloorSince;
      this.nearFloorSince = 0;
      this.headDrop = null;
      this.state = "alerted";
      return { time, onset, confidence: 0.7 };
    }

    if (!this.headDrop && nose && this.state !== "alerted") {
      const top = this.head.reduce((a, b) => (b.y < a.y ? b : a), this.head[0]);
      const drop = nose.y - top.y;
      const seconds = Math.max((time - top.time) / 1000, 0.1);
      if (drop >= HEAD_DROP && nose.y >= HEAD_FLOOR_Y && drop / seconds >= HEAD_SPEED)
        this.headDrop = { at: time, baselineY: top.y };
    }
    if (!this.headDrop) return null;
    // Back up near the starting height: it was a bend or a sit, not a fall.
    if (nose && nose.y < this.headDrop.baselineY + 0.12) {
      this.headDrop = null;
      return null;
    }
    if (time - this.headDrop.at < HEAD_DOWN_MS || this.state === "alerted") return null;
    const onset = this.headDrop.at;
    this.headDrop = null;
    this.state = "alerted";
    return { time, onset, confidence: 0.7 };
  }

  private seen(time: number, features: PoseFeatures): FallSignal | null {
    this.last = features;
    this.lastSeen = time;
    const depthDown =
      this.depthHeight > 0 && compactBody(features, this.depthHeight, this.depthTorso, 0.6);
    const invertedDown =
      (this.state === "falling" || this.state === "down" || this.state === "alerted") &&
      features.shoulder.y > features.hip.y &&
      features.bodyHeight <= this.onsetBodyHeight * 0.8;
    const lying = isLying(features) || depthDown || invertedDown;
    const upright = isUpright(features) && !depthDown;
    if (upright && (this.state === "idle" || this.state === "watching")) {
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
    this.uprightSince = upright ? this.uprightSince || time : 0;
    const gotUp = this.uprightSince > 0 && time - this.uprightSince >= this.preset.getUpMs;
    if (upright) this.lastUprightAt = time;
    // Standing hip height and torso length together; a lower or shorter upright pose (a crouch,
    // sitting tall on the floor) does not move them.
    if (
      upright &&
      (!this.standingHip ||
        (features.hip.y <= this.standingHip.y + this.standingHip.torso * 0.5 &&
          features.torso >= this.standingHip.torso * 0.8))
    ) {
      this.standingHip = this.standingHip
        ? {
            y: this.standingHip.y * 0.8 + features.hip.y * 0.2,
            torso: this.standingHip.torso * 0.8 + features.torso * 0.2,
            at: time,
          }
        : { y: features.hip.y, torso: features.torso, at: time };
    }
    // Sitting or slumped on the floor after standing: the hips sit far below standing height.
    // A chair or kneeling lowers them about one torso length; the floor about one and a half.
    const onFloor =
      this.standingHip !== null &&
      time - this.standingHip.at <= UPRIGHT_MEMORY_MS &&
      (features.hip.y - this.standingHip.y) / this.standingHip.torso >= FLOOR_SIT_DROP;
    this.lowSince = onFloor ? this.lowSince || time : 0;
    if (
      (this.state === "idle" || this.state === "watching") &&
      this.lowSince > 0 &&
      time - this.lowSince >= LYING_ALERT_MS
    ) {
      this.state = "alerted";
      return { time, onset: this.lowSince, confidence: 0.6 };
    }
    this.flatSince = isFlat(features) ? this.flatSince || time : 0;
    this.levelSince =
      this.flatSince > 0 && features.torsoAngle >= LEVEL_TRUNK ? this.levelSince || time : 0;
    // Lying on the floor is what matters, even after a slow or unseen fall.
    if (
      (this.state === "idle" || this.state === "watching") &&
      this.flatSince > 0 &&
      this.lastUprightAt > 0 &&
      this.flatSince - this.lastUprightAt <= UPRIGHT_MEMORY_MS &&
      time - this.flatSince >= LYING_ALERT_MS
    ) {
      this.state = "alerted";
      return { time, onset: this.flatSince, confidence: 0.65 };
    }
    // Never seen upright (already lying when watching began, or the fall was out of view): there
    // is no motion to judge, so wait longer in case they are only resting, and say so in the
    // confidence. The snapshot lets the family tell the floor from a bed.
    if (
      (this.state === "idle" || this.state === "watching") &&
      this.levelSince > 0 &&
      time - this.levelSince >= LYING_UNSEEN_MS
    ) {
      this.state = "alerted";
      return { time, onset: this.levelSince, confidence: 0.55 };
    }

    switch (this.state) {
      case "idle":
      case "watching": {
        this.state = "watching";
        // A single elevated hip estimate must not become the reference for an apparent drop.
        // Require two nearby samples before using a height as the beginning of a trajectory.
        const baselines = this.history.filter((sample, index) => {
          const previous = this.history[index - 1];
          return (
            previous &&
            sample.time - previous.time <= 375 &&
            Math.abs(sample.features.hip.y - previous.features.hip.y) <= unit * 0.25 &&
            sample.features.torso >= previous.features.torso * 0.7 &&
            sample.features.torso <= previous.features.torso * 1.4
          );
        });
        const highest = baselines.length
          ? baselines.reduce((a, b) => (b.features.hip.y <= a.features.hip.y ? b : a))
          : this.motion?.baseline;
        if (!highest) return null;
        const drop = (features.hip.y - highest.features.hip.y) / unit;
        const seconds = Math.max((time - highest.time) / 1000, 0.15);
        // A sideways collapse can rotate onto the floor without a full torso-length hip drop.
        // Require a previously upright body and the same configured descent speed for this path.
        const postureChange = features.torsoAngle - highest.features.torsoAngle;
        const shortCollapse =
          drop >= this.preset.minDrop * 0.6 &&
          isUpright(highest.features) &&
          isLying(features) &&
          postureChange >= 40;
        if (
          this.motion &&
          (time > this.motion.expires || (upright && drop < this.preset.minDrop * 0.3))
        )
          this.motion = null;
        // Keep a brief rapid, tilted descent while a supported fall settles more slowly.
        // Standing-to-sitting motion cannot arm this path without the change in trunk angle.
        if (
          !this.motion &&
          isUpright(highest.features) &&
          drop >= this.preset.minDrop * 0.3 &&
          drop / seconds >= this.preset.minSpeed &&
          features.torsoAngle >= 20 &&
          postureChange >= 15
        )
          this.motion = {
            baseline: highest,
            speed: drop / seconds,
            expires: time + this.preset.settleMs,
          };
        const supportedCollapse =
          this.motion &&
          isLying(features) &&
          features.torsoAngle - this.motion.baseline.features.torsoAngle >= 40 &&
          (features.hip.y - this.motion.baseline.features.hip.y) / unit >= this.preset.minDrop;
        const shoulderDrop = (features.shoulder.y - highest.features.shoulder.y) / unit;
        // A fall along the camera's depth axis may barely move the hips. Require visible legs,
        // major whole-body contraction and torso shortening as well as rapid shoulder descent.
        const depthCollapse =
          isUpright(highest.features) &&
          highest.features.ankle &&
          features.ankle &&
          // Grounded feet and an upright trunk describe a crouch even when body height shrinks.
          ((highest.features.ankle.y - features.ankle.y) / unit >= this.preset.minDrop * 0.3 ||
            features.shoulder.y >= features.hip.y) &&
          shoulderDrop >= this.preset.minDrop &&
          shoulderDrop / seconds >= this.preset.minSpeed &&
          compactBody(features, highest.features.bodyHeight, highest.features.torso);
        if (
          !isLying(highest.features) &&
          highest.features.shoulder.y < highest.features.hip.y &&
          (((drop >= this.preset.minDrop || shortCollapse) &&
            drop / seconds >= this.preset.minSpeed) ||
            supportedCollapse ||
            depthCollapse)
        ) {
          const baseline = supportedCollapse && this.motion ? this.motion.baseline : highest;
          this.state = "falling";
          this.onset = baseline.time;
          this.dropAt = time;
          this.onsetBodyHeight = baseline.features.bodyHeight;
          this.speed = depthCollapse
            ? shoulderDrop / seconds
            : supportedCollapse && this.motion
              ? this.motion.speed
              : drop / seconds;
          this.lostDuringFall = false;
          this.strongDrop =
            drop >= Math.max(this.preset.minDrop, 1) && drop / seconds >= this.preset.minSpeed;
          this.depthHeight = depthCollapse ? baseline.features.bodyHeight : 0;
          this.depthTorso = depthCollapse ? baseline.features.torso : 0;
          this.collapsePostureFrames = this.history.filter(
            (sample) =>
              sample.time >= baseline.time &&
              (isLying(sample.features) ||
                (depthCollapse && compactBody(sample.features, this.depthHeight, this.depthTorso))),
          ).length;
          this.motion = null;
          if (depthCollapse) this.uprightSince = 0;
        }
        return null;
      }
      case "falling":
        if (lying) this.collapsePostureFrames += 1;
        if (lying) {
          this.state = "down";
          this.downSince = time;
        } else if (gotUp || time - this.dropAt > this.preset.settleMs) {
          this.state = "watching";
          this.depthHeight = 0;
          this.depthTorso = 0;
        }
        return null;
      case "down":
        if (gotUp) {
          this.state = "watching";
          this.depthHeight = 0;
          this.depthTorso = 0;
          return null;
        }
        // The debounce proves recovery, but a visible upright body should already pause an alert.
        if (upright) return null;
        return this.maybeAlert(time, features);
      case "alerted":
        // Sitting up on the floor is upright, but not back on one's feet.
        if (gotUp && !onFloor) {
          this.state = "watching";
          this.depthHeight = 0;
          this.depthTorso = 0;
        }
        return null;
    }
  }

  private lost(time: number): FallSignal | null {
    if (this.state === "falling" || this.state === "down") {
      // The last visible posture was recovering, so disappearance is not evidence of staying down.
      if (this.uprightSince > 0) {
        if (time - this.lastSeen > LOST_RESET_MS) this.reset();
        return null;
      }
      // Someone on the floor is often hidden by furniture: keep counting.
      this.lostDuringFall = true;
      if (this.state === "falling" && time - this.dropAt > this.preset.settleMs) {
        // Sitting quickly and then leaving view is not enough to infer a fall, unless the
        // body was last seen at the bottom edge: a phone framed on the upper body loses
        // someone who drops out of the bottom of the picture.
        // The lite pose model often stops seeing someone lying on the floor. After a fast drop of
        // a torso length or more, losing the body is treated as being down.
        const droppedOutOfFrame = (this.last?.hip.y ?? 0) >= 0.8;
        const tippedOver = this.strongDrop && (this.last?.torsoAngle ?? 0) >= 45;
        if (this.collapsePostureFrames < 2 && !droppedOutOfFrame && !tippedOver) {
          this.reset();
          return null;
        }
        this.state = "down";
        this.downSince = this.dropAt;
      }
      return this.state === "down" ? this.maybeAlert(time, null) : null;
    }
    if (this.state === "alerted" && time - this.lastSeen > 10_000) this.reset();
    if (this.state !== "alerted" && time - this.lastSeen > LOST_RESET_MS) this.reset();
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
