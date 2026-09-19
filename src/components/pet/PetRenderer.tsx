"use client";

import dynamic from "next/dynamic";
import { Component, memo, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { PetAction } from "@/types/pet";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { PlaceholderPet } from "./PlaceholderPet";
import { advanceStage } from "./three/contracts";
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
  reducedMotion?: boolean;
  failure?: FailureMode;
  onMetrics?: (metrics: SceneMetrics) => void;
}
export function PetRenderer({ action, mode = "2d", ...options }: PetRendererProps) {
  if (mode === "2d") return <PlaceholderPet action={action} reducedMotion={options.reducedMotion} />;
  return <ThreeRenderer action={action} {...options} />;
}
function ThreeRenderer({ action, view, reducedMotion = false, failure = "none", onMetrics }: Omit<PetRendererProps, "mode">) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const { emotion, animation, intensity } = action;
  const stableAction = useMemo(() => ({ emotion, animation, intensity }), [emotion, animation, intensity]);
  const [stage, setStage] = useState<"loading" | SceneStage>("loading");
  const [error, setError] = useState<string | null>(null);
  const fail = useCallback((reason: string) => setError(reason), []);
  const ready = useCallback((next: SceneStage) => setStage(current => advanceStage(current, next)), []);
  useEffect(() => {
    if (stage === "frame" || error) return;
    const timer = setTimeout(() => fail("load-timeout"), 12000);
    return () => clearTimeout(timer);
  }, [stage, error, fail]);
  const qaFailure = process.env.NODE_ENV === "development" ? failure : "none";
  return <div className={styles.scene} data-stage={error ? "fallback" : stage} data-failure={error ?? "none"} data-reduced-motion={reducedMotion || prefersReducedMotion}>
    {!error && <div className={styles.canvas} role="img" aria-label={`Miso de cuerpo completo en su rincón, ${action.emotion}`}>
      <SceneBoundary onError={fail}>
        {qaFailure === "import" ? <FailedImport /> : <PetScene action={stableAction} view={view} reducedMotion={reducedMotion || prefersReducedMotion} failure={qaFailure} onStage={ready} onFailure={fail} onMetrics={onMetrics} />}
      </SceneBoundary>
    </div>}
    {(error || stage !== "frame") && <div className={styles.fallback}><PlaceholderPet action={action} reducedMotion={reducedMotion || prefersReducedMotion} /></div>}
    <span className={styles.status} role="status">{error ? "Miso sigue aquí en 2D." : stage !== "frame" ? "Preparando el rincón de Miso…" : ""}</span>
  </div>;
}
