import type { Pose } from "../pose";
import { POSE_MODEL, wasmPath } from "./models";

export type PoseRunner = { detect(video: HTMLVideoElement, now: number): Pose[]; close(): void };

/** Loads the pose model on the GPU when possible, otherwise on the CPU. */
export async function createPoseRunner(): Promise<PoseRunner> {
  const { FilesetResolver, PoseLandmarker } = await import("@mediapipe/tasks-vision");
  const files = await FilesetResolver.forVisionTasks(wasmPath("vision"));
  const create = (delegate: "GPU" | "CPU") =>
    PoseLandmarker.createFromOptions(files, {
      baseOptions: { modelAssetPath: POSE_MODEL, delegate },
      runningMode: "VIDEO",
      numPoses: 2,
    });
  const landmarker = await create("GPU").catch(() => create("CPU"));
  return {
    // `now` must increase on every call (performance.now()).
    detect: (video, now) => landmarker.detectForVideo(video, now).landmarks,
    close: () => landmarker.close(),
  };
}
