import { Color, MeshPhysicalMaterial } from "three";
export type CoatRegion = "head" | "body" | "leg" | "tail" | "scarf" | "orange";

/** Identity masks are anchored in each mesh's rest coordinates; no time, UV seams or random seeds. */
export function coatMaterial(region: CoatRegion) {
  const material = new MeshPhysicalMaterial({ color: "#ffffff", roughness: region === "scarf" ? 1 : 0.91, sheen: region === "scarf" ? 0.1 : 0.38, sheenColor: new Color("#b9a28c"), sheenRoughness: 0.95 });
  material.customProgramCacheKey = () => `miso-coat-v4-${region}`;
  const mask = {
    head: `
      float front = smoothstep(0.12, 0.58, p.z);
      float stripe = 0.14 + 0.06 * smoothstep(-0.4, 0.8, p.y);
      float center = p.x + 0.055 * sin(p.y * 3.5);
      float sides = smoothstep(stripe - 0.018, stripe + 0.018, abs(center) + edge * 0.045);
      float crown = 1.0 - smoothstep(0.55, 0.71, p.y + edge * 0.11 + p.x * 0.08);
      float islandA = length((p.xy - vec2(0.54, -0.10)) / vec2(0.53, 0.69));
      float islandB = length((p.xy - vec2(-0.83, -0.34)) / vec2(0.43, 0.43));
      float islands = 1.0 - smoothstep(0.78, 0.9, min(islandA, islandB) + edge * 0.06);
      coat = mix(charcoal, ginger, mix(islands, sides * crown, front));
      // Two rising cheek lobes soften the old horizontal cream band, below the eyes.
      float cheekRise = 0.09 * exp(-pow((abs(p.x) - 0.59) / 0.27, 2.0));
      float muzzle = (1.0 - smoothstep(-0.44, -0.17, p.y - cheekRise + 0.06 * abs(p.x) + edge * 0.018)) * front;
      coat = mix(coat, cream, muzzle);
      float noseStripe = (1.0 - smoothstep(0.12, 0.2, abs(center))) * smoothstep(-0.44, -0.3, p.y) * front;
      coat = mix(coat, charcoal, noseStripe);
    `,
    body: `float flank = smoothstep(0.24,0.44,abs(p.x)+edge*0.055); float shoulder = 1.0-smoothstep(0.32,0.63,p.y+p.x*0.22+edge*0.045); coat=mix(charcoal,ginger,flank*shoulder);`,
    leg: `float sock = 1.0-smoothstep(-0.43,-0.25,p.y+edge*0.065); coat=mix(ginger,charcoal,max(sock,smoothstep(0.82,0.98,p.y+p.x*0.10+edge*0.04)));`,
    tail: `coat=mix(charcoal,ginger,smoothstep(0.37,0.48,p.y+edge*0.08));`,
    scarf: `float a=length((p.xy-vec2(-0.29,-0.09))/vec2(0.095,0.105)); float b=length((p.xy-vec2(0.24,-0.09))/vec2(0.10,0.085)); coat=mix(cream,charcoal,1.0-smoothstep(0.94,1.03,min(a,b)));`,
    orange: `coat=ginger;`,
  }[region];
  material.onBeforeCompile = shader => {
    shader.vertexShader = `varying vec3 vCoatPosition;\n${shader.vertexShader}`.replace("#include <begin_vertex>", "#include <begin_vertex>\nvCoatPosition = position;");
    shader.fragmentShader = `varying vec3 vCoatPosition;
      float noise(vec3 p) { return (sin(p.x*2.3+sin(p.y*2.1))*sin(p.y*2.7+p.z)+cos(p.z*3.1-p.x*1.5))*0.32; }
      ${shader.fragmentShader}`.replace("#include <color_fragment>", `#include <color_fragment>
      vec3 p=vCoatPosition;
      vec3 charcoal=vec3(0.038,0.030,0.026);
      vec3 ginger=vec3(0.47,0.205,0.075);
      vec3 cream=vec3(0.82,0.71,0.54);
      float edge=noise(p*11.0)+0.20*noise(p*31.0);
      vec3 coat=charcoal;
      ${mask}
      float grain = noise(p*95.0)*0.018;
      diffuseColor.rgb *= coat * (1.0+grain);
    `);
  };
  return material;
}
