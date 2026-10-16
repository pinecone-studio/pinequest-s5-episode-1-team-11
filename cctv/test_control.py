"""python -m unittest test_control  (from cctv/)"""

import io
import json
import os
import tempfile
import unittest
from unittest import mock

import control
from control import allowed, sign, signed

DEVICE = "00000000-0000-4000-8000-0000000000d1"
STREAMS = {"worker": "w" * 32, "cameras": {DEVICE: {"password": "c" * 32, "token": "t" * 43}}}
SECRET = b"s" * 32
# Same vector as src/features/live/server/stream.test.ts.
TOKEN = "1800000600.9b8facaaffbf9631ec18694e6e76e97f322aa02f851e32daca19373086fb4f02"


def ask(now=1_800_000_000, **request):
    return allowed(request, STREAMS, SECRET, now)


class StreamAuth(unittest.TestCase):
    def test_camera_publishes_only_to_its_own_path(self):
        self.assertTrue(ask(action="publish", path=f"live/{DEVICE}", user=DEVICE, password="c" * 32))
        self.assertFalse(ask(action="publish", path="live/other", user=DEVICE, password="c" * 32))
        self.assertFalse(ask(action="publish", path=f"live/{DEVICE}", user=DEVICE, password="wrong"))
        self.assertFalse(ask(action="publish", path="live/", user="", password=""))

    def test_worker_reads_rtsp_only_from_this_server(self):
        read = dict(action="read", protocol="rtsp", path=f"live/{DEVICE}", user="worker", password="w" * 32)
        self.assertTrue(ask(ip="127.0.0.1", **read))
        self.assertFalse(ask(ip="203.0.113.9", **read))

    def test_family_token_opens_its_camera_until_it_expires(self):
        view = dict(action="read", protocol="webrtc", path=f"live/{DEVICE}")
        self.assertTrue(ask(token=TOKEN, **view))
        self.assertTrue(ask(user="any", password=TOKEN, **view))
        self.assertFalse(ask(now=1_800_000_601, token=TOKEN, **view))
        self.assertFalse(ask(token=TOKEN, action="read", protocol="webrtc", path="live/other"))
        self.assertFalse(ask(token="1800000600.forged", **view))
        self.assertFalse(allowed(dict(token=TOKEN, **view), STREAMS, b"", 1_800_000_000))

    def test_everything_else_is_denied(self):
        self.assertFalse(ask(action="read", protocol="hls", path=f"live/{DEVICE}", token=TOKEN))
        self.assertFalse(ask(action="api"))


class Provisioning(unittest.TestCase):
    def test_only_fresh_requests_signed_with_the_shared_secret_are_accepted(self):
        body = b'{"code":"123456"}'
        good = sign(SECRET, '1800000000.{"code":"123456"}')
        self.assertTrue(signed(body, "1800000000", good, SECRET, 1_800_000_100))
        self.assertFalse(signed(body, "1800000000", good, SECRET, 1_800_000_400))
        self.assertFalse(signed(b'{"code":"654321"}', "1800000000", good, SECRET, 1_800_000_000))
        self.assertFalse(signed(body, "1800000000", good, b"", 1_800_000_000))

    def test_pairs_with_halo_and_saves_the_camera_for_auth_and_the_worker(self):
        with tempfile.TemporaryDirectory() as folder:
            path = os.path.join(folder, "streams.json")
            with open(path, "w") as file:
                json.dump({"worker": "w" * 32, "cameras": {}}, file)
            paired = io.BytesIO(json.dumps({"deviceId": DEVICE, "deviceToken": "t" * 43}).encode())
            env = {"HALO_API": "https://halo.example", "HALO_PUBLIC_IP": "203.0.113.5"}
            with (
                mock.patch.object(control, "STREAMS", path),
                mock.patch.dict(os.environ, env),
                mock.patch("urllib.request.urlopen", return_value=paired) as urlopen,
            ):
                result = control.provision("123456")
            sent = urlopen.call_args.args[0]
            self.assertEqual(sent.full_url, "https://halo.example/api/v1/devices/pair")
            self.assertEqual(json.loads(sent.data), {"code": "123456", "kind": "ip_camera"})
            saved = json.load(open(path))["cameras"][DEVICE]
            self.assertEqual(saved["token"], "t" * 43)
            self.assertEqual(result["server"], "rtmp://203.0.113.5:1935/live")
            self.assertEqual(result["streamKey"], f"{DEVICE}?user={DEVICE}&pass={saved['password']}")


if __name__ == "__main__":
    unittest.main()
