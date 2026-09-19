import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { issueVisitorCookie, verifySignedVisitor } from "./signed-visitor";
import { secureVisitorCookie } from "./http";
afterEach(() => vi.unstubAllEnvs());
describe("signed preparation identity", () => {
  it("accepts only a signed, unexpired value from this environment", () => {
    vi.stubEnv("BETY_IDENTITY_SECRET", "ab".repeat(32));
    const cookie = issueVisitorCookie(1800000000);
    expect(Boolean(verifySignedVisitor(cookie, 1800000001))).toBe(true);
    expect(verifySignedVisitor(cookie, 1900000000)).toBeUndefined();
    expect(verifySignedVisitor(cookie, 1700000000)).toBeUndefined();
    const parts = cookie.split("."); parts[1] = "A".repeat(43);
    expect(verifySignedVisitor(parts.join("."), 1800000001)).toBeUndefined();
    vi.stubEnv("BETY_IDENTITY_SECRET", "cd".repeat(32));
    expect(verifySignedVisitor(cookie, 1800000001)).toBeUndefined();
  });
  it("fails closed without a signing key", () => {
    vi.stubEnv("BETY_IDENTITY_SECRET", "");
    expect(() => issueVisitorCookie()).toThrow("configuration unavailable");
  });
  it("requires Secure except explicit local HTTP", () => {
    const request = (url: string) => new NextRequest(url, { headers: { host: new URL(url).host } });
    vi.stubEnv("BETY_LOCAL_HTTP", "");
    expect(secureVisitorCookie(request("http://127.0.0.1:3000"))).toBe(true);
    vi.stubEnv("BETY_LOCAL_HTTP", "1");
    expect(secureVisitorCookie(request("http://127.0.0.1:3000"))).toBe(false);
    expect(secureVisitorCookie(request("https://127.0.0.1:3000"))).toBe(true);
    expect(secureVisitorCookie(request("http://example.com"))).toBe(true);
  });
});
