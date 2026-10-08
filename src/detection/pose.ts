/** One body landmark in image space: x, y in 0–1 (y grows downward), visibility 0–1. */
export type Keypoint = { x: number; y: number; visibility: number };
/** 33 landmarks in MediaPipe Pose order. Detection code only depends on this shape. */
export type Pose = readonly Keypoint[];
export type PoseFrame = { time: number; poses: readonly Pose[] };

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

function middle(pose: Pose, a: number, b: number) {
  const [p, q] = [pose[a], pose[b]];
  if (!p || !q) return null;
  const pv = p.visibility >= MIN_VISIBILITY;
  const qv = q.visibility >= MIN_VISIBILITY;
  if (pv && qv) return { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
  if (pv) return { x: p.x, y: p.y };
  if (qv) return { x: q.x, y: q.y };
  return null;
}

/** Size-independent body measurements the fall detector reasons about. */
export type PoseFeatures = {
  /** Hip centre, 0–1 image coordinates. */
  hip: { x: number; y: number };
  /** Shoulder-to-hip distance; the unit for speeds, so near and far people compare. */
  torso: number;
  /** 0° upright, 90° lying flat. */
  torsoAngle: number;
  /** Width / height of the visible body. Above 1 means wider than tall. */
  aspect: number;
};

export function poseFeatures(pose: Pose): PoseFeatures | null {
  const shoulder = middle(pose, LANDMARK.leftShoulder, LANDMARK.rightShoulder);
  const hip = middle(pose, LANDMARK.leftHip, LANDMARK.rightHip);
  if (!shoulder || !hip) return null;
  const dx = hip.x - shoulder.x;
  const dy = hip.y - shoulder.y;
  const torso = Math.hypot(dx, dy);
  if (torso < 0.02) return null;
  const visible = pose.filter((point) => point.visibility >= MIN_VISIBILITY);
  const xs = visible.map((point) => point.x);
  const ys = visible.map((point) => point.y);
  const width = Math.max(...xs) - Math.min(...xs);
  const height = Math.max(Math.max(...ys) - Math.min(...ys), 0.01);
  return {
    hip,
    torso,
    torsoAngle: (Math.atan2(Math.abs(dx), Math.abs(dy)) * 180) / Math.PI,
    aspect: width / height,
  };
}

/** Follows one person between frames: the nearest hip to the last one, else the largest body. */
export function pickPerson(poses: readonly Pose[], previous: PoseFeatures | null) {
  let best: PoseFeatures | null = null;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const pose of poses) {
    const features = poseFeatures(pose);
    if (!features) continue;
    const score = previous
      ? Math.hypot(features.hip.x - previous.hip.x, features.hip.y - previous.hip.y)
      : -features.torso;
    if (score < bestScore) {
      best = features;
      bestScore = score;
    }
  }
  return best;
}
