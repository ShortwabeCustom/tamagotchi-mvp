import { petActionFor } from "@/lib/pet-engine/actions";
import type { ExperienceEvent, ExperienceState } from "@/types/experience";

export function createInitialExperienceState(
  returningDisplayName?: string,
): ExperienceState {
  if (returningDisplayName) {
    return {
      phase: "COMPANION",
      displayName: returningDisplayName,
      returning: true,
      petAction: {
        emotion: "happy",
        animation: "awakening",
        intensity: 0.55,
      },
    };
  }

  return {
    phase: "SEALED",
    petAction: petActionFor("SEALED"),
  };
}

export function experienceReducer(
  state: ExperienceState,
  event: ExperienceEvent,
): ExperienceState {
  if (event.type === "RETURNING_VISITOR") {
    return {
      phase: "COMPANION",
      displayName: event.displayName,
      returning: true,
      petAction: petActionFor("COMPANION"),
    };
  }

  switch (state.phase) {
    case "SEALED":
      return event.type === "OPEN_ENVELOPE"
        ? { phase: "OPENING", petAction: petActionFor("OPENING") }
        : state;

    case "OPENING":
      return event.type === "ENVELOPE_OPENED"
        ? { phase: "LETTER", petAction: petActionFor("LETTER") }
        : state;

    case "LETTER":
      return event.type === "OPEN_SURPRISE"
        ? { phase: "REVEAL", petAction: petActionFor("REVEAL") }
        : state;

    case "REVEAL":
      return event.type === "PET_VISIBLE"
        ? {
            phase: "PET_AWAKENING",
            petAction: petActionFor("PET_AWAKENING"),
          }
        : state;

    case "PET_AWAKENING":
      return event.type === "PET_AWAKE"
        ? {
            phase: "ASKING_NAME",
            dialogueStage: "greeting",
            petAction: petActionFor("ASKING_NAME"),
          }
        : state;

    case "ASKING_NAME":
      if (event.type === "NAME_REQUESTED") {
        return { ...state, dialogueStage: "question", error: undefined };
      }

      if (event.type === "NAME_SUBMITTED") {
        return {
          phase: "REMEMBERING_NAME",
          displayName: event.displayName,
          petAction: petActionFor("REMEMBERING_NAME"),
        };
      }

      return state;

    case "REMEMBERING_NAME":
      if (event.type === "NAME_REMEMBERED") {
        return {
          phase: "COMPANION",
          displayName: state.displayName,
          returning: false,
          petAction: petActionFor("COMPANION"),
        };
      }

      if (event.type === "NAME_FAILED") {
        return {
          phase: "ASKING_NAME",
          dialogueStage: "question",
          error: event.message,
          petAction: petActionFor("ASKING_NAME"),
        };
      }

      return state;

    case "COMPANION":
      return state;
  }
}
