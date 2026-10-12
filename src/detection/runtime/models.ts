/** Must match the @mediapipe/tasks-* versions in package.json; a test keeps them in sync. */
export const MEDIAPIPE_VERSION = "1.0.1";

export const wasmPath = (task: "vision" | "audio") =>
  `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-${task}@${MEDIAPIPE_VERSION}/wasm`;

/** Lite pose model (~5 MB): the CPU fallback, fast enough for any phone. */
export const POSE_MODEL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
/** Full pose model (~9 MB): better at people lying on the floor; phones with a GPU. */
export const POSE_MODEL_FULL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task";
/** Heavy pose model (~30 MB): MediaPipe's most accurate; laptops and desktops with a GPU. */
export const POSE_MODEL_HEAVY =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task";
/** EfficientDet-Lite0 (~4.6 MB): finds whole people, including lying ones pose models miss. Phones. */
export const PERSON_MODEL =
  "https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/int8/1/efficientdet_lite0.tflite";
/** EfficientDet-Lite2 (~7.5 MB): finds noticeably more people lying on the floor. Computers. */
export const PERSON_MODEL_LARGE =
  "https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite2/int8/1/efficientdet_lite2.tflite";
/** YAMNet (~4 MB): 521 AudioSet sound classes, ~1 s windows. */
export const SOUND_MODEL =
  "https://storage.googleapis.com/mediapipe-models/audio_classifier/yamnet/float32/1/yamnet.tflite";
