"""python -m unittest test_halo_cctv  (from cctv/)"""

import unittest

import numpy as np

from halo_cctv import normalized, unrotate


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


if __name__ == "__main__":
    unittest.main()
