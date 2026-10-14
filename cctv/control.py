"""Camera server control on 127.0.0.1:9995 (stdlib only, runs as the halo user).

POST /auth       MediaMTX's HTTP auth hook (authMethod: http):
                   publish        a camera: user = its device id, own path, its password
                   read  (rtsp)   the AI worker on this server
                   read  (webrtc) a family member with a token Halo signed
POST /provision  Halo adds a CCTV camera for a family (src/app/api/v1/app/cameras): signed with the
                 shared secret, it pairs the camera with Halo using the six-digit code and returns
                 what to type into the camera. `halo_cctv.py serve` starts its worker.

streams.json: {"worker": "<password>", "cameras": {"<device id>": {"password", "token"}}}.
HALO_STREAM_SECRET equals Vercel's STREAM_SECRET; HALO_API is Halo's address; HALO_PUBLIC_IP the
address cameras push to.
"""

from __future__ import annotations

import fcntl
import hashlib
import hmac
import json
import os
import secrets
import time
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

STREAMS = os.environ.get("HALO_STREAMS", "/etc/halo-cctv/streams.json")
MAX_SKEW_S = 300


def same(given: str, expected: str) -> bool:
    return bool(expected) and hmac.compare_digest(given.encode(), expected.encode())


def sign(secret: bytes, message: str) -> str:
    return hmac.new(secret, message.encode(), hashlib.sha256).hexdigest()


def allowed(request: dict, streams: dict, secret: bytes, now: float) -> bool:
    action, protocol = request.get("action"), request.get("protocol")
    path = request.get("path") or ""
    user, password = request.get("user") or "", request.get("password") or ""
    if action == "publish":
        camera = streams.get("cameras", {}).get(user) or {}
        return path == f"live/{user}" and same(password, camera.get("password", ""))
    if action != "read":
        return False
    if protocol == "rtsp":
        return request.get("ip") == "127.0.0.1" and user == "worker" and same(password, streams.get("worker", ""))
    if protocol == "webrtc" and secret:
        # Browsers that cannot send a Bearer header put the token in the password instead.
        expires, _, signature = (request.get("token") or password).partition(".")
        if not expires.isdigit() or int(expires) < now:
            return False
        return same(signature, sign(secret, f"{path}:{expires}"))
    return False


def signed(body: bytes, sent_at: str, signature: str, secret: bytes, now: float) -> bool:
    """Halo signs '<unix seconds>.<body>'; a stale or replayed-later request is refused."""
    if not secret or not sent_at.isdigit() or abs(now - int(sent_at)) > MAX_SKEW_S:
        return False
    return same(signature, sign(secret, f"{sent_at}.{body.decode()}"))


def load(path: str | None = None) -> dict:
    with open(path or STREAMS) as file:
        return json.load(file)


def update(change, path: str | None = None) -> None:
    """Read-change-write under a file lock (control.py adds cameras, the supervisor drops them);
    written to a temporary file and renamed, so readers never see half a file."""
    path = path or STREAMS
    with open(f"{path}.lock", "w") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        streams = load(path)
        change(streams)
        with open(f"{path}.tmp", "w") as file:
            json.dump(streams, file, indent=2)
        os.replace(f"{path}.tmp", path)


def provision(code: str) -> dict:
    api = os.environ["HALO_API"].rstrip("/")
    request = urllib.request.Request(
        f"{api}/api/v1/devices/pair",
        data=json.dumps({"code": code, "kind": "ip_camera"}).encode(),
        headers={"content-type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=15) as response:
        paired = json.load(response)
    device, password = paired["deviceId"], secrets.token_hex(16)
    camera = {"password": password, "token": paired["deviceToken"]}
    update(lambda streams: streams.setdefault("cameras", {}).__setitem__(device, camera))
    return {
        "deviceId": device,
        "server": f"rtmp://{os.environ['HALO_PUBLIC_IP']}:1935/live",
        "streamKey": f"{device}?user={device}&pass={password}",
    }


class Handler(BaseHTTPRequestHandler):
    def do_POST(self) -> None:  # noqa: N802 - http.server's naming
        body = self.rfile.read(int(self.headers.get("content-length", 0)))
        secret = os.environ.get("HALO_STREAM_SECRET", "").encode()
        if self.path == "/provision":
            if not signed(body, self.headers.get("x-halo-time", ""), self.headers.get("x-halo-signature", ""), secret, time.time()):
                return self.reply(401)
            try:
                code = json.loads(body)["code"]
                if not (isinstance(code, str) and code.isdigit() and len(code) == 6):
                    return self.reply(400)
                return self.reply(200, provision(code))
            except Exception:  # noqa: BLE001 - Halo refused the code or is unreachable
                return self.reply(502)
        try:
            ok = allowed(json.loads(body), load(), secret, time.time())
        except Exception:  # noqa: BLE001 - anything unexpected denies
            ok = False
        # 401 also makes RTSP clients send their credentials on the next try.
        self.reply(200 if ok else 401)

    def reply(self, status: int, body: dict | None = None) -> None:
        payload = json.dumps(body).encode() if body is not None else b""
        self.send_response(status)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, *args) -> None:
        pass


if __name__ == "__main__":
    ThreadingHTTPServer(("127.0.0.1", 9995), Handler).serve_forever()
