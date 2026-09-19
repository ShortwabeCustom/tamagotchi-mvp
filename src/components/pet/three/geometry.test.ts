import { describe, expect, it, vi } from "vitest";
import { headGeometry, bodyGeometry, earGeometry, scarfGeometry, tailGeometry } from "./geometry";
import { disposeResources } from "./resources";
import { coatMaterial } from "./materials";

describe("sculpted geometry and cleanup", () => {
  it.each([
    ["head", headGeometry], ["body", () => bodyGeometry("body")], ["leg", () => bodyGeometry("leg")],
    ["ear", earGeometry], ["scarf", scarfGeometry], ["tail", tailGeometry],
  ] as const)("%s has finite positions, normals, valid indices and real depth", (_, create) => {
    const geometry = create();
    for (const attribute of [geometry.attributes.position, geometry.attributes.normal]) {
      expect(Array.from(attribute.array).every(Number.isFinite)).toBe(true);
    }
    expect(Array.from(geometry.index!.array).every(index => index >= 0 && index < geometry.attributes.position.count)).toBe(true);
    geometry.computeBoundingBox();
    expect(geometry.boundingBox!.max.z - geometry.boundingBox!.min.z).toBeGreaterThan(0.03);
    geometry.dispose();
  });
  it("releases shared owned resources once, including new geometry", () => {
    const head = headGeometry(), ear = earGeometry(), coat = coatMaterial("head");
    const headDisposed = vi.fn(), earDisposed = vi.fn(), coatDisposed = vi.fn();
    head.addEventListener("dispose", headDisposed); ear.addEventListener("dispose", earDisposed);
    coat.addEventListener("dispose", coatDisposed);
    disposeResources({ head, alias: head, ear, coat, sharedCoat: coat });
    expect(headDisposed).toHaveBeenCalledTimes(1);
    expect(earDisposed).toHaveBeenCalledTimes(1);
    expect(coatDisposed).toHaveBeenCalledTimes(1);
  });
});
