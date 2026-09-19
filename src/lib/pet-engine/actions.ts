import type { ExperiencePhase } from "@/types/experience";
import type { PetAction } from "@/types/pet";

const PET_ACTIONS: Record<ExperiencePhase, PetAction> = {
  SEALED: { emotion: "neutral", animation: "idle", intensity: 0.15 },
  OPENING: { emotion: "neutral", animation: "idle", intensity: 0.15 },
  LETTER: { emotion: "neutral", animation: "idle", intensity: 0.15 },
  REVEAL: { emotion: "neutral", animation: "awakening", intensity: 0.45 },
  PET_AWAKENING: {
    emotion: "curious",
    animation: "awakening",
    intensity: 0.55,
  },
  ASKING_NAME: {
    emotion: "curious",
    animation: "listening",
    intensity: 0.45,
  },
  REMEMBERING_NAME: {
    emotion: "happy",
    animation: "smallBounce",
    intensity: 0.6,
  },
  COMPANION: { emotion: "happy", animation: "idle", intensity: 0.3 },
};

export function petActionFor(phase: ExperiencePhase): PetAction {
  return PET_ACTIONS[phase];
}
