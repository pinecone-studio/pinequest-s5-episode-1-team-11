import type { EventIngest } from "@/contracts";
import type { ApiResult } from "./api";

const KEY = "halo.outbox";
const MAX_ITEMS = 20;
const MAX_DELAY_MS = 60_000;

type Storage = Pick<globalThis.Storage, "getItem" | "setItem">;
export type FlushOutcome = "empty" | "sent" | "waiting" | "unauthorized";

/**
 * Detections wait here until the server confirms them, surviving reloads and lost Wi-Fi.
 * Each keeps its idempotency key, so a resend never creates a second event.
 */
export class Outbox {
  private items: EventIngest[];
  private failures = 0;
  private nextAttempt = 0;
  private flushing: Promise<FlushOutcome> | null = null;

  constructor(private storage: Storage | null) {
    try {
      this.items = JSON.parse(storage?.getItem(KEY) ?? "[]");
    } catch {
      this.items = [];
    }
  }

  get size() {
    return this.items.length;
  }

  add(event: EventIngest) {
    this.items.push(event);
    // Keep the newest MAX_ITEMS.
    if (this.items.length > MAX_ITEMS) this.items.shift();
    this.save();
    this.nextAttempt = 0;
  }

  /** Sends in order. Stops at the first temporary failure and backs off exponentially. */
  flush(
    send: (event: EventIngest) => Promise<ApiResult<null>>,
    now = Date.now(),
  ): Promise<FlushOutcome> {
    // Detection, heartbeats and reconnection may all request a flush at once.
    if (this.flushing) return this.flushing;
    this.flushing = this.drain(send, now).finally(() => {
      this.flushing = null;
    });
    return this.flushing;
  }

  private async drain(
    send: (event: EventIngest) => Promise<ApiResult<null>>,
    now: number,
  ): Promise<FlushOutcome> {
    if (!this.items.length) return "empty";
    if (now < this.nextAttempt) return "waiting";
    while (this.items.length) {
      const event = this.items[0];
      const result = await send(event);
      if (!result.ok && result.reason === "unauthorized") return "unauthorized";
      if (!result.ok && result.reason !== "invalid") {
        this.failures++;
        this.nextAttempt = now + Math.min(MAX_DELAY_MS, 2000 * 2 ** (this.failures - 1));
        return "waiting";
      }
      // Sent, or rejected for good (e.g. too old): either way it leaves the queue.
      // New detections can evict the oldest item while its request is in flight.
      const index = this.items.findIndex((item) => item.idempotencyKey === event.idempotencyKey);
      if (index !== -1) this.items.splice(index, 1);
      this.save();
    }
    this.failures = 0;
    return "sent";
  }

  private save() {
    try {
      this.storage?.setItem(KEY, JSON.stringify(this.items));
    } catch {
      // Full storage: drop the snapshots, keep the events.
      this.items = this.items.map(({ snapshot: _, ...event }) => event);
      try {
        this.storage?.setItem(KEY, JSON.stringify(this.items));
      } catch {}
    }
  }
}
