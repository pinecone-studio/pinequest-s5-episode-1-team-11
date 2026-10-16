/**
 * Runs the app's own detection rules (falls, sounds, cooldowns) for the CCTV worker, so the
 * server decides exactly like a phone does. Reads one JSON message per line on stdin:
 *   {"type":"pose","frame":PoseFrame} · {"type":"sound","time":ms,"categories":[...]}
 *   {"type":"settings","settings":DetectionSettings}
 * and writes one JSON Detection per line on stdout.
 */
import { createInterface } from "node:readline";
import { type DetectionSettings, defaultDetectionSettings } from "@/contracts";
import { type Detection, DetectionEngine } from "@/detection/engine";
import type { PoseFrame } from "@/detection/pose";
import { groupScores } from "@/detection/sounds";

type Message =
  | { type: "pose"; frame: PoseFrame }
  | { type: "sound"; time: number; categories: { categoryName: string; score: number }[] }
  | { type: "settings"; settings: DetectionSettings };

const engine = new DetectionEngine(defaultDetectionSettings);

for await (const line of createInterface({ input: process.stdin })) {
  if (!line.trim()) continue;
  const message = JSON.parse(line) as Message;
  let found: Detection[] = [];
  if (message.type === "pose") found = engine.pose(message.frame);
  else if (message.type === "sound")
    found = engine.sound(message.time, groupScores(message.categories));
  else engine.configure(message.settings);
  for (const detection of found) process.stdout.write(`${JSON.stringify(detection)}\n`);
}
