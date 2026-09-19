import { describe, expect, it } from "vitest";
import { advanceStage } from "./contracts";
import { ActionClock, eyeExpression, motionPose } from "./motion";
import type { PetAction } from "@/types/pet";
const happy: PetAction = { emotion: "happy", animation: "smallBounce", intensity: 0.6 };
describe("3D motion lifecycle", () => {
  it("does not regress readiness when an asset effect arrives after the first frame", () => {
    let stage = advanceStage("loading", "frame");
    stage = advanceStage(stage, "assets");
    stage = advanceStage(stage, "module");
    expect(stage).toBe("frame");
  });
  it("does not restart one-shot actions on equivalent parent rerenders", () => {
    const clock = new ActionClock();
    for (let i = 0; i < 180; i++) clock.step({ ...happy }, 1 / 60);
    expect(clock.starts).toBe(1);
    expect(motionPose(happy, clock.elapsed, 3, false).lift).toBe(0);
    clock.step({ ...happy, animation: "idle" }, 0.016);
    clock.step(happy, 0.016);
    expect(clock.starts).toBe(3);
  });
  it("keeps reduced-motion poses stable across time", () => {
    for (const action of [happy, { ...happy, animation: "awakening" as const }, { ...happy, emotion: "thinking" as const }]) {
      expect(motionPose(action, 0.1, 1, true)).toEqual(motionPose(action, 10, 30, true));
    }
  });
  it("gives explicit actions precedence over pointer tracking", () => {
    expect(motionPose(happy, 0, 0, false).allowPointer).toBe(false);
    expect(motionPose({ emotion: "neutral", animation: "idle", intensity: 0.3 }, 0, 0, false).allowPointer).toBe(true);
  });
});


describe("eyelid priorities", () => {
  it("keeps happy closed when an irregular blink starts or ends", () => {
    for (const age of [0, 0.06, 0.12, 0.24, 10]) {
      expect(eyeExpression(happy, 2, age, false)).toEqual({ closure: 1, smile: true });
    }
  });
  it("gives awakening control even when returning-visitor emotion is happy", () => {
    const wake = { ...happy, animation: "awakening" as const };
    expect(eyeExpression(wake, 0, 0.12, false).closure).toBe(1);
    expect(eyeExpression(wake, 2, 0.12, false)).toEqual({ closure: 0, smile: false });
  });
  it("fully closes and reopens a blink without changing eye geometry", () => {
    const idle = { emotion: "neutral", animation: "idle", intensity: 0.3 } as const;
    expect(eyeExpression(idle, 2, 0, false).closure).toBe(0);
    expect(eyeExpression(idle, 2, 0.12, false).closure).toBe(1);
    expect(eyeExpression(idle, 2, 0.24, false).closure).toBe(0);
    expect(eyeExpression(idle, 2, 0.12, true).closure).toBe(0);
  });
  it("keeps stable happy and awake poses under reduced motion", () => {
    expect(eyeExpression(happy, 0, 0.12, true)).toEqual(eyeExpression(happy, 40, 5, true));
    expect(eyeExpression({ ...happy, animation: "awakening" }, 0, 0.12, true).closure).toBe(0);
  });
});
