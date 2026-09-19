import { advanceStage, type SceneStage } from "./three/contracts";
export interface RendererState { stage: "loading" | SceneStage; failure?: string }
export type RendererEvent = { type: "stage"; stage: SceneStage } | { type: "failure"; reason: string } | { type: "timeout" };
export function rendererLifecycle(state: RendererState, event: RendererEvent): RendererState {
  if (state.failure) return state;
  if (event.type === "timeout") return state.stage === "frame" ? state : { ...state, failure: "load-timeout" };
  if (event.type === "failure") return { ...state, failure: event.reason };
  return { ...state, stage: advanceStage(state.stage, event.stage) };
}
