import { describe, expect, it } from "vitest";
import { rendererLifecycle } from "./renderer-lifecycle";
import { resolvePetRenderer, resolveRendererTimeout } from "@/lib/pet-engine/renderer-config";
describe("renderer lifecycle independent of product state", () => {
  it("defaults to 2D and accepts only explicit 3D", () => {
    for (const value of [undefined, "", "true", "3D", "2d"]) expect(resolvePetRenderer(value)).toBe("2d");
    expect(resolvePetRenderer("3d")).toBe("3d");
    expect(resolveRendererTimeout(undefined)).toBe(6000);
    expect(resolveRendererTimeout("-1")).toBe(6000);
    expect(resolveRendererTimeout("4500")).toBe(4500);
  });
  it("retains fallback after a late first frame", () => {
    const failed = rendererLifecycle({ stage: "assets" }, { type: "timeout" });
    expect(failed.failure).toBe("load-timeout");
    expect(rendererLifecycle(failed, { type: "stage", stage: "frame" })).toBe(failed);
  });
  it("ignores deadline after a frame but handles context loss", () => {
    const ready = rendererLifecycle({ stage: "loading" }, { type: "stage", stage: "frame" });
    expect(rendererLifecycle(ready, { type: "timeout" })).toBe(ready);
    expect(rendererLifecycle(ready, { type: "failure", reason: "context-lost" }).failure).toBe("context-lost");
  });
});
