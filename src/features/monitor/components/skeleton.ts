import type { Pose } from "@/detection/pose";

const BONES = [
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [11, 23],
  [12, 24],
  [23, 24],
  [23, 25],
  [25, 27],
  [24, 26],
  [26, 28],
  [0, 11],
  [0, 12],
] as const;

/** Draws body points over an object-fit: cover video, matching its crop. */
export function drawSkeletons(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  poses: readonly Pose[],
  color: string,
) {
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (canvas.width !== width * ratio || canvas.height !== height * ratio) {
    canvas.width = width * ratio;
    canvas.height = height * ratio;
  }
  const context = canvas.getContext("2d");
  if (!context) return;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);
  if (!video.videoWidth) return;
  const scale = Math.max(width / video.videoWidth, height / video.videoHeight);
  const offsetX = (width - video.videoWidth * scale) / 2;
  const offsetY = (height - video.videoHeight * scale) / 2;
  const at = (index: number, pose: Pose) => ({
    x: offsetX + pose[index].x * video.videoWidth * scale,
    y: offsetY + pose[index].y * video.videoHeight * scale,
    seen: pose[index].visibility > 0.5,
  });
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = 3;
  context.lineCap = "round";
  context.shadowColor = color;
  context.shadowBlur = 10;
  for (const pose of poses) {
    for (const [a, b] of BONES) {
      const [p, q] = [at(a, pose), at(b, pose)];
      if (!p.seen || !q.seen) continue;
      context.beginPath();
      context.moveTo(p.x, p.y);
      context.lineTo(q.x, q.y);
      context.stroke();
    }
    for (const index of [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]) {
      const point = at(index, pose);
      if (!point.seen) continue;
      context.beginPath();
      context.arc(point.x, point.y, 4, 0, Math.PI * 2);
      context.fill();
    }
  }
}
