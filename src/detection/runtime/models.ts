/** Must match the @mediapipe/tasks-* versions in package.json; a test keeps them in sync. */
export const MEDIAPIPE_VERSION = "1.0.1";

export const wasmPath = (task: "vision" | "audio") =>
  `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-${task}@${MEDIAPIPE_VERSION}/wasm`;

/** Lite pose model (~5 MB): fast enough for phones, 33 landmarks per person. */
export const POSE_MODEL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
/** YAMNet (~4 MB): 521 AudioSet sound classes, ~1 s windows. */
export const SOUND_MODEL =
  "https://storage.googleapis.com/mediapipe-models/audio_classifier/yamnet/float32/1/yamnet.tflite";
