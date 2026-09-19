import { useEffect, useMemo } from "react";
import { LatheGeometry, Vector2 } from "three";

export function Stage() {
  const base = useMemo(() => new LatheGeometry([
    new Vector2(0, -0.27), new Vector2(2.37, -0.27), new Vector2(2.43, -0.24),
    new Vector2(2.47, -0.19), new Vector2(2.5, -0.07), new Vector2(2.48, -0.025),
    new Vector2(2.43, 0), new Vector2(0, 0),
  ], 80), []);
  useEffect(() => () => base.dispose(), [base]);
  const bowl = useMemo(() => new LatheGeometry([
    new Vector2(0, 0.025), new Vector2(0.2, 0.025), new Vector2(0.29, 0.06),
    new Vector2(0.36, 0.24), new Vector2(0.35, 0.28), new Vector2(0.31, 0.27),
    new Vector2(0.25, 0.12), new Vector2(0, 0.09),
  ], 40), []);
  useEffect(() => () => bowl.dispose(), [bowl]);
  return <group>
    <mesh geometry={base} receiveShadow castShadow>
      <meshStandardMaterial color="#464236" roughness={1} />
    </mesh>
    <mesh position={[0, -0.31, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[200, 200]} /><shadowMaterial transparent opacity={0.25} />
    </mesh>
    <mesh geometry={bowl} position={[-1.18, 0, 0.94]} castShadow receiveShadow>
      <meshStandardMaterial color="#e4d5b8" roughness={0.48} />
    </mesh>
    <group position={[1.32, 0.09, 0.82]} rotation={[-0.13, -0.28, 0.08]}>
      <mesh castShadow receiveShadow><boxGeometry args={[0.58, 0.065, 0.39]} /><meshStandardMaterial color="#d9c7a7" roughness={1} /></mesh>
      <mesh position={[0, 0.035, -0.04]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.046, 20]} /><meshStandardMaterial color="#a96542" roughness={1} />
      </mesh>
      <mesh position={[0, 0.034, -0.03]} rotation={[-Math.PI / 2, 0, Math.PI]}>
        <circleGeometry args={[0.22, 3, 0, Math.PI * 2]} /><meshStandardMaterial color="#c9b698" roughness={1} />
      </mesh>
    </group>
  </group>;
}
