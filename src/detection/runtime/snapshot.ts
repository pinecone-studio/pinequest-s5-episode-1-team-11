/** The current frame as a JPEG (base64, no data-URL prefix), at most 640 px wide. */
export function captureSnapshot(video: HTMLVideoElement) {
  if (!video.videoWidth) return undefined;
  const scale = Math.min(1, 640 / video.videoWidth);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.7).replace(/^data:image\/jpeg;base64,/, "");
}
