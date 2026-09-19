import { describe, expect, it } from "vitest";
import type { ExperienceEvent, ExperienceState } from "@/types/experience";
import { createInitialExperienceState, experienceReducer } from "./experience-machine";

describe("experienceReducer", () => {
  it("starts sealed for a new visitor", () => {
    expect(createInitialExperienceState()).toMatchObject({ phase: "SEALED" });
  });

  it("follows the complete first-visit path", () => {
    const events: ExperienceEvent[] = [
      { type: "OPEN_ENVELOPE" },
      { type: "ENVELOPE_OPENED" },
      { type: "OPEN_SURPRISE" },
      { type: "PET_VISIBLE" },
      { type: "PET_AWAKE" },
      { type: "NAME_REQUESTED" },
      { type: "NAME_SUBMITTED", displayName: "Bety" },
      { type: "NAME_PERSISTED", displayName: "Bety" },
      { type: "NAME_REMEMBERED" },
    ];

    const phases: string[] = [];
    let state: ExperienceState = createInitialExperienceState();
    for (const event of events) {
      state = experienceReducer(state, event);
      phases.push(state.phase);
    }

    expect(phases).toEqual([
      "OPENING",
      "LETTER",
      "REVEAL",
      "PET_AWAKENING",
      "ASKING_NAME",
      "ASKING_NAME",
      "ASKING_NAME",
      "REMEMBERING_NAME",
      "COMPANION",
    ]);
    expect(state).toMatchObject({ displayName: "Bety", returning: false });
  });

  it("starts in companion mode for a returning visitor", () => {
    expect(createInitialExperienceState("María José")).toMatchObject({
      phase: "COMPANION",
      displayName: "María José",
      returning: true,
      petAction: { emotion: "happy", animation: "awakening" },
    });
  });

  it("does not confirm the name before persistence succeeds", () => {
    let state: ExperienceState = {
      phase: "ASKING_NAME",
      dialogueStage: "question",
      nameSubmission: "idle",
      petAction: { emotion: "curious", animation: "listening", intensity: 0.45 },
    };

    state = experienceReducer(state, { type: "NAME_SUBMITTED", displayName: "Bety" });

    expect(state).toMatchObject({
      phase: "ASKING_NAME",
      nameSubmission: "pending",
      draftName: "Bety",
      petAction: { emotion: "thinking" },
    });

    state = experienceReducer(state, { type: "NAME_REMEMBERED" });

    expect(state.phase).toBe("ASKING_NAME");
  });

  it("returns to a recoverable question without losing the draft", () => {
    let state: ExperienceState = {
      phase: "ASKING_NAME",
      dialogueStage: "question",
      nameSubmission: "pending",
      draftName: "Bety",
      petAction: { emotion: "thinking", animation: "listening", intensity: 0.4 },
    };

    state = experienceReducer(state, { type: "NAME_FAILED", message: "Inténtalo otra vez." });

    expect(state).toMatchObject({
      phase: "ASKING_NAME",
      dialogueStage: "question",
      nameSubmission: "error",
      draftName: "Bety",
      error: "Inténtalo otra vez.",
    });
  });

  it("can retry successfully after a recoverable error", () => {
    let state: ExperienceState = {
      phase: "ASKING_NAME",
      dialogueStage: "question",
      nameSubmission: "error",
      draftName: "Bety",
      error: "Inténtalo otra vez.",
      petAction: { emotion: "curious", animation: "listening", intensity: 0.45 },
    };

    state = experienceReducer(state, { type: "NAME_SUBMITTED", displayName: "Bety" });
    state = experienceReducer(state, { type: "NAME_PERSISTED", displayName: "Bety" });

    expect(state).toMatchObject({
      phase: "REMEMBERING_NAME",
      displayName: "Bety",
      petAction: { emotion: "happy", animation: "smallBounce" },
    });
  });

  it("ignores repeated submits while persistence is pending", () => {
    const pending: ExperienceState = {
      phase: "ASKING_NAME",
      dialogueStage: "question",
      nameSubmission: "pending",
      draftName: "Bety",
      petAction: { emotion: "thinking", animation: "listening", intensity: 0.4 },
    };

    expect(
      experienceReducer(pending, { type: "NAME_SUBMITTED", displayName: "Otra" }),
    ).toBe(pending);
  });
});
