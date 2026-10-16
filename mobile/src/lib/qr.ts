import QRCode from "qrcode";

/** Dark runs of a QR code, row by row ([x, y, length] in modules), so it can be drawn with views. */
export function qrRuns(value: string) {
  const { modules } = QRCode.create(value, { errorCorrectionLevel: "M" });
  const runs: [number, number, number][] = [];
  for (let y = 0; y < modules.size; y++) {
    for (let x = 0; x < modules.size; x++) {
      if (!modules.get(y, x)) continue;
      const start = x;
      while (x + 1 < modules.size && modules.get(y, x + 1)) x++;
      runs.push([start, y, x - start + 1]);
    }
  }
  return { size: modules.size, runs };
}
