"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, MeshStandardMaterial, MeshPhysicalMaterial, SphereGeometry, TorusGeometry, Shape, ExtrudeGeometry } from "three";
import type { PetAction } from "@/types/pet";
import { bodyGeometry, earGeometry, headGeometry, lineGeometry, scarfGeometry, tailGeometry } from "./geometry";
import { disposeResources } from "./resources";
import { coatMaterial } from "./materials";
import { ActionClock, eyeExpression, motionPose } from "./motion";

function createResources() {
  const noseShape = new Shape();
  noseShape.moveTo(-0.085, 0.025); noseShape.quadraticCurveTo(0, 0.068, 0.085, 0.025);
  noseShape.quadraticCurveTo(0.065, -0.013, 0, -0.055); noseShape.quadraticCurveTo(-0.065, -0.013, -0.085, 0.025);
  return {
    head: headGeometry(), body: bodyGeometry("body"), leg: bodyGeometry("leg"), haunch: bodyGeometry("haunch"),
    ear: earGeometry(), tail: tailGeometry(), scarf: scarfGeometry(),
    collar: new TorusGeometry(0.51, 0.078, 10, 36), sphere: new SphereGeometry(1, 28, 20),
    upperLid: new SphereGeometry(1, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    lowerLid: new SphereGeometry(1, 28, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
    smile: lineGeometry([[-0.255, 0.015, 0.094], [-0.14, 0.13, 0.148], [0, 0.17, 0.153], [0.14, 0.13, 0.148], [0.255, 0.015, 0.094]], 0.019),
    nose: new ExtrudeGeometry(noseShape, { depth: 0.035, bevelEnabled: true, bevelSize: 0.018, bevelThickness: 0.013, bevelSegments: 3, curveSegments: 10 }),
    mouthStem: lineGeometry([[0, 0, 0], [0, -0.05, 0], [0.035, -0.085, -0.01]], 0.01),
    mouthSide: lineGeometry([[0, -0.05, 0], [-0.02, -0.075, -0.005], [-0.05, -0.085, -0.01]], 0.01),
    toe: lineGeometry([[0, 0.005, 0], [0, -0.025, -0.004], [0, -0.065, -0.026]], 0.006),
    cheekMark: lineGeometry([[-0.05, 0, 0], [0, 0.012, 0.012], [0.045, 0.003, 0.018]], 0.016),
    headCoat: coatMaterial("head"), bodyCoat: coatMaterial("body"), legCoat: coatMaterial("leg"), tailCoat: coatMaterial("tail"), scarfCoat: coatMaterial("scarf"), lidCoat: coatMaterial("orange"),
    ears: new MeshPhysicalMaterial({ vertexColors: true, roughness: 0.93, sheen: 0.4 }),
    dark: new MeshStandardMaterial({ color: "#302722", roughness: 0.85 }),
    cream: new MeshStandardMaterial({ color: "#e4d2b1", roughness: 1 }),
    iris: new MeshPhysicalMaterial({ color: "#c5c580", roughness: 0.28, clearcoat: 0.8, clearcoatRoughness: 0.15 }),
    pupil: new MeshPhysicalMaterial({ color: "#10120d", roughness: 0.19, clearcoat: 1, clearcoatRoughness: 0.12 }),
    highlight: new MeshStandardMaterial({ color: "#fff4df", roughness: 0.1, emissive: "#fff4df", emissiveIntensity: 0.2 }),
  };
}
export function MisoProceduralModel({ action, reducedMotion, pointer }: { action: PetAction; reducedMotion: boolean; pointer: React.RefObject<{ x: number; y: number }> }) {
  const root = useRef<Group>(null), head = useRef<Group>(null), body = useRef<Group>(null), tail = useRef<Group>(null), scarf = useRef<Group>(null);
  const eyeVolumes = useRef<Group>(null);
  const pupils = useRef<Group>(null), lids = useRef<Group>(null), smiles = useRef<Group>(null);
  const clock = useRef(new ActionClock());
  const animation = useRef({ time: 0, blinkAt: 3.2, blinkAge: 1 });
  const r = useMemo(() => createResources(), []);
  useEffect(() => () => disposeResources(r), [r]);
  useFrame((_, delta) => {
    const state = animation.current;
    state.time += Math.min(delta, 0.05);
    const age = clock.current.step(action, delta);
    const pose = motionPose(action, age, state.time, reducedMotion);
    if (state.time > state.blinkAt) { state.blinkAge = 0; state.blinkAt = state.time + 2.8 + Math.random() * 4; }
    state.blinkAge += Math.min(delta, 0.05);
    const expression = eyeExpression(action, age, state.blinkAge, reducedMotion);
    if (root.current) root.current.position.y = pose.lift;
    if (body.current) body.current.scale.y = pose.breath;
    if (head.current) {
      head.current.rotation.z = pose.tilt;
      head.current.rotation.x = pose.nod + (pose.allowPointer ? -pointer.current.y * 0.025 : 0);
      head.current.rotation.y = pose.allowPointer ? pointer.current.x * 0.05 : 0;
    }
    if (lids.current) for (const eye of lids.current.children) {
      // Rotate unit hemispheres inside the scaled socket, so the lid follows the ellipsoid.
      // Scaling the mesh itself would swing the thin depth axis across the iris.
      eye.children[0].rotation.x = -(1 - expression.closure) * Math.PI / 2;
      eye.children[1].rotation.x = (1 - expression.closure) * Math.PI / 2;
    }
    if (eyeVolumes.current) eyeVolumes.current.visible = expression.closure < 0.97;
    if (smiles.current) smiles.current.visible = expression.closure > 0.96;
    if (pupils.current) pupils.current.position.x = pose.allowPointer ? pointer.current.x * 0.014 : 0;
    if (tail.current) tail.current.rotation.y = pose.tail;
    if (scarf.current) scarf.current.rotation.x = pose.lift * 0.12;
  });
  // Scale the character around its ground contact; the stage and camera stay unchanged.
  return <group ref={root} dispose={null} scale={1.15}>
    <group scale={[1, 0.87, 1]}>
    <group ref={body} position={[0, 0.76, -0.06]}>
      <mesh geometry={r.body} material={r.bodyCoat} scale={[0.73, 0.72, 0.59]} castShadow receiveShadow />
    </group>
    {[-1, 1].map(side => <group key={side}>
      <mesh geometry={r.haunch} material={r.bodyCoat} position={[side * 0.51, 0.39, -0.14]} scale={[0.32, 0.37, 0.44]} castShadow receiveShadow />
      <mesh geometry={r.leg} material={r.legCoat} position={[side * 0.31, 0.49, 0.38]} scale={[0.25, 0.49, 0.27]} castShadow receiveShadow rotation={[0.04, 0, side * -0.04]} />
      {[-0.063, 0.065].map(offset => <mesh key={offset} geometry={r.toe} material={r.dark} position={[side * 0.34 + offset, 0.2, 0.697]} />)}
    </group>)}
    <group ref={tail} position={[0.40, 0.27, -0.31]} rotation={[0, -0.15, 0]}><mesh geometry={r.tail} material={r.tailCoat} castShadow receiveShadow /></group>
    <group ref={scarf} position={[0, 1.31, 0.01]}>
      <mesh geometry={r.collar} material={r.cream} scale={[1.15, 0.84, 1]} rotation={[Math.PI / 2, 0, 0]} castShadow />
      <mesh geometry={r.scarf} material={r.scarfCoat} position={[0, 0, 0.52]} castShadow receiveShadow />
      <group position={[0.61, 0.01, 0.05]} rotation={[0.1, 0.35, -0.25]}>
        <mesh geometry={r.sphere} material={r.cream} scale={[0.12, 0.09, 0.12]} castShadow />
        <mesh geometry={r.scarf} material={r.scarfCoat} scale={[0.36, 0.72, 0.75]} rotation={[0.15, -0.55, 0.5]} position={[0.065, 0, 0]} castShadow />
      </group>
    </group>
    </group>
    <group ref={head} position={[0, 1.35, 0.055]}>
      <group position={[0, 0.53, 0]}>
        <mesh geometry={r.head} material={r.headCoat} scale={[1.04, 0.77, 0.70]} castShadow receiveShadow />
        {[-1, 1].map(side => <mesh key={side} geometry={r.ear} material={r.ears} position={[side * 0.72, 0.48, -0.075]} rotation={[0, side * 0.10, side * -0.20]} castShadow receiveShadow />)}
        <group ref={eyeVolumes}>
        {[-1, 1].map(side => <group key={side} position={[side * 0.48, 0.035, 0.557]} rotation={[0, side * 0.10, 0]}>
          <mesh geometry={r.sphere} material={r.dark} scale={[0.335, 0.379, 0.138]} />
          <mesh geometry={r.sphere} material={r.iris} scale={[0.314, 0.355, 0.14]} position={[0, 0, 0.007]} />
        </group>)}
        <group ref={pupils}>
          {[-1, 1].map(side => <group key={side} position={[side * 0.465, 0.041, 0.671]} rotation={[0, side * 0.1, 0]}>
            <mesh geometry={r.sphere} material={r.pupil} scale={[0.226, 0.274, 0.039]} />
            <mesh geometry={r.sphere} material={r.highlight} position={[-0.085, 0.128, 0.029]} scale={[0.049, 0.056, 0.013]} />
            <mesh geometry={r.sphere} material={r.highlight} position={[0.09, -0.115, 0.03]} scale={[0.018, 0.019, 0.007]} />
          </group>)}
        </group>
        </group>
        <group ref={lids}>
          {[-1, 1].map(side => <group key={side} position={[side * 0.48, 0.035, 0.557]} rotation={[0, side * 0.1, 0]} scale={[0.342, 0.387, 0.17]}>
            <mesh geometry={r.upperLid} material={r.lidCoat} />
            <mesh geometry={r.lowerLid} material={r.lidCoat} />
          </group>)}
        </group>
        <group ref={smiles} visible={false}>
          {[-1, 1].map(side => <mesh key={side} geometry={r.smile} material={r.dark} position={[side * 0.48, 0.035, 0.564]} rotation={[0, side * 0.1, 0]} />)}
        </group>
        <mesh geometry={r.nose} material={r.dark} position={[0, -0.30, 0.718]} />
        <mesh geometry={r.mouthStem} material={r.dark} position={[0, -0.35, 0.752]} />
        <mesh geometry={r.mouthSide} material={r.dark} position={[0, -0.35, 0.752]} />
        {[-1, 1].map(side => <group key={side} position={[side * 0.79, -0.30, 0.59]} rotation={[0, side * 0.28, side * -0.18]}>
          <mesh geometry={r.cheekMark} material={r.dark} />
          <mesh geometry={r.cheekMark} material={r.dark} position={[side * -0.025, -0.083, 0.004]} scale={0.8} />
        </group>)}
      </group>
    </group>
  </group>;
}
