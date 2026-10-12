/** One body landmark in image space: x, y in 0–1 (y grows downward), visibility 0–1. */
export type Keypoint = { x: number; y: number; visibility: number };
/** 33 landmarks in MediaPipe Pose order. Detection code only depends on this shape. */
export type Pose = readonly Keypoint[];
/** A person found by the object detector: 0–1 image coordinates, origin top-left. */
export type PersonBox = { x: number; y: number; width: number; height: number; score: number };
export type PoseFrame = {
  time: number;
  poses: readonly Pose[];
  /** videoWidth / videoHeight; omitted square-frame inputs retain their existing meaning. */
  imageAspectRatio?: number;
  /** People the object detector found while the pose model found nobody. */
  people?: readonly PersonBox[];
};

export const LANDMARK = {
  nose: 0,
  leftShoulder: 11,
  rightShoulder: 12,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28,
} as const;

const MIN_VISIBILITY = 0.5;

function visible(point: Keypoint | undefined): point is Keypoint {
  return (
    !!point &&
    Number.isFinite(point.visibility) &&
    point.visibility >= MIN_VISIBILITY &&
    Number.isFinite(point.x) &&
    Number.isFinite(point.y) &&
    point.x >= 0 &&
    point.x <= 1 &&
    point.y >= 0 &&
    point.y <= 1
  );
}

function imageRatio(ratio: number) {
  return Number.isFinite(ratio) && ratio > 0 ? ratio : 1;
}

function middle(pose: Pose, a: number, b: number) {
  const [p, q] = [pose[a], pose[b]];
  const pv = visible(p);
  const qv = visible(q);
  if (pv && qv) return { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
  if (pv) return { x: p.x, y: p.y };
  if (qv) return { x: q.x, y: q.y };
  return null;
}

/** Size-independent body measurements the fall detector reasons about. */
export type PoseFeatures = {
  /** Hip centre, 0–1 image coordinates. */
  hip: { x: number; y: number };
  /** Shoulder centre, 0–1 image coordinates. */
  shoulder: { x: number; y: number };
  /** Visible ankle centre; null when the feet are cropped or hidden. */
  ankle: { x: number; y: number } | null;
  /** Shoulder-to-hip distance; the unit for speeds, so near and far people compare. */
  torso: number;
  /** 0° upright, 90° lying flat. */
  torsoAngle: number;
  /** Width / height of the visible body. Above 1 means wider than tall. */
  aspect: number;
  /** Visible trunk/leg height in frame-height units. */
  bodyHeight: number;
  /** Whole-body aspect is unreliable when the legs are cropped or hidden. */
  hasLowerBody: boolean;
};

export function poseFeatures(pose: Pose, imageAspectRatio = 1): PoseFeatures | null {
  const shoulder = middle(pose, LANDMARK.leftShoulder, LANDMARK.rightShoulder);
  const hip = middle(pose, LANDMARK.leftHip, LANDMARK.rightHip);
  if (!shoulder || !hip) return null;
  // MediaPipe normalizes x by width and y by height; compare them in height units.
  const ratio = imageRatio(imageAspectRatio);
  const dx = (hip.x - shoulder.x) * ratio;
  const dy = hip.y - shoulder.y;
  const torso = Math.hypot(dx, dy);
  if (torso < 0.02) return null;
  // Arms can span wider than a standing body is tall. Use the trunk and legs instead.
  const body = Object.values(LANDMARK)
    .map((index) => pose[index])
    .filter(visible);
  const xs = body.map((point) => point.x);
  const ys = body.map((point) => point.y);
  const width = (Math.max(...xs) - Math.min(...xs)) * ratio;
  const height = Math.max(Math.max(...ys) - Math.min(...ys), 0.01);
  return {
    hip,
    shoulder,
    ankle: middle(pose, LANDMARK.leftAnkle, LANDMARK.rightAnkle),
    torso,
    torsoAngle: (Math.atan2(Math.abs(dx), Math.abs(dy)) * 180) / Math.PI,
    aspect: width / height,
    bodyHeight: height,
    hasLowerBody: [
      LANDMARK.leftKnee,
      LANDMARK.rightKnee,
      LANDMARK.leftAnkle,
      LANDMARK.rightAnkle,
    ].some((index) => visible(pose[index])),
  };
}

/** Follows one person between frames: the nearest hip to the last one, else the largest body. */
export function pickPerson(
  poses: readonly Pose[],
  previous: PoseFeatures | null,
  imageAspectRatio = 1,
) {
  let best: PoseFeatures | null = null;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const pose of poses) {
    const features = poseFeatures(pose, imageAspectRatio);
    if (!features) continue;
    const score = previous
      ? Math.hypot(
          (features.hip.x - previous.hip.x) * imageRatio(imageAspectRatio),
          features.hip.y - previous.hip.y,
        )
      : -features.torso;
    if (score < bestScore) {
      best = features;
      bestScore = score;
    }
  }
  return best;
}
