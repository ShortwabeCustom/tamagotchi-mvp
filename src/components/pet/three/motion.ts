import type { PetAction } from "@/types/pet";

/** Value identity deliberately survives parent rerenders and equivalent action objects. */
export function actionKey(action: PetAction): string {
  return `${action.emotion}:${action.animation}:${action.intensity}`;
}
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
export function motionPose(action: PetAction, age: number, time: number, reduced: boolean) {
  const strength = Math.max(0, Math.min(1, action.intensity));
  const waking = action.animation === "awakening";
  const happy = action.animation === "smallBounce";
  const curious = action.emotion === "curious" || action.animation === "headTilt";
  const thinking = action.emotion === "thinking";
  return {
    lift: !reduced && happy && age < 1.4 ? Math.abs(Math.sin(age * Math.PI / 0.7)) * 0.17 * strength : 0,
    breath: reduced ? 1 : 1 + Math.sin(time * 1.6) * 0.009,
    tilt: curious ? -0.09 * strength : thinking ? 0.055 : 0,
    nod: reduced ? 0 : waking ? Math.exp(-age * 2) * 0.3 : thinking ? Math.sin(time * 2.4) * 0.025 : 0,
    eye: reduced ? 1 : waking ? Math.min(1, 0.12 + age / 1.2) : 1,
    tail: reduced ? 0 : Math.sin(time * (thinking ? 2.2 : 1.1)) * 0.12 * strength,
    allowPointer: !reduced && action.animation === "idle" && action.emotion === "neutral",
  };
}
