import { BufferAttribute, Color, ExtrudeGeometry, Shape, SphereGeometry } from "three";

const charcoal = new Color("#302b28");
const orange = new Color("#bc7944");
const cream = new Color("#ead8b7");
function signedPower(value: number, power: number) { return Math.sign(value) * Math.pow(Math.abs(value), power); }

/** Rounded, continuous toy volumes. Carey pigmentation lives in vertex colors, not floating meshes. */
export function toyGeometry(power = 0.65, coat: "head" | "body" | "plain" = "plain") {
  const geometry = new SphereGeometry(1, coat === "plain" ? 24 : 48, coat === "plain" ? 16 : 32);
  const position = geometry.attributes.position;
  const colors = new Float32Array(position.count * 3);
  for (let i = 0; i < position.count; i++) {
    const x = signedPower(position.getX(i), power);
    const y = signedPower(position.getY(i), power);
    const z = signedPower(position.getZ(i), power);
    position.setXYZ(i, x, y, z);
    const wave = Math.sin(x * 9 + y * 5 + z * 3) * 0.045 + Math.cos(y * 12 - z * 7) * 0.03;
    const patch = coat === "head"
      ? ((x + 0.52) ** 2 / 0.34 + (y - 0.27) ** 2 / 0.84 < 1 + wave && z > 0.05) || (x > 0.65 + wave && y < -0.1)
      : Math.sin(x * 3.7 + z * 3 + y * 2) + Math.cos(y * 4 - z * 2) > 0.8;
    const color = coat === "plain" ? cream : patch ? orange : charcoal;
    colors.set([color.r, color.g, color.b], i * 3);
  }
  geometry.setAttribute("color", new BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}
export function earGeometry() {
  const shape = new Shape();
  shape.moveTo(-0.29, 0);
  shape.quadraticCurveTo(-0.3, 0.24, -0.2, 0.68);
  shape.quadraticCurveTo(-0.16, 0.8, -0.07, 0.66);
  shape.quadraticCurveTo(0.2, 0.33, 0.3, 0);
  shape.closePath();
  const geometry = new ExtrudeGeometry(shape, { depth: 0.18, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.07, bevelThickness: 0.07, curveSegments: 10 });
  geometry.translate(0, 0, -0.09);
  return geometry;
}
export function scarfGeometry() {
  const shape = new Shape();
  shape.moveTo(-0.53, 0.06); shape.lineTo(0.53, 0.06);
  shape.quadraticCurveTo(0.27, -0.2, 0.05, -0.5);
  shape.quadraticCurveTo(-0.1, -0.56, -0.23, -0.32); shape.closePath();
  return new ExtrudeGeometry(shape, { depth: 0.045, bevelEnabled: true, bevelSegments: 2, bevelSize: 0.035, bevelThickness: 0.025, curveSegments: 8 });
}
