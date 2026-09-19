import { describe, expect, it } from "vitest";
import { petActionFor } from "./actions";

describe("petActionFor", () => {
  it("maps name persistence to Miso's happy reaction", () => {
    expect(petActionFor("REMEMBERING_NAME")).toEqual({
      emotion: "happy",
      animation: "smallBounce",
      intensity: 0.6,
    });
  });

  it("maps the name question to listening", () => {
    expect(petActionFor("ASKING_NAME")).toMatchObject({
      emotion: "curious",
      animation: "listening",
    });
  });
});
