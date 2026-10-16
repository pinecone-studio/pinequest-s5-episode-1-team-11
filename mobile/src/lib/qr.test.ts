import QRCode from "qrcode";
import { describe, expect, it } from "vitest";
import { qrRuns } from "./qr";

describe("qrRuns", () => {
  it("covers exactly the dark modules of the code", () => {
    const value = "https://halo-team11.vercel.app/monitor?code=123456";
    const { modules } = QRCode.create(value, { errorCorrectionLevel: "M" });
    const { size, runs } = qrRuns(value);
    expect(size).toBe(modules.size);
    const dark = new Set<string>();
    for (const [x, y, length] of runs)
      for (let i = 0; i < length; i++) dark.add(`${x + i},${y}`);
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) expect(dark.has(`${x},${y}`)).toBe(!!modules.get(y, x));
    // The top-left finder pattern starts every code with a run of seven.
    expect(runs[0]).toEqual([0, 0, 7]);
  });
});
