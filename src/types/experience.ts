import type { PetAction } from "@/types/pet";

export type ExperiencePhase =
  | "SEALED"
  | "OPENING"
  | "LETTER"
  | "REVEAL"
  | "PET_AWAKENING"
  | "ASKING_NAME"
  | "REMEMBERING_NAME"
  | "COMPANION";

interface BaseExperienceState {
  phase: ExperiencePhase;
  petAction: PetAction;
}

export interface SealedState extends BaseExperienceState {
  phase: "SEALED";
}

export interface OpeningState extends BaseExperienceState {
  phase: "OPENING";
}

export interface LetterState extends BaseExperienceState {
  phase: "LETTER";
}

export interface RevealState extends BaseExperienceState {
  phase: "REVEAL";
}

export interface PetAwakeningState extends BaseExperienceState {
  phase: "PET_AWAKENING";
}

export interface AskingNameState extends BaseExperienceState {
  phase: "ASKING_NAME";
  dialogueStage: "greeting" | "question";
  nameSubmission: "idle" | "pending" | "error";
  draftName?: string;
  error?: string;
}

export interface RememberingNameState extends BaseExperienceState {
  phase: "REMEMBERING_NAME";
  displayName: string;
}

export interface CompanionState extends BaseExperienceState {
  phase: "COMPANION";
  displayName: string;
  returning: boolean;
}

export type ExperienceState =
  | SealedState
  | OpeningState
  | LetterState
  | RevealState
  | PetAwakeningState
  | AskingNameState
  | RememberingNameState
  | CompanionState;

export type ExperienceEvent =
  | { type: "OPEN_ENVELOPE" }
  | { type: "ENVELOPE_OPENED" }
  | { type: "OPEN_SURPRISE" }
  | { type: "PET_VISIBLE" }
  | { type: "PET_AWAKE" }
  | { type: "NAME_REQUESTED" }
  | { type: "NAME_SUBMITTED"; displayName: string }
  | { type: "NAME_PERSISTED"; displayName: string }
  | { type: "NAME_REMEMBERED" }
  | { type: "NAME_FAILED"; message: string }
  | { type: "RETURNING_VISITOR"; displayName: string };
