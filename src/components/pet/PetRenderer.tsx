"use client";

import dynamic from "next/dynamic";
import { Component, memo, useCallback, useEffect, useMemo, useReducer, useRef, type ReactNode } from "react";
import type { PetAction } from "@/types/pet";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { PlaceholderPet } from "./PlaceholderPet";
import { rendererLifecycle } from "./renderer-lifecycle";
import type { FailureMode, SceneMetrics, SceneStage, ViewAngle } from "./three/contracts";
import styles from "./PetRenderer.module.css";

const PetScene = memo(dynamic(() => import("./three/PetScene3D"), { ssr: false }));
const FailedImport = dynamic(async () => { throw new Error("QA import failure"); }, { ssr: false });

class SceneBoundary extends Component<{ children: ReactNode; onError: (reason: string) => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError("renderer-or-import"); }
  render() { return this.state.failed ? null : this.props.children; }
}
interface PetRendererProps {
  action: PetAction;
  mode?: "2d" | "3d";
  view?: ViewAngle;
  presentation?: "artistic" | "baseline";
  reducedMotion?: boolean;
  failure?: FailureMode;
  onMetrics?: (metrics: SceneMetrics) => void;
  onReady?: (renderer: "2d" | "3d") => void;
  onActionComplete?: () => void;
  holdAwakening?: boolean;
  loadTimeoutMs?: number;
}
export function PetRenderer({ action, mode = "2d", ...options }: PetRendererProps) {
  if (mode === "2d") return <Ready2D action={action} {...options} />;
  return <ThreeRenderer action={action} {...options} />;
}
function Ready2D({ action, reducedMotion, holdAwakening, onReady, onActionComplete }: Omit<PetRendererProps, "mode">) {
  useEffect(() => { onReady?.("2d"); }, [onReady]);
  return <PlaceholderPet action={action} reducedMotion={reducedMotion} holdAwakening={holdAwakening} onActionComplete={onActionComplete} />;
}
function ThreeRenderer({ action, view, presentation, reducedMotion = false, failure = "none", onMetrics, onReady, onActionComplete, holdAwakening, loadTimeoutMs = 6000 }: Omit<PetRendererProps, "mode">) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const { emotion, animation, intensity } = action;
  const stableAction = useMemo(() => ({ emotion, animation, intensity }), [emotion, animation, intensity]);
  const [{ stage, failure: error }, dispatch] = useReducer(rendererLifecycle, { stage: "loading" });
  const host = useRef<HTMLDivElement>(null);
  const metrics = useCallback((value: SceneMetrics) => {
    for (const key of ["triangles", "calls", "totalTriangles", "totalCalls", "geometries", "textures", "dpr", "frames"] as const) host.current?.setAttribute(`data-${key.toLowerCase()}`, String(value[key]));
    onMetrics?.(value);
  }, [onMetrics]);
  const reported = useRef<"2d" | "3d" | null>(null);
  const fail = useCallback((reason: string) => dispatch({ type: "failure", reason }), []);
  const ready = useCallback((next: SceneStage) => dispatch({ type: "stage", stage: next }), []);
  useEffect(() => {
    // One deadline from mount, not a new allowance for each loading stage.
    const timer = setTimeout(() => dispatch({ type: "timeout" }), loadTimeoutMs);
    return () => clearTimeout(timer);
  }, [loadTimeoutMs]);
  useEffect(() => {
    const result = error ? "2d" : stage === "frame" ? "3d" : null;
    if (result && reported.current !== result) { reported.current = result; onReady?.(result); }
  }, [stage, error, onReady]);
  const qaFailure = process.env.NODE_ENV === "development" ? failure : "none";
  return <div ref={host} className={styles.scene} data-stage={error ? "fallback" : stage} data-failure={error ?? "none"} data-reduced-motion={reducedMotion || prefersReducedMotion}>
    {!error && <div className={styles.canvas} role="img" aria-label={`Miso de cuerpo completo en su rincón, ${action.emotion}`}>
      <SceneBoundary onError={fail}>
        {qaFailure === "import" ? <FailedImport /> : <PetScene action={stableAction} view={view} presentation={presentation} reducedMotion={reducedMotion || prefersReducedMotion} failure={qaFailure} onStage={ready} onFailure={fail} onMetrics={metrics} holdAwakening={holdAwakening} onActionComplete={onActionComplete} />}
      </SceneBoundary>
    </div>}
    {(error || stage !== "frame") && <div className={styles.fallback}><PlaceholderPet action={action} reducedMotion={reducedMotion || prefersReducedMotion} holdAwakening={holdAwakening} onActionComplete={onActionComplete} /></div>}
    <span className={styles.status} role="status">{error ? "Miso sigue aquí en 2D." : stage !== "frame" ? "Preparando el rincón de Miso…" : ""}</span>
  </div>;
}
