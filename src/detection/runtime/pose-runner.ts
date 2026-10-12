import type { Keypoint, PersonBox, Pose } from "../pose";
import {
  PERSON_MODEL,
  PERSON_MODEL_LARGE,
  POSE_MODEL,
  POSE_MODEL_FULL,
  POSE_MODEL_HEAVY,
  wasmPath,
} from "./models";

export type PoseResult = { poses: Pose[]; people: PersonBox[] };
export type PoseRunner = {
  detect(video: HTMLVideoElement, now: number): PoseResult;
  close(): void;
};

/** Look for a lying body this long after the last person was seen. */
const ROTATED_SEARCH_MS = 20_000;
/** Keep looking for whole people this long, and at most this often. */
const PERSON_SEARCH_MS = 60_000;
const PERSON_EVERY_MS = 500;

/** Landmarks found in a picture turned a quarter turn, mapped back to the camera picture. */
export function unrotate(points: readonly Keypoint[], clockwise: boolean): Keypoint[] {
  return points.map((point) =>
    clockwise ? { ...point, x: point.y, y: 1 - point.x } : { ...point, x: 1 - point.y, y: point.x },
  );
}

/**
 * Picks the most accurate pose model the device can run: heavy on a computer's GPU, full on a
 * phone's GPU, lite on the CPU. Confidence floors are lowered so a person lying on the floor,
 * whom the detector is less sure about than someone standing, keeps being tracked.
 *
 * Pose models are trained mostly on upright people and often miss someone lying flat. When a
 * person was just in view and is no longer found, the frame is also searched turned a quarter
 * turn each way, where a lying body looks upright, and a plain person detector looks for the
 * whole body (it does not need to see a face).
 */
export async function createPoseRunner(): Promise<PoseRunner> {
  const { FilesetResolver, ObjectDetector, PoseLandmarker } = await import(
    "@mediapipe/tasks-vision"
  );
  const files = await FilesetResolver.forVisionTasks(wasmPath("vision"));
  const options = {
    numPoses: 2,
    minPoseDetectionConfidence: 0.3,
    minPosePresenceConfidence: 0.3,
    minTrackingConfidence: 0.3,
  };
  const phone = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
  let delegate: "GPU" | "CPU" = "GPU";
  let model = phone ? POSE_MODEL_FULL : POSE_MODEL_HEAVY;
  const landmarker = await PoseLandmarker.createFromOptions(files, {
    baseOptions: { modelAssetPath: model, delegate },
    runningMode: "VIDEO",
    ...options,
  }).catch(() => {
    delegate = "CPU";
    model = POSE_MODEL;
    return PoseLandmarker.createFromOptions(files, {
      baseOptions: { modelAssetPath: model, delegate },
      runningMode: "VIDEO",
      ...options,
    });
  });

  let still: Awaited<ReturnType<typeof PoseLandmarker.createFromOptions>> | null = null;
  let loadingStill = false;
  let canvas: HTMLCanvasElement | null = null;
  let finder: Awaited<ReturnType<typeof ObjectDetector.createFromOptions>> | null = null;
  let loadingFinder = false;
  let people: PersonBox[] = [];
  let lastPeopleAt = Number.NEGATIVE_INFINITY;

  function findPeople(video: HTMLVideoElement, now: number): PersonBox[] {
    if (now - lastPeopleAt < PERSON_EVERY_MS) return people;
    lastPeopleAt = now;
    if (!finder) {
      if (!loadingFinder) {
        loadingFinder = true;
        void ObjectDetector.createFromOptions(files, {
          baseOptions: { modelAssetPath: phone ? PERSON_MODEL : PERSON_MODEL_LARGE, delegate },
          runningMode: "IMAGE",
          categoryAllowlist: ["person"],
          // A body on the floor scores lower than one standing; the downed rule needs more than a box.
          scoreThreshold: 0.25,
          maxResults: 3,
        })
          .then((instance) => {
            finder = instance;
          })
          .catch(() => undefined);
      }
      return [];
    }
    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) return [];
    let found: ReturnType<typeof finder.detect>;
    try {
      found = finder.detect(video);
    } catch {
      // The backup must never stop pose detection; give up on it for this session.
      finder.close();
      finder = null;
      people = [];
      return people;
    }
    people = found.detections.flatMap(({ boundingBox, categories }) =>
      boundingBox
        ? [
            {
              x: boundingBox.originX / width,
              y: boundingBox.originY / height,
              width: boundingBox.width / width,
              height: boundingBox.height / height,
              score: categories[0]?.score ?? 0,
            },
          ]
        : [],
    );
    return people;
  }
  let lastSeen = Number.NEGATIVE_INFINITY;
  let clockwise = true;

  function rotated(video: HTMLVideoElement): Pose[] {
    if (!still) {
      if (!loadingStill) {
        loadingStill = true;
        // A second instance in IMAGE mode, so rotated frames never disturb video tracking.
        void PoseLandmarker.createFromOptions(files, {
          baseOptions: { modelAssetPath: model, delegate },
          runningMode: "IMAGE",
          ...options,
        })
          .then((instance) => {
            still = instance;
          })
          .catch(() => undefined);
      }
      return [];
    }
    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) return [];
    canvas ??= document.createElement("canvas");
    canvas.width = height;
    canvas.height = width;
    const context = canvas.getContext("2d");
    if (!context) return [];
    context.save();
    if (clockwise) {
      context.translate(height, 0);
      context.rotate(Math.PI / 2);
    } else {
      context.translate(0, width);
      context.rotate(-Math.PI / 2);
    }
    context.drawImage(video, 0, 0, width, height);
    context.restore();
    const turn = clockwise;
    clockwise = !clockwise;
    return still.detect(canvas).landmarks.map((points) => unrotate(points, turn));
  }

  return {
    // `now` must increase on every call (performance.now()).
    detect(video, now) {
      const poses = landmarker.detectForVideo(video, now).landmarks as Pose[];
      if (poses.length) {
        lastSeen = now;
        return { poses, people: [] };
      }
      const turned = now - lastSeen <= ROTATED_SEARCH_MS ? rotated(video) : [];
      if (turned.length) return { poses: turned, people: [] };
      return {
        poses: [],
        people: now - lastSeen <= PERSON_SEARCH_MS ? findPeople(video, now) : [],
      };
    },
    close() {
      landmarker.close();
      still?.close();
      finder?.close();
    },
  };
}
