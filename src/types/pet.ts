export type PetEmotion =
  | "neutral"
  | "curious"
  | "happy"
  | "surprised"
  | "sleepy"
  | "thinking";

export type PetAnimation =
  | "idle"
  | "blink"
  | "headTilt"
  | "smallBounce"
  | "awakening"
  | "listening";

export interface PetAction {
  emotion: PetEmotion;
  animation: PetAnimation;
  intensity: number;
}
