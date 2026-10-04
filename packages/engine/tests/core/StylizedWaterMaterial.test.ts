import { describe, it, expect } from "vitest";
import {
  StylizedWaterMaterial,
  composeStylizedWaterSources,
} from "../../src/core/materials/StylizedWaterMaterial.js";
import { Color } from "../../src/core/colors/Color.js";

describe("StylizedWaterMaterial Anime Style Ladder & Preset Vectors", () => {
  it("defaults to toon preset with backward-compatible styleId 0", () => {
    const mat = new StylizedWaterMaterial();
    expect(mat.styleId).toBe(0);
    expect(mat.causticStrength).toBe(0.6);
    expect(mat.specularStrength).toBe(0.4);
    expect(mat.foamSoftness).toBe(0.06);
    expect(mat.skyTint).toBe(0.45);

    const manifest = mat.getRenderManifest();
    const styleB = manifest.properties["u_styleB"] as number[];
    expect(styleB[3]).toBe(0); // styleId == 0 (legacy toon path)
  });

  it("configures soft (Ghibli) preset correctly", () => {
    const mat = new StylizedWaterMaterial({ style: "soft" });
    expect(mat.styleId).toBe(1.0);
    expect(mat.rampSoftness).toBe(0.85);
    expect(mat.washAmount).toBe(0.4);
    expect(mat.foamSoftness).toBe(0.12);
    expect(mat.skyTint).toBe(0.6);
    expect(mat.glitterStrength).toBe(0.35);

    const manifest = mat.getRenderManifest();
    const styleA = manifest.properties["u_styleA"] as number[];
    const styleB = manifest.properties["u_styleB"] as number[];
    expect(styleA[0]).toBeCloseTo(0.85);
    expect(styleB[3]).toBe(1.0);
  });

  it("configures sparkle (painterly-sparkle) preset correctly", () => {
    const mat = new StylizedWaterMaterial({ style: "sparkle" });
    expect(mat.styleId).toBe(2.0);
    expect(mat.glitterStrength).toBe(1.0);
    expect(mat.lineDensity).toBe(0.7);

    const manifest = mat.getRenderManifest();
    const styleB = manifest.properties["u_styleB"] as number[];
    expect(styleB[2]).toBe(1.0); // glitterStrength
    expect(styleB[3]).toBe(2.0); // styleId
  });

  it("allows overriding specific style vector parameters", () => {
    const mat = new StylizedWaterMaterial({
      style: "soft",
      glitterStrength: 0.8,
      rampSoftness: 0.95,
      shallowWaterColor: new Color(0.2, 0.7, 0.8),
    });
    expect(mat.styleId).toBe(1.0);
    expect(mat.glitterStrength).toBe(0.8);
    expect(mat.rampSoftness).toBe(0.95);
    expect(mat.color.r).toBeCloseTo(0.2);
  });

  it("composes shader sources with default empty extension hooks", () => {
    const sources = composeStylizedWaterSources();
    expect(sources.glsl300?.fs).not.toContain("[WATER_EXT_DECL]");
    expect(sources.glsl300?.fs).not.toContain("[WATER_EXT_SURFACE]");
    expect(sources.wgsl).not.toContain("[WGSL_WATER_EXT_DECL]");
    expect(sources.wgsl).not.toContain("[WGSL_WATER_EXT_SURFACE]");
  });
});
