import { describe, it, expect } from "vitest";
import { NoirWaterMaterial } from "../src/materials/NoirWaterMaterial.js";

describe("NoirWaterMaterial Hook-Based Extension", () => {
  it("instantiates cleanly with noir palette and custom type", () => {
    const mat = new NoirWaterMaterial();
    expect(mat.type).toBe("NoirWaterMaterial");
    expect(mat.styleId).toBe(3.0);
    expect(mat.transparent).toBe(true);
    expect(mat.depthWrite).toBe(false);

    const manifest = mat.getRenderManifest();
    expect(manifest.properties["u_styleB"]).toBeDefined();
    const styleB = manifest.properties["u_styleB"] as number[];
    expect(styleB[3]).toBe(3.0); // styleId
  });

  it("injects ink, hatching and posterize hooks into all three backends", () => {
    const mat = new NoirWaterMaterial();
    const shaderDef = mat.getShaderDefinition();
    expect(shaderDef).toBeDefined();

    expect(shaderDef.sources.glsl300?.fs).toContain("hatchA");
    expect(shaderDef.sources.glsl100?.fs).toContain("hatchA");
    expect(shaderDef.sources.wgsl).toContain("hatchA");
    // posterize steps are read from the lane, not hardcoded
    expect(shaderDef.sources.glsl300?.fs).toContain("u_styleA.w");
    expect(shaderDef.sources.wgsl).toContain("obj.styleA.w");
  });

  it("transports posterizeSteps through the u_styleA.w lane", () => {
    const mat = new NoirWaterMaterial({ posterizeSteps: 6 });
    expect(mat.posterizeSteps).toBe(6);
    expect((mat.getRenderManifest().properties["u_styleA"] as number[])[3]).toBe(6);
    mat.posterizeSteps = 3;
    expect((mat.getRenderManifest().properties["u_styleA"] as number[])[3]).toBe(3);
  });

  it("clamps posterizeSteps to 2..8 and defaults to 4", () => {
    expect(new NoirWaterMaterial().posterizeSteps).toBe(4);
    expect(new NoirWaterMaterial({ posterizeSteps: 0 }).posterizeSteps).toBe(2);
    expect(new NoirWaterMaterial({ posterizeSteps: 99 }).posterizeSteps).toBe(8);
  });

  it("disables base ripple lines and glitter, and uses low caustics by default", () => {
    const mat = new NoirWaterMaterial({ lineDensity: 0.9, glitterStrength: 0.9 });
    const manifest = mat.getRenderManifest();
    expect((manifest.properties["u_styleA"] as number[])[2]).toBe(0);
    expect((manifest.properties["u_styleB"] as number[])[2]).toBe(0);
    expect(mat.causticStrength).toBeLessThanOrEqual(0.2);
  });
});
