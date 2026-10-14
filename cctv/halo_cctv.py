"""Halo CCTV worker: one camera stream -> MediaPipe -> the app's own rules -> Halo API.

The camera pushes RTMP to MediaMTX; this worker reads it back over RTSP. Pose, person and
sound models run here; the fall and sound rules run unchanged in engine-bridge (Node), so a
CCTV camera decides exactly like a phone camera does.

  python halo_cctv.py pair --api https://halo.example --code 123456
  python halo_cctv.py watch --api https://halo.example --stream rtsp://... --token ...
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import subprocess
import threading
import time
import urllib.request
import uuid
from datetime import datetime, timezone
from pathlib import Path

import cv2
import mediapipe as mp
import numpy as np
import requests
from mediapipe.tasks.python import BaseOptions, audio, vision
from mediapipe.tasks.python.components.containers import audio_data

STORE = "https://storage.googleapis.com/mediapipe-models"
# A server has no phone's limits, so it runs MediaPipe's most accurate models by default.
# HALO_POSE=full is lighter if a server cannot keep up.
POSE = os.environ.get("HALO_POSE", "heavy")
MODELS = {
    "pose": f"{STORE}/pose_landmarker/pose_landmarker_{POSE}/float16/1/pose_landmarker_{POSE}.task",
    "person": f"{STORE}/object_detector/efficientdet_lite2/int8/1/efficientdet_lite2.tflite",
    "sound": f"{STORE}/audio_classifier/yamnet/float32/1/yamnet.tflite",
}
WIDTH = 640
FPS = float(os.environ.get("HALO_FPS", "5"))
HEARTBEAT_S = 30
ROTATED_SEARCH_S = 20
PERSON_SEARCH_S = 60
PERSON_EVERY_S = 0.5
SOUND_RATE = 16_000
WINDOW = round(SOUND_RATE * 0.975)
HOP = SOUND_RATE // 2
# Same level normalisation as the phone (src/detection/runtime/sound-runner.ts).
TARGET_RMS, MAX_GAIN, SILENCE_RMS = 0.1, 50.0, 0.0002


class Unpaired(Exception):
    """The server no longer accepts this camera's token."""


def model_path(name: str) -> str:
    folder = Path(os.environ.get("HALO_MODELS", Path.home() / ".cache" / "halo-cctv"))
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / Path(MODELS[name]).name
    if not path.exists():
        urllib.request.urlretrieve(MODELS[name], path)
    return str(path)


def normalized(samples: np.ndarray) -> np.ndarray:
    rms = float(np.sqrt(np.mean(samples * samples)))
    if rms < SILENCE_RMS or rms >= TARGET_RMS:
        return samples
    return np.clip(samples * min(TARGET_RMS / rms, MAX_GAIN), -1, 1).astype(np.float32)


def unrotate(points: list[dict], clockwise: bool) -> list[dict]:
    """Landmarks found in a quarter-turned picture, mapped back (as pose-runner.ts does)."""
    if clockwise:
        return [{**p, "x": p["y"], "y": 1 - p["x"]} for p in points]
    return [{**p, "x": 1 - p["y"], "y": p["x"]} for p in points]


def landmarks(result) -> list[list[dict]]:
    return [
        [{"x": p.x, "y": p.y, "visibility": p.visibility or 0.0} for p in pose]
        for pose in result.pose_landmarks
    ]


class Api:
    def __init__(self, base: str, token: str | None = None):
        self.base = base.rstrip("/")
        self.token = token

    def post(self, path: str, body: dict | None = None) -> requests.Response:
        headers = {"Authorization": f"Bearer {self.token}"} if self.token else {}
        return requests.post(f"{self.base}{path}", json=body or {}, headers=headers, timeout=15)


def pair(api: Api, code: str) -> dict:
    response = api.post("/api/v1/devices/pair", {"code": code, "kind": "ip_camera"})
    response.raise_for_status()
    return response.json()


def probe(stream: str) -> tuple[int, int]:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-rtsp_transport", "tcp", "-select_streams", "v:0",
         "-show_entries", "stream=width,height", "-of", "csv=p=0", stream],
        capture_output=True, text=True, timeout=30, check=True,
    ).stdout.strip()
    width, height = (int(v) for v in out.split(",")[:2])
    return width, height


class Worker:
    def __init__(self, api: Api, stream: str, engine_js: str, on_alive=None):
        self.api = api
        self.stream = stream
        self.on_alive = on_alive or (lambda: None)
        self.stop = threading.Event()
        self.error: Exception | None = None
        self.frame: np.ndarray | None = None
        self.frames = self.seen = 0
        self.lock = threading.Lock()
        self.bridge = subprocess.Popen(
            ["node", engine_js], stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True, bufsize=1
        )

    def send(self, message: dict) -> None:
        with self.lock:
            self.bridge.stdin.write(json.dumps(message) + "\n")
            self.bridge.stdin.flush()

    def fail(self, error: Exception) -> None:
        self.error = self.error or error
        self.stop.set()

    def run(self) -> None:
        threads = [self.heartbeat, self.detections, self.sound]
        for target in threads:
            threading.Thread(target=self.guard(target), daemon=True).start()
        try:
            self.guard(self.video)()
        finally:
            self.stop.set()
            self.bridge.kill()
        if self.error:
            raise self.error

    def guard(self, target):
        def run():
            try:
                target()
            except Exception as error:  # noqa: BLE001 - any failure ends this run; the caller restarts it
                self.fail(error)
        return run

    def heartbeat(self) -> None:
        while not self.stop.is_set():
            # Alive means this worker is running, even while Halo itself is unreachable.
            self.on_alive()
            response = self.api.post("/api/v1/devices/heartbeat")
            if response.status_code == 401:
                raise Unpaired("camera token rejected")
            if response.ok:
                self.send({"type": "settings", "settings": response.json()["settings"]})
            print(f"alive: {self.frames} frames, {self.seen} with a person", flush=True)
            self.stop.wait(HEARTBEAT_S)

    def detections(self) -> None:
        for line in self.bridge.stdout:
            detection = json.loads(line)
            snapshot = None
            if detection.get("wantsSnapshot") and self.frame is not None:
                ok, jpeg = cv2.imencode(".jpg", cv2.cvtColor(self.frame, cv2.COLOR_RGB2BGR),
                                        [cv2.IMWRITE_JPEG_QUALITY, 70])
                snapshot = base64.b64encode(jpeg).decode() if ok else None
            self.report(detection, snapshot)

    def report(self, detection: dict, snapshot: str | None) -> None:
        body = {
            "idempotencyKey": str(uuid.uuid4()),
            "kind": detection["kind"],
            "confidence": detection["confidence"],
            "occurredAt": datetime.fromtimestamp(detection["time"] / 1000, timezone.utc).isoformat(),
        }
        if snapshot:
            body["snapshot"] = snapshot
        # The same idempotency key makes retries safe; give up after about five minutes.
        for delay in (0, 2, 5, 15, 30, 60, 120):
            if self.stop.wait(delay):
                return
            try:
                response = self.api.post("/api/v1/events", body)
            except requests.RequestException:
                continue
            if response.status_code == 401:
                raise Unpaired("camera token rejected")
            if response.status_code < 500 and response.status_code != 429:
                print(f"event {detection['kind']} -> {response.status_code}", flush=True)
                return

    def sound(self) -> None:
        options = audio.AudioClassifierOptions(
            base_options=BaseOptions(model_asset_path=model_path("sound")),
            max_results=-1,
            score_threshold=0.0,
        )
        ffmpeg = subprocess.Popen(
            ["ffmpeg", "-loglevel", "error", "-rtsp_transport", "tcp", "-i", self.stream,
             "-vn", "-ac", "1", "-ar", str(SOUND_RATE), "-f", "f32le", "pipe:1"],
            stdout=subprocess.PIPE,
        )
        buffer = np.zeros(0, dtype=np.float32)
        with audio.AudioClassifier.create_from_options(options) as classifier:
            while not self.stop.is_set():
                chunk = ffmpeg.stdout.read(HOP * 4)
                if not chunk:
                    return  # A camera without a microphone, or the stream ended: video carries on.
                buffer = np.concatenate([buffer, np.frombuffer(chunk, dtype=np.float32)])[-WINDOW:]
                if len(buffer) < WINDOW:
                    continue
                clip = audio_data.AudioData.create_from_array(normalized(buffer), SOUND_RATE)
                categories = [
                    {"categoryName": c.category_name, "score": c.score}
                    for result in classifier.classify(clip)
                    for classification in result.classifications
                    for c in classification.categories
                ]
                self.send({"type": "sound", "time": time.time() * 1000, "categories": categories})
        ffmpeg.kill()

    def video(self) -> None:
        width, height = probe(self.stream)
        out_w, out_h = WIDTH, round(WIDTH * height / width / 2) * 2
        ffmpeg = subprocess.Popen(
            ["ffmpeg", "-loglevel", "error", "-rtsp_transport", "tcp", "-i", self.stream, "-an",
             "-vf", f"fps={FPS},scale={out_w}:{out_h}", "-f", "rawvideo", "-pix_fmt", "rgb24", "pipe:1"],
            stdout=subprocess.PIPE,
        )
        size = out_w * out_h * 3
        base = BaseOptions(model_asset_path=model_path("pose"))
        common = dict(num_poses=2, min_pose_detection_confidence=0.3,
                      min_pose_presence_confidence=0.3, min_tracking_confidence=0.3)
        pose = vision.PoseLandmarker.create_from_options(vision.PoseLandmarkerOptions(
            base_options=base, running_mode=vision.RunningMode.VIDEO, **common))
        # A second instance in IMAGE mode, so turned frames never disturb video tracking.
        still = vision.PoseLandmarker.create_from_options(vision.PoseLandmarkerOptions(
            base_options=base, running_mode=vision.RunningMode.IMAGE, **common))
        finder = vision.ObjectDetector.create_from_options(vision.ObjectDetectorOptions(
            base_options=BaseOptions(model_asset_path=model_path("person")),
            running_mode=vision.RunningMode.IMAGE, category_allowlist=["person"],
            score_threshold=0.25, max_results=3))
        last_seen = last_people_at = float("-inf")
        people: list[dict] = []
        clockwise = True
        started = time.monotonic()
        try:
            while not self.stop.is_set():
                raw = ffmpeg.stdout.read(size)
                if len(raw) < size:
                    raise ConnectionError("camera stream ended")
                frame = np.frombuffer(raw, dtype=np.uint8).reshape(out_h, out_w, 3)
                self.frame = frame
                self.frames += 1
                now = time.monotonic()
                image = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame)
                poses = landmarks(pose.detect_for_video(image, int((now - started) * 1000)))
                found: list[dict] = []
                if poses:
                    last_seen = now
                elif now - last_seen <= ROTATED_SEARCH_S:
                    turned = np.ascontiguousarray(np.rot90(frame, k=-1 if clockwise else 1))
                    result = still.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=turned))
                    poses = [unrotate(p, clockwise) for p in landmarks(result)]
                    clockwise = not clockwise
                if not poses and now - last_seen <= PERSON_SEARCH_S:
                    if now - last_people_at >= PERSON_EVERY_S:
                        last_people_at = now
                        people = [
                            {"x": d.bounding_box.origin_x / out_w, "y": d.bounding_box.origin_y / out_h,
                             "width": d.bounding_box.width / out_w, "height": d.bounding_box.height / out_h,
                             "score": d.categories[0].score if d.categories else 0.0}
                            for d in finder.detect(image).detections
                        ]
                    found = people
                self.seen += bool(poses or found)
                self.send({"type": "pose", "frame": {
                    "time": time.time() * 1000, "poses": poses,
                    "imageAspectRatio": out_w / out_h, "people": found,
                }})
        finally:
            ffmpeg.kill()
            for task in (pose, still, finder):
                task.close()


def watch(api: Api, stream: str, engine_js: str, on_alive=None) -> None:
    """Watches until the token is revoked; reconnects whenever the camera stream drops."""
    while True:
        try:
            Worker(api, stream, engine_js, on_alive).run()
        except Unpaired:
            raise
        except Exception as error:  # noqa: BLE001 - a dropped camera is normal; try again shortly
            print(f"stream stopped: {error}; reconnecting in 5 s", flush=True)
            time.sleep(5)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawTextHelpFormatter)
    sub = parser.add_subparsers(dest="command", required=True)
    p = sub.add_parser("pair", help="exchange a six-digit Halo code for a camera token")
    p.add_argument("--api", required=True)
    p.add_argument("--code", required=True)
    w = sub.add_parser("watch", help="watch one camera stream")
    w.add_argument("--api", required=True)
    w.add_argument("--stream", required=True)
    w.add_argument("--token", default=os.environ.get("HALO_DEVICE_TOKEN"))
    w.add_argument("--engine", default=str(Path(__file__).with_name("build") / "engine.mjs"))
    args = parser.parse_args()
    if args.command == "pair":
        print(json.dumps(pair(Api(args.api), args.code), indent=2))
    else:
        watch(Api(args.api, args.token), args.stream, args.engine)


if __name__ == "__main__":
    main()
