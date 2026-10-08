import { describe, expect, it } from "vitest";
import type { EventIngest } from "@/contracts";
import type { ApiResult } from "./api";
import { Outbox } from "./outbox";

function memory() {
  const data = new Map<string, string>();
  return { getItem: (key: string) => data.get(key) ?? null, setItem: data.set.bind(data) };
}
const event = (key: string): EventIngest => ({
  idempotencyKey: `event-${key}`,
  kind: "fall",
  confidence: 0.9,
  occurredAt: "2026-10-08T12:00:00.000Z",
});
const ok: ApiResult<null> = { ok: true, data: null };

describe("event outbox", () => {
  it("survives a reload and sends in order", async () => {
    const storage = memory();
    new Outbox(storage).add(event("a"));
    const box = new Outbox(storage);
    box.add(event("b"));
    const sent: string[] = [];
    const send = async (e: EventIngest) => {
      sent.push(e.idempotencyKey);
      return ok;
    };
    expect(await box.flush(send)).toBe("sent");
    expect(sent).toEqual(["event-a", "event-b"]);
    expect(new Outbox(storage).size).toBe(0);
  });

  it("keeps events through failures with growing back-off and drops rejected ones", async () => {
    const box = new Outbox(memory());
    box.add(event("a"));
    const offline = async (): Promise<ApiResult<null>> => ({ ok: false, reason: "retry" });
    expect(await box.flush(offline, 0)).toBe("waiting");
    expect(await box.flush(async () => ok, 1000)).toBe("waiting");
    expect(await box.flush(offline, 2000)).toBe("waiting");
    expect(await box.flush(async () => ok, 5000)).toBe("waiting");
    expect(await box.flush(async () => ({ ok: false, reason: "invalid" }), 6000)).toBe("sent");
    expect(box.size).toBe(0);
  });

  it("stops when the camera was removed", async () => {
    const box = new Outbox(memory());
    box.add(event("a"));
    expect(await box.flush(async () => ({ ok: false, reason: "unauthorized" }))).toBe(
      "unauthorized",
    );
    expect(box.size).toBe(1);
  });
});
