"use client";
import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PCFShadowMap, Mesh } from "three";
import { MisoProceduralModel } from "./MisoProceduralModel";
import { Stage } from "./Stage";
import type { SceneProps } from "./contracts";

function SceneContent(props: SceneProps & { active: boolean; pointer: React.RefObject<{ x: number; y: number }> }) {
  const { gl, scene, camera, invalidate } = useThree();
  const { onStage, onFailure } = props;
  const actionIdentity = `${props.action.emotion}:${props.action.animation}:${props.action.intensity}`;
  const rendered = useRef(false), frames = useRef(0);
  const propsRef = useRef(props);
  const pass = useRef({ shadowCalls: -1, shadowTriangles: 0, calls: 0, triangles: 0 });
  useEffect(() => {
    const cleanup: (() => void)[] = [];
    scene.traverse(object => {
      if (!(object instanceof Mesh)) return;
      const previous = object.onBeforeRender;
      object.onBeforeRender = function (...args) {
        if (pass.current.shadowCalls === -1) {
          pass.current.shadowCalls = gl.info.render.calls;
          pass.current.shadowTriangles = gl.info.render.triangles;
        }
        previous.apply(this, args);
      };
      cleanup.push(() => { object.onBeforeRender = previous; });
    });
    return () => cleanup.forEach(restore => restore());
  }, [gl, scene]);
  useEffect(() => { propsRef.current = props; });
  useEffect(() => {
    onStage("assets");
    const lost = (event: Event) => { event.preventDefault(); onFailure("context-lost"); };
    gl.domElement.addEventListener("webglcontextlost", lost);
    return () => gl.domElement.removeEventListener("webglcontextlost", lost);
  }, [gl, onStage, onFailure]);
  useEffect(() => {
    const side = props.view === "side", front = props.view === "front";
    camera.position.set(side ? 7.7 : front ? 0 : 4.2, 3.35, side ? 0.4 : front ? 8.4 : 7.2);
    camera.lookAt(0, 1.25, 0);
    camera.updateProjectionMatrix(); invalidate();
  }, [camera, invalidate, props.view]);
  useEffect(() => { invalidate(); }, [invalidate, actionIdentity, props.reducedMotion, props.active]);
  useEffect(() => {
    if (props.failure === "context") gl.getContext().getExtension("WEBGL_lose_context")?.loseContext();
  }, [gl, props.failure]);
  useEffect(() => {
    const timer = setInterval(() => {
      if (!rendered.current) return;
      const context = gl.getContext();
      const info = context.getExtension("WEBGL_debug_renderer_info");
      propsRef.current.onMetrics?.({
        calls: pass.current.calls, triangles: pass.current.triangles, totalCalls: gl.info.render.calls, totalTriangles: gl.info.render.triangles,
        geometries: gl.info.memory.geometries, textures: gl.info.memory.textures,
        dpr: gl.getPixelRatio(), renderer: info ? context.getParameter(info.UNMASKED_RENDERER_WEBGL) : context.getParameter(context.RENDERER), frames: frames.current,
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [gl]);
  useFrame(state => {
    if (!props.active) return;
    // Explicit render lets readiness mean a completed frame, and metrics describe the main pass only.
    gl.info.reset();
    pass.current.shadowCalls = -1;
    try { gl.render(state.scene, state.camera); }
    catch { queueMicrotask(() => propsRef.current.onFailure("render-frame")); return; }
    pass.current.calls = gl.info.render.calls - Math.max(0, pass.current.shadowCalls);
    pass.current.triangles = gl.info.render.triangles - pass.current.shadowTriangles;
    frames.current++;
    if (!rendered.current && props.failure !== "timeout") {
      rendered.current = true;
      queueMicrotask(() => propsRef.current.onStage("frame"));
    }
    if (!props.reducedMotion) invalidate();
  }, 1);
  if (props.failure === "assets" || props.failure === "renderer") throw new Error(`QA ${props.failure} failure`);
  return <>
    <color attach="background" args={["#0b0b0b"]} />
    <ambientLight intensity={0.75} />
    <hemisphereLight args={["#eee7d5", "#4a4037", 1.4]} />
    <directionalLight position={[-3, 6, 5]} intensity={3.3} color="#ffdab0" castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-4} shadow-camera-right={4} shadow-camera-top={5} shadow-camera-bottom={-3} shadow-normalBias={0.025} shadow-bias={-0.0002} />
    <directionalLight position={[4, 3, -3]} intensity={2.1} color="#dbd6b2" />
    <Stage />
    <MisoProceduralModel action={props.action} reducedMotion={props.reducedMotion} pointer={props.pointer} />
  </>;
}
export default function PetScene3D(props: SceneProps) {
  const { onStage } = props;
  const host = useRef<HTMLDivElement>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const [active, setActive] = useState(true);
  useEffect(() => {
    onStage("module");
    const element = host.current;
    if (!element) return;
    let visible = true;
    const update = () => setActive(visible && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; update(); }, { threshold: 0.01 });
    observer.observe(element);
    document.addEventListener("visibilitychange", update);
    update();
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", update); };
  }, [onStage]);
  return <div ref={host} style={{ width: "100%", height: "100%" }} data-active={active} onPointerMove={event => {
    if (event.pointerType !== "mouse" || props.reducedMotion) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    pointer.current = { x: (event.clientX - bounds.left) / bounds.width * 2 - 1, y: (event.clientY - bounds.top) / bounds.height * 2 - 1 };
  }} onPointerLeave={() => { pointer.current = { x: 0, y: 0 }; }}>
    <Canvas shadows={{ type: PCFShadowMap }} dpr={[1, 1.5]} frameloop={active ? "demand" : "never"} camera={{ position: [4.2, 3.35, 7.2], fov: 39, near: 0.1, far: 100 }} gl={{ antialias: true, alpha: false, powerPreference: "low-power" }} fallback={<p>WebGL no disponible.</p>}>
      <SceneContent {...props} active={active} pointer={pointer} />
    </Canvas>
  </div>;
}
