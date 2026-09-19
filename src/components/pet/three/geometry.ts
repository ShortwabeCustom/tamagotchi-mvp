import { BufferGeometry, Float32BufferAttribute, Shape, SphereGeometry, CatmullRomCurve3, TubeGeometry, Vector3, Color } from "three";

function signedPower(value: number, power: number) { return Math.sign(value) * Math.pow(Math.abs(value), power); }

/** Rest-space sculpture: all sockets, cheeks and muzzle belong to the same closed surface. */
export function headGeometry() {
  const geometry = new SphereGeometry(1, 64, 40);
  const p = geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = signedPower(p.getX(i), 0.65);
    const y = signedPower(p.getY(i), 0.66);
    let z = signedPower(p.getZ(i), 0.64);
    const cheek = 1 + 0.055 * Math.exp(-Math.pow((y + 0.35) / 0.4, 2));
    if (z > 0) {
      const sockets = [-0.46, 0.46].reduce((sum, eyeX) => sum + Math.exp(-(((x - eyeX) / 0.28) ** 2 + ((y - 0.03) / 0.37) ** 2) * 1.7), 0);
      const muzzle = Math.exp(-((x / 0.56) ** 2 + ((y + 0.49) / 0.3) ** 2) * 1.5);
      z += (0.055 * muzzle - 0.135 * sockets) * Math.min(1, z * 2);
    }
    p.setXYZ(i, x * cheek, y, z);
  }
  geometry.computeVertexNormals();
  return geometry;
}

/** Pear-shaped seated body and continuous forelegs, not a stack of spheres. */
export function bodyGeometry(kind: "body" | "leg" | "haunch") {
  const geometry = new SphereGeometry(1, 32, 24);
  const p = geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = signedPower(p.getY(i), kind === "leg" ? 0.78 : 0.87);
    let x = signedPower(p.getX(i), 0.86);
    let z = signedPower(p.getZ(i), 0.86);
    if (kind === "body") { x *= 0.85 - y * 0.23; z = z * (0.91 - y * 0.18) - (1 - y) * 0.09; }
    if (kind === "leg") { x *= 0.86 - y * 0.16; z = z * (0.92 - y * 0.12) + (1 - y) * 0.11; }
    p.setXYZ(i, x, y, z);
  }
  geometry.computeVertexNormals();
  return geometry;
}

/** Two sculpted surfaces joined at the rim: front is concave, back is domed. */
export function earGeometry() {
  const outline = new Shape();
  outline.moveTo(-0.33, 0);
  outline.quadraticCurveTo(-0.4, 0.35, -0.25, 0.86);
  outline.quadraticCurveTo(-0.21, 0.99, -0.08, 0.84);
  outline.quadraticCurveTo(0.24, 0.5, 0.34, 0.04);
  outline.quadraticCurveTo(0, -0.07, -0.33, 0);
  const boundary = outline.getPoints(12).slice(0, -1);
  const vertices: number[] = [], colors: number[] = [], indices: number[] = [];
  const n = boundary.length, rings = 8;
  const dark = new Color("#3a302b"), inner = new Color("#b88973");
  for (let side = 0; side < 2; side++) {
    for (let ring = 0; ring <= rings; ring++) {
      const t = ring / rings;
      for (const point of boundary) {
        const z = side === 0 ? 0.065 * t - 0.11 * (1 - t) ** 2 : 0.065 * t - 0.29 * Math.sqrt(1 - t * t);
        vertices.push(point.x * t, 0.32 + (point.y - 0.32) * t, z);
        const color = side === 0 && t < 0.79 ? inner : dark;
        colors.push(color.r, color.g, color.b);
      }
    }
    const offset = side * (rings + 1) * n;
    for (let ring = 0; ring < rings; ring++) for (let j = 0; j < n; j++) {
      const a = offset + ring * n + j, b = offset + ring * n + (j + 1) % n;
      const c = a + n, d = b + n;
      if (side === 0) indices.push(a, b, c, b, d, c); else indices.push(a, c, b, b, c, d);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}

/** A folded triangular scarf with real thickness, plus separate collar/knot in the model. */
export function scarfGeometry() {
  const positions: number[] = [], indices: number[] = [];
  const count = 18;
  for (let side = 0; side < 2; side++) for (let row = 0; row <= count; row++) {
    const v = row / count;
    for (let col = 0; col <= count; col++) {
      const u = col / count, x = (u - 0.5) * 1.19 * (1 - v) - 0.035 * v;
      const y = -0.47 * v + 0.045 * Math.cos(x * 3);
      const z = 0.075 * Math.sin(u * Math.PI) + 0.07 * v + 0.025 * Math.sin(u * Math.PI * 3 + v * 3) * (1 - v);
      positions.push(x, y, z - side * 0.035);
    }
  }
  const stride = count + 1, sheet = stride * stride;
  for (let side = 0; side < 2; side++) for (let row = 0; row < count; row++) for (let col = 0; col < count; col++) {
    const a = side * sheet + row * stride + col, b = a + 1, c = a + stride, d = c + 1;
    if (side === 0) indices.push(a, c, b, b, c, d); else indices.push(a, b, c, b, d, c);
  }
  for (let row = 0; row < count; row++) for (const col of [0, count]) {
    const a = row * stride + col, b = a + stride;
    indices.push(a, a + sheet, b, b, a + sheet, b + sheet);
  }
  for (let col = 0; col < count; col++) indices.push(col, col + 1, col + sheet, col + 1, col + 1 + sheet, col + sheet);
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}

export function tailGeometry() {
  const curve = new CatmullRomCurve3([new Vector3(0, 0, 0), new Vector3(0.47, 0.02, -0.04), new Vector3(0.79, 0.2, -0.015), new Vector3(0.87, 0.48, 0.03), new Vector3(0.73, 0.74, 0.055)]);
  const segments = 36, radial = 14;
  const geometry = new TubeGeometry(curve, segments, 1, radial, false);
  const p = geometry.attributes.position;
  for (let i = 0; i <= segments; i++) {
    const u = i / segments, center = curve.getPointAt(u);
    const radius = 0.245 * Math.pow(Math.sin(Math.PI * (0.08 + u * 0.92)), 0.33);
    for (let j = 0; j <= radial; j++) {
      const index = i * (radial + 1) + j;
      p.setXYZ(index, center.x + (p.getX(index) - center.x) * radius, center.y + (p.getY(index) - center.y) * radius, center.z + (p.getZ(index) - center.z) * radius);
    }
  }
  geometry.computeVertexNormals();
  return geometry;
}

export function lineGeometry(points: [number, number, number][], radius = 0.012) {
  return new TubeGeometry(new CatmullRomCurve3(points.map(p => new Vector3(...p))), 12, radius, 6, false);
}
