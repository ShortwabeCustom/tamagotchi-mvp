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
            nameSubmission: "idle",
            petAction: petActionFor("ASKING_NAME"),
          }
        : state;

    case "ASKING_NAME":
      if (event.type === "NAME_REQUESTED") {
        return {
          ...state,
          dialogueStage: "question",
          nameSubmission: "idle",
          error: undefined,
        };
      }

      if (event.type === "NAME_SUBMITTED") {
        if (state.nameSubmission === "pending") return state;

        return {
          ...state,
          dialogueStage: "question",
          nameSubmission: "pending",
          draftName: event.displayName,
          error: undefined,
          petAction: {
            emotion: "thinking",
            animation: "listening",
            intensity: 0.4,
          },
        };
      }

      if (event.type === "NAME_PERSISTED" && state.nameSubmission === "pending") {
        return {
          phase: "REMEMBERING_NAME",
          displayName: event.displayName,
          petAction: petActionFor("REMEMBERING_NAME"),
        };
      }

      if (event.type === "NAME_FAILED" && state.nameSubmission === "pending") {
        return {
          ...state,
          nameSubmission: "error",
          error: event.message,
          petAction: petActionFor("ASKING_NAME"),
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

      return state;

    case "COMPANION":
      return state;
  }
}
