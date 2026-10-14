"""MediaMTX HTTP auth hook (authMethod: http), listening on 127.0.0.1:9995.

publish        a camera: user = its Halo device id, password from streams.json, its own path only
read  (rtsp)   the AI worker on this server
read  (webrtc) a family member with a token Halo signed (src/features/live/server/stream.ts)

streams.json: {"worker": "<password>", "cameras": {"<device id>": "<password>"}}, re-read on every
request so add-camera.sh needs no restart. HALO_STREAM_SECRET is the same value as Vercel's
STREAM_SECRET.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

STREAMS = os.environ.get("HALO_STREAMS", "/etc/halo-cctv/streams.json")


def same(given: str, expected: str) -> bool:
    return bool(expected) and hmac.compare_digest(given.encode(), expected.encode())


def allowed(request: dict, streams: dict, secret: bytes, now: float) -> bool:
    action, protocol = request.get("action"), request.get("protocol")
    path = request.get("path") or ""
    user, password = request.get("user") or "", request.get("password") or ""
    if action == "publish":
        expected = streams.get("cameras", {}).get(user, "")
        return path == f"live/{user}" and same(password, expected)
    if action != "read":
        return False
    if protocol == "rtsp":
        return request.get("ip") == "127.0.0.1" and user == "worker" and same(password, streams.get("worker", ""))
    if protocol == "webrtc" and secret:
        # Browsers that cannot send a Bearer header put the token in the password instead.
        expires, _, signature = (request.get("token") or password).partition(".")
        if not expires.isdigit() or int(expires) < now:
            return False
        expected = hmac.new(secret, f"{path}:{expires}".encode(), hashlib.sha256).hexdigest()
        return same(signature, expected)
    return False


class Handler(BaseHTTPRequestHandler):
    def do_POST(self) -> None:  # noqa: N802 - http.server's naming
        try:
            request = json.loads(self.rfile.read(int(self.headers.get("content-length", 0))))
            with open(STREAMS) as file:
                streams = json.load(file)
            ok = allowed(request, streams, os.environ.get("HALO_STREAM_SECRET", "").encode(), time.time())
        except Exception:  # noqa: BLE001 - anything unexpected denies
            ok = False
        # 401 also makes RTSP clients send their credentials on the next try.
        self.send_response(200 if ok else 401)
        self.end_headers()

    def log_message(self, *args) -> None:
        pass


if __name__ == "__main__":
    ThreadingHTTPServer(("127.0.0.1", 9995), Handler).serve_forever()
