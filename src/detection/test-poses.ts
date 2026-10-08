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
        "hold" in part ? part.hold : lerp(part.from, part.to, (elapsed + step) / part.ms);
      frames.push({ time, poses: pose ? [pose] : [] });
      time += step;
    }
  }
  return frames;
}
