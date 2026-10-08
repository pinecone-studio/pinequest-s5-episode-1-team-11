import { describe, expect, it } from "vitest";
import { clientFingerprint, createDeviceToken, hashToken, readBearer } from "./tokens";

describe("device tokens", () => {
  it("creates unique URL-safe tokens and hashes them as sha256 hex", () => {
    const token = createDeviceToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(createDeviceToken()).not.toBe(token);
    expect(hashToken(token)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashToken(token)).toBe(hashToken(token));
  });

  it("reads only well-formed bearer tokens", () => {
    const token = createDeviceToken();
    const request = (value?: string) =>
      new Request("https://halo.test", value ? { headers: { authorization: value } } : {});
    expect(readBearer(request(`Bearer ${token}`))).toBe(token);
    expect(readBearer(request(`Basic ${token}`))).toBeNull();
    expect(readBearer(request("Bearer short"))).toBeNull();
    expect(readBearer(request())).toBeNull();
  });

  it("fingerprints the first forwarded address without exposing it", () => {
    const from = (forwarded: string) =>
      clientFingerprint(
        new Request("https://halo.test", { headers: { "x-forwarded-for": forwarded } }),
      );
    expect(from("203.0.113.5, 10.0.0.1")).toBe(from("203.0.113.5"));
    expect(from("203.0.113.5")).not.toBe(from("203.0.113.6"));
    expect(from("203.0.113.5")).not.toContain("203");
  });
});
