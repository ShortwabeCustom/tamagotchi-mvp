import { describe, expect, it } from "vitest";
import { validateDisplayName } from "./display-name";

describe("validateDisplayName", () => {
  it("trims and preserves accents in compound names", () => {
    expect(validateDisplayName("  María   José  ")).toEqual({
      valid: true,
      value: "María José",
    });
  });

  it("rejects empty names", () => {
    expect(validateDisplayName("   ")).toMatchObject({ valid: false });
  });

  it("rejects names over 60 unicode characters", () => {
    expect(validateDisplayName("á".repeat(61))).toMatchObject({ valid: false });
  });

  it("accepts exactly 60 unicode characters", () => {
    expect(validateDisplayName("á".repeat(60))).toMatchObject({ valid: true });
  });
});
