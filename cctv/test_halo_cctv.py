"""python -m unittest test_halo_cctv  (from cctv/)"""

import json
import os
import tempfile
import unittest
from unittest import mock

import numpy as np

import halo_cctv
from halo_cctv import UNPAIRED_EXIT, normalized, unrotate


class Helpers(unittest.TestCase):
    def test_unrotate_matches_the_phone(self):
        # Same cases as src/detection/runtime/pose-runner.test.ts: the point (0.1, 0.2).
        for point, clockwise in (({"x": 0.8, "y": 0.1}, True), ({"x": 0.2, "y": 0.9}, False)):
            back = unrotate([{**point, "visibility": 1}], clockwise)[0]
            self.assertAlmostEqual(back["x"], 0.1)
            self.assertAlmostEqual(back["y"], 0.2)

    def test_normalized_lifts_quiet_sound_only(self):
        quiet = np.full(100, 0.01, dtype=np.float32)
        self.assertAlmostEqual(float(np.sqrt(np.mean(normalized(quiet) ** 2))), 0.1, places=4)
        silence = np.full(100, 0.0001, dtype=np.float32)
        self.assertIs(normalized(silence), silence)
        loud = np.full(100, 0.5, dtype=np.float32)
        self.assertIs(normalized(loud), loud)


class Supervisor(unittest.TestCase):
    def test_starts_a_worker_per_camera_and_forgets_cameras_removed_in_halo(self):
        with tempfile.TemporaryDirectory() as folder:
            path = os.path.join(folder, "streams.json")
            with open(path, "w") as file:
                json.dump({"worker": "w", "cameras": {"a": {"password": "p", "token": "ta"}}}, file)
            process = mock.Mock()
            process.poll.side_effect = [None, UNPAIRED_EXIT]
            process.returncode = UNPAIRED_EXIT
            ticks = iter(range(3))

            def tick(_seconds):
                if next(ticks) == 1:
                    return None
                if json.load(open(path))["cameras"]:
                    return None
                raise StopIteration

            with mock.patch("subprocess.Popen", return_value=process) as popen, mock.patch("time.sleep", tick):
                with self.assertRaises(StopIteration):
                    halo_cctv.serve("https://halo.example", path, "engine.mjs")
            command = popen.call_args_list[0].args[0]
            self.assertIn("rtsp://worker:w@127.0.0.1:8554/live/a", command)
            self.assertIn("ta", command)
            self.assertEqual(json.load(open(path))["cameras"], {})


if __name__ == "__main__":
    unittest.main()
