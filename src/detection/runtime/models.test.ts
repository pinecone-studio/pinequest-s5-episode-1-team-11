import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { MEDIAPIPE_VERSION } from "./models";

it("loads wasm files for the installed MediaPipe version", () => {
  const { dependencies } = JSON.parse(readFileSync("package.json", "utf8"));
  expect(dependencies["@mediapipe/tasks-vision"]).toBe(MEDIAPIPE_VERSION);
  expect(dependencies["@mediapipe/tasks-audio"]).toBe(MEDIAPIPE_VERSION);
});
