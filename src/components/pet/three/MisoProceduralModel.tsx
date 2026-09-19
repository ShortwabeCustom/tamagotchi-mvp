"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CatmullRomCurve3, Group, Mesh, MeshStandardMaterial, SphereGeometry, TubeGeometry, Vector3 } from "three";
import type { PetAction } from "@/types/pet";
import { earGeometry, scarfGeometry, toyGeometry } from "./geometry";
import { ActionClock, motionPose } from "./motion";

export function MisoProceduralModel({ action, reducedMotion, pointer }: { action: PetAction; reducedMotion: boolean; pointer: React.RefObject<{ x: number; y: number }> }) {
  const root = useRef<Group>(null), head = useRef<Group>(null), body = useRef<Group>(null), tail = useRef<Group>(null);
  const ears = useRef<Group>(null), eyes = useRef<Group>(null), pupils = useRef<Group>(null), scarf = useRef<Group>(null);
  const eyelid = useRef<Mesh>(null);
  const clock = useRef(new ActionClock());
  const animation = useRef({ time: 0, blinkAt: 3.2, blinkAge: 1 });
  const resources = useMemo(() => {
    const fur = new MeshStandardMaterial({ vertexColors: true, roughness: 0.92 });
    const dark = new MeshStandardMaterial({ color: "#302b28", roughness: 0.88 });
    const orange = new MeshStandardMaterial({ color: "#be7a47", roughness: 0.85 });
    const cream = new MeshStandardMaterial({ color: "#eadabe", roughness: 0.95 });
    const pink = new MeshStandardMaterial({ color: "#b48570", roughness: 0.95 });
    const iris = new MeshStandardMaterial({ color: "#adba68", roughness: 0.42 });
    const black = new MeshStandardMaterial({ color: "#151811", roughness: 0.3 });
    const shine = new MeshStandardMaterial({ color: "#ffeed8", roughness: 0.2 });
    const head = toyGeometry(0.57, "head"), body = toyGeometry(0.8, "body"), paw = toyGeometry(0.68);
    const sphere = new SphereGeometry(1, 24, 16), ear = earGeometry(), scarf = scarfGeometry();
    const curve = new CatmullRomCurve3([new Vector3(0, 0, 0), new Vector3(0.65, 0.1, -0.12), new Vector3(1.03, 0.55, -0.08), new Vector3(1.02, 1, 0), new Vector3(0.79, 1.12, 0.09)]);
    const tube = new TubeGeometry(curve, 32, 0.14, 10, false);
    return { fur, dark, orange, cream, pink, iris, black, shine, head, body, paw, sphere, ear, scarf, tube };
  }, []);
  useEffect(() => () => Object.values(resources).forEach(value => value.dispose()), [resources]);
  useFrame((_, delta) => {
    const state = animation.current;
    state.time += Math.min(delta, 0.05);
    const age = clock.current.step(action, delta);
    const pose = motionPose(action, age, state.time, reducedMotion);
    if (state.time > state.blinkAt) { state.blinkAge = 0; state.blinkAt = state.time + 2.8 + Math.random() * 4; }
    state.blinkAge += Math.min(delta, 0.05);
    const blink = reducedMotion ? 1 : state.blinkAge < 0.16 ? 0.09 + Math.abs(state.blinkAge - 0.08) / 0.08 * 0.91 : 1;
    if (root.current) root.current.position.y = pose.lift;
    if (body.current) body.current.scale.y = pose.breath;
    if (head.current) { head.current.rotation.z = pose.tilt; head.current.rotation.x = pose.nod + (pose.allowPointer ? -pointer.current.y * 0.025 : 0); head.current.rotation.y = pose.allowPointer ? pointer.current.x * 0.065 : 0; }
    if (eyes.current) eyes.current.scale.y = Math.max(0.08, pose.eye * blink);
    if (eyelid.current) eyelid.current.visible = pose.eye * blink < 0.35;
    if (pupils.current) pupils.current.position.x = pose.allowPointer ? pointer.current.x * 0.025 : 0;
    if (tail.current) tail.current.rotation.y = pose.tail;
    if (ears.current) ears.current.rotation.z = pose.tilt * -0.2;
    if (scarf.current) scarf.current.rotation.x = pose.lift * 0.2;
  });
  const r = resources;
  return <group ref={root} dispose={null}>
    <group ref={body} position={[0, 0.87, 0]}>
      <mesh geometry={r.body} material={r.fur} scale={[0.59, 0.72, 0.49]} castShadow />
    </group>
    {[-1, 1].flatMap(side => [-0.24, 0.36].map((depth, index) => <mesh key={`${side}:${index}`} geometry={r.paw} material={side === -1 && index === 1 ? r.orange : r.dark} position={[side * 0.37, 0.3, depth]} scale={[0.23, 0.29, 0.29]} castShadow />))}
    <group ref={tail} position={[0.39, 0.47, -0.28]}><mesh geometry={r.tube} material={r.orange} castShadow /><mesh geometry={r.sphere} material={r.orange} position={[0.79, 1.12, 0.09]} scale={0.14} castShadow /></group>
    <group ref={scarf} position={[0, 1.37, 0.48]}>
      <mesh geometry={r.scarf} material={r.cream} castShadow />
      {[[-0.26, -0.08], [0.17, -0.13], [-0.05, -0.34]].map(([x, y], i) => <mesh key={i} geometry={r.sphere} material={r.dark} position={[x, y, 0.09]} scale={[0.045, 0.035, 0.007]} />)}
    </group>
    <group ref={head} position={[0, 2.04, 0.04]}>
      <mesh geometry={r.head} material={r.fur} scale={[0.84, 0.69, 0.63]} castShadow />
      <group ref={ears}>
        {[-1, 1].map(side => <group key={side} position={[side * 0.57, 0.48, 0]} rotation={[0, 0, side * -0.13]}>
          <mesh geometry={r.ear} material={side === -1 ? r.orange : r.dark} castShadow />
          <mesh geometry={r.ear} material={r.pink} scale={[0.59, 0.62, 0.2]} position={[0, 0.12, 0.14]} />
        </group>)}
      </group>
      <mesh geometry={r.sphere} material={r.cream} position={[0, -0.31, 0.586]} scale={[0.32, 0.19, 0.11]} />
      <group position={[0, 0.01, 0.59]}>
        <group ref={eyes}>
          {[-1, 1].map(side => <group key={side} position={[side * 0.36, 0, 0]} rotation={[0, side * 0.14, 0]}>
            <mesh geometry={r.sphere} material={r.dark} scale={[0.25, 0.28, 0.064]} />
            <mesh geometry={r.sphere} material={r.iris} position={[0, 0, 0.036]} scale={[0.207, 0.234, 0.049]} />
          </group>)}
          <group ref={pupils}>
            {[-1, 1].map(side => <group key={side} position={[side * 0.36, 0, 0.084]}>
              <mesh geometry={r.sphere} material={r.black} scale={[0.073, 0.17, 0.023]} />
              <mesh geometry={r.sphere} material={r.shine} position={[-0.048, 0.078, 0.018]} scale={[0.038, 0.044, 0.012]} />
            </group>)}
          </group>
        </group>
        <mesh ref={eyelid} geometry={r.sphere} material={r.dark} position={[0, 0, 0]} scale={[0.65, 0.015, 0.03]} visible={false} />
      </group>
      <mesh geometry={r.paw} material={r.pink} position={[0, -0.22, 0.716]} scale={[0.087, 0.051, 0.029]} rotation={[0, 0, Math.PI]} />
      {[-1, 1].map(side => <mesh key={side} geometry={r.sphere} material={r.dark} position={[side * 0.055, -0.315, 0.692]} scale={[0.07, 0.013, 0.008]} rotation={[0, 0, side * 0.2]} />)}
    </group>
  </group>;
}
