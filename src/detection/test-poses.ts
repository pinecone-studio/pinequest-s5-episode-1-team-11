import type { Keypoint, Pose, PoseFrame } from "./pose";

/** Synthetic MediaPipe-shaped bodies for detector tests. */
function body(points: Record<number, [number, number]>): Pose {
  return Array.from({ length: 33 }, (_, index): Keypoint => {
    const point = points[index];
    return point ? { x: point[0], y: point[1], visibility: 0.95 } : { x: 0, y: 0, visibility: 0 };
  });
}

export function standing(hipY = 0.5, torso = 0.15, x = 0.5): Pose {
  return body({
    0: [x, hipY - torso * 1.3],
    11: [x - 0.05, hipY - torso],
    12: [x + 0.05, hipY - torso],
    23: [x - 0.04, hipY],
    24: [x + 0.04, hipY],
    25: [x - 0.04, hipY + torso * 0.9],
    26: [x + 0.04, hipY + torso * 0.9],
    27: [x - 0.04, hipY + torso * 1.8],
    28: [x + 0.04, hipY + torso * 1.8],
  });
}

export function lying(hipY = 0.8, torso = 0.15, x = 0.5): Pose {
  return body({
    0: [x - torso * 1.3, hipY - 0.01],
    11: [x - torso, hipY - 0.02],
    12: [x - torso, hipY + 0.01],
    23: [x, hipY - 0.01],
    24: [x, hipY + 0.01],
    25: [x + torso * 0.9, hipY],
    26: [x + torso * 0.9, hipY + 0.02],
    27: [x + torso * 1.8, hipY],
    28: [x + torso * 1.8, hipY + 0.02],
  });
}

export function leaning(hipY = 0.58, angle = 35, torso = 0.15): Pose {
  const radians = (angle * Math.PI) / 180;
  const dx = Math.sin(radians) * torso;
  const dy = Math.cos(radians) * torso;
  return standing(hipY, torso).map((point, index) => {
    if (index === 0) return { ...point, x: 0.5 - dx * 1.3, y: hipY - dy * 1.3 };
    if (index === 11 || index === 12) return { ...point, x: point.x - dx, y: hipY - dy };
    return point;
  });
}

/** A body foreshortened along the camera's depth axis, with the legs still visible. */
export function depthCollapsed(): Pose {
  return body({
    0: [0.5, 0.46],
    11: [0.45, 0.48],
    12: [0.55, 0.48],
    23: [0.46, 0.52],
    24: [0.54, 0.52],
    25: [0.46, 0.55],
    26: [0.54, 0.55],
    27: [0.46, 0.59],
    28: [0.54, 0.59],
  });
}

/** A squat with an upright trunk and feet planted at their original image height. */
export function crouching(hideFeet = false): Pose {
  return body({
    0: [0.5, 0.58],
    11: [0.45, 0.6],
    12: [0.55, 0.6],
    23: [0.46, 0.68],
    24: [0.54, 0.68],
    25: [0.58, 0.69],
    26: [0.54, 0.71],
    27: [0.46, 0.77],
    28: [0.54, 0.77],
  }).map((point, index) =>
    hideFeet && (index === 27 || index === 28) ? { ...point, visibility: 0 } : point,
  );
}

function lerp(a: Pose, b: Pose, t: number): Pose {
  return a.map((p, i) => ({
    x: p.x + (b[i].x - p.x) * t,
    y: p.y + (b[i].y - p.y) * t,
    visibility: Math.min(p.visibility, b[i].visibility),
  }));
}

/** Builds frames at 10 fps from steps of [pose or transition, duration ms]. */
export function timeline(
  steps: ({ hold: Pose | null; ms: number } | { from: Pose; to: Pose; ms: number })[],
  fps = 10,
): PoseFrame[] {
  const frames: PoseFrame[] = [];
  const step = 1000 / fps;
  let time = 0;
  for (const part of steps) {
    for (let elapsed = 0; elapsed < part.ms; elapsed += step) {
      const pose =
        "hold" in part
          ? part.hold
          : lerp(part.from, part.to, Math.min(1, (elapsed + step) / part.ms));
      frames.push({ time, poses: pose ? [pose] : [] });
      time += step;
    }
  }
  return frames;
}
