import { isSourceEnded } from "./source-health";
import type { VideoSource } from "./video-source";

export type SourceResumerEvents = {
  canResume(source: VideoSource): boolean;
  onResuming(source: VideoSource): void;
  onResumed(source: VideoSource): void;
  onInterrupted(source: VideoSource): void;
};

/** Only the latest eligible play request may change monitoring state. */
export class SourceResumer {
  private generation = 0;

  constructor(private events: SourceResumerEvents) {}

  async resume(source: VideoSource): Promise<void> {
    const generation = ++this.generation;
    const current = () => generation === this.generation && this.events.canResume(source);
    if (!current()) return;
    if (isSourceEnded(source)) {
      this.events.onInterrupted(source);
      return;
    }
    // The caller can resume AudioContext here while the user gesture is still active.
    this.events.onResuming(source);
    if (!current()) return;
    try {
      await source.video.play();
    } catch {
      // Safari can reject an older play after pause, hide, cleanup or a newer play.
      if (current()) this.events.onInterrupted(source);
      return;
    }
    if (!current()) return;
    if (isSourceEnded(source)) this.events.onInterrupted(source);
    else this.events.onResumed(source);
  }

  cancel(): void {
    this.generation++;
  }
}
