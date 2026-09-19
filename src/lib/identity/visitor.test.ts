import { describe, expect, it } from "vitest";
import { createVisitorToken, hashVisitorToken, isValidVisitorToken } from "./visitor";

describe("visitor identity", () => {
  it("creates a valid 256-bit token", () => {
    const token = createVisitorToken();
    expect(token).toHaveLength(43);
    expect(isValidVisitorToken(token)).toBe(true);
  });

  it("hashes deterministically without retaining the raw token", () => {
    const token = createVisitorToken();
    const hash = hashVisitorToken(token);
    expect(hash).toHaveLength(64);
    expect(hash).toBe(hashVisitorToken(token));
    expect(hash).not.toContain(token);
  });

  it("rejects malformed cookie values", () => {
    expect(isValidVisitorToken(undefined)).toBe(false);
    expect(isValidVisitorToken("short")).toBe(false);
    expect(isValidVisitorToken("!".repeat(43))).toBe(false);
  });
});
