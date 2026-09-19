import type { PetAction } from "@/types/pet";
export function actionKey(action: PetAction): string { return `${action.emotion}:${action.animation}:${action.intensity}`; }
export class ActionClock {
  private key = "";
  elapsed = 0;
  starts = 0;
  step(action: PetAction, delta: number) {
    const key = actionKey(action);
    if (key !== this.key) { this.key = key; this.elapsed = 0; this.starts++; }
    else this.elapsed += Math.min(delta, 0.05);
    return this.elapsed;
  }
}

/** Closure is lid rotation, never eyeball scale. Explicit expressions own the eyelids. */
export function eyeExpression(action: PetAction, age: number, blinkAge: number, reduced: boolean) {
  if (action.animation === "awakening") return { closure: reduced ? 0 : Math.max(0, 1 - age / 1.4), smile: false };
  if (action.emotion === "happy") return { closure: 1, smile: true };
  if (reduced) return { closure: 0, smile: false };
  const ageToUse = action.animation === "blink" ? age : blinkAge;
  const closure = ageToUse < 0.24 ? Math.sin(Math.PI * Math.min(1, ageToUse / 0.24)) : 0;
  return { closure: closure > 0.92 ? 1 : closure, smile: false };
}
export function motionPose(action: PetAction, age: number, time: number, reduced: boolean) {
  const strength = Math.max(0, Math.min(1, action.intensity));
  const waking = action.animation === "awakening", happy = action.animation === "smallBounce";
  const curious = action.emotion === "curious" || action.animation === "headTilt";
  const thinking = action.emotion === "thinking";
  return {
    lift: !reduced && happy && age < 1.4 ? Math.abs(Math.sin(age * Math.PI / 0.7)) * 0.13 * strength : 0,
    breath: reduced ? 1 : 1 + Math.sin(time * 1.6) * 0.006,
    tilt: curious ? -0.29 * strength : thinking ? 0.065 : 0,
    nod: reduced ? 0 : waking ? Math.exp(-age * 2) * 0.18 : thinking ? Math.sin(time * 2.4) * 0.018 : 0,
    tail: reduced ? 0 : Math.sin(time * (thinking ? 2.2 : 1.1)) * 0.08 * strength,
    allowPointer: !reduced && action.animation === "idle" && action.emotion === "neutral",
  };
}
