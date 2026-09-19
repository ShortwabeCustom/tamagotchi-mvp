import type { PetAction } from "@/types/pet";
export type SceneStage = "module" | "assets" | "frame";
export type ViewAngle = "front" | "three-quarter" | "side";
export type FailureMode = "none" | "import" | "assets" | "renderer" | "context" | "timeout";
export interface SceneMetrics {
  calls: number; triangles: number; totalCalls: number; totalTriangles: number; geometries: number; textures: number;
  dpr: number; renderer: string; frames: number;
}
export interface SceneProps {
  action: PetAction;
  reducedMotion: boolean;
  view?: ViewAngle;
  failure?: FailureMode;
  onStage: (stage: SceneStage) => void;
  onFailure: (reason: string) => void;
  onMetrics?: (metrics: SceneMetrics) => void;
}

export function advanceStage(current: "loading" | SceneStage, next: SceneStage) {
  const order = { loading: 0, module: 1, assets: 2, frame: 3 };
  return order[next] > order[current] ? next : current;
}
