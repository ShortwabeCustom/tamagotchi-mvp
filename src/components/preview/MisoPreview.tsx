"use client";
import { useState } from "react";
import { PetRenderer } from "@/components/pet/PetRenderer";
import type { FailureMode, SceneMetrics, ViewAngle } from "@/components/pet/three/contracts";
import type { PetAction } from "@/types/pet";
import { PreviewRecorder } from "./PreviewRecorder";
import styles from "./MisoPreview.module.css";
const fixtures: Record<string, PetAction> = {
  "En calma": { emotion: "neutral", animation: "idle", intensity: 0.3 },
  "Despertar": { emotion: "neutral", animation: "awakening", intensity: 0.55 },
  "Curiosidad": { emotion: "curious", animation: "headTilt", intensity: 0.7 },
  "Escuchando": { emotion: "curious", animation: "listening", intensity: 0.45 },
  "Pensando": { emotion: "thinking", animation: "listening", intensity: 0.4 },
  "Alegría": { emotion: "happy", animation: "smallBounce", intensity: 0.6 },
  "Recuperación": { emotion: "curious", animation: "listening", intensity: 0.45 },
};
export function MisoPreview() {
  const [mode, setMode] = useState<"2d" | "3d">("3d");
  const [fixture, setFixture] = useState("En calma");
  const [view, setView] = useState<ViewAngle>("three-quarter");
  const [presentation, setPresentation] = useState<"artistic" | "baseline">("artistic");
  const [reduced, setReduced] = useState(false);
  const [failure, setFailure] = useState<FailureMode>("none");
  const [attempt, setAttempt] = useState(0);
  const [draft, setDraft] = useState("");
  const [metrics, setMetrics] = useState<SceneMetrics | null>(null);
  const action = fixtures[fixture];
  return <main className={styles.page}>
    <header className={styles.header}><a href="/preview/miso" aria-label="Inicio de la previsualización">bety<span> / </span>miso</a><span className={styles.badge}>ESTUDIO LOCAL · 2A</span></header>
    <section className={styles.experience} aria-labelledby="miso-title">
      <div className={styles.heading}><p>UN PEQUEÑO LUGAR PARA ESTAR</p><h1 id="miso-title">Aquí está Miso.</h1><span>Un poco de calma. Un poquito de compañía.</span></div>
      <div className={styles.stage}><PetRenderer key={attempt} action={{ ...action }} mode={mode} view={view} presentation={presentation} reducedMotion={reduced} failure={failure} onMetrics={setMetrics} /></div>
      <div className={styles.conversation}><p aria-live="polite">{fixture === "Pensando" ? "Miso está atenta…" : fixture === "Alegría" ? "Qué gusto tenerte cerca." : fixture === "Recuperación" ? "Aquí sigo. Podemos intentarlo de nuevo." : "Hola. Podemos quedarnos aquí un ratito."}</p>
        <label htmlFor="local-name">Tu nombre de prueba</label><div className={styles.inputRow}><input id="local-name" value={draft} onChange={event => setDraft(event.target.value)} placeholder="¿Cómo te llamas?" autoComplete="off" maxLength={40} /><button onClick={() => setFixture("Escuchando")}>Escuchar</button></div>
        <small>Solo en esta página. No se guarda ni se envía.</small>
      </div>
    </section>
    <aside className={styles.qa} aria-label="Controles locales de prueba">
      <div className={styles.qaTitle}><h2>Mesa de pruebas</h2><p>3D procedural · fidelidad artística pendiente</p></div>
      <div className={styles.controls}>
        <label>Estado<select value={fixture} onChange={event => setFixture(event.target.value)}>{Object.keys(fixtures).map(name => <option key={name}>{name}</option>)}</select></label>
        <label>Vista QA<select value={view} onChange={event => setView(event.target.value as ViewAngle)}><option value="front">Frente</option><option value="three-quarter">Tres cuartos</option><option value="side">Lateral</option></select></label>
        <label>Presentación<select value={presentation} onChange={event => setPresentation(event.target.value as "artistic" | "baseline")}><option value="artistic">Revisión artística</option><option value="baseline">Cámara y luz anteriores</option></select></label>
        <label>Render<select value={mode} onChange={event => setMode(event.target.value as "2d" | "3d")}><option value="3d">3D</option><option value="2d">2D</option></select></label>
        <label>Fallo de prueba<select value={failure} onChange={event => { setFailure(event.target.value as FailureMode); if (event.target.value !== "context") setAttempt(value => value + 1); }}><option value="none">Ninguno</option><option value="import">Importación</option><option value="assets">Geometría / assets</option><option value="renderer">Renderer</option><option value="context">Pérdida WebGL real</option><option value="timeout">Sin primer frame</option></select></label>
        <label className={styles.check}><input type="checkbox" checked={reduced} onChange={event => setReduced(event.target.checked)} />Movimiento reducido</label>
        <button onClick={() => { setFailure("none"); setAttempt(value => value + 1); }}>Reiniciar escena</button>
      </div>
      <output className={styles.metrics} aria-label="Métricas de la escena">{metrics ? `${metrics.triangles.toLocaleString("en-US")} triángulos · ${metrics.calls} draw calls (principal) · ${metrics.totalTriangles.toLocaleString("en-US")} / ${metrics.totalCalls} con sombras · DPR ${metrics.dpr} · ${metrics.geometries} geometrías · ${metrics.textures} texturas · ${metrics.frames} frames\n${metrics.renderer}` : "Esperando el primer frame 3D…"}</output>
      <PreviewRecorder onFixture={setFixture} onReducedMotion={setReduced} disabled={mode !== "3d" || failure !== "none"} />
      <p className={styles.note}>Fixtures de PetAction independientes. Alegría aquí es una pose de prueba; el producto solo confirma el nombre tras NAME_PERSISTED. Cuenco y sobre ambientales.</p>
    </aside>
  </main>;
}
