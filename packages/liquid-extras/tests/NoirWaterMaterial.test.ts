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

  it("injects custom surface shader hook without modifying core", () => {
    const mat = new NoirWaterMaterial();
    const shaderDef = mat.getShaderDefinition();
    expect(shaderDef).toBeDefined();

    // Verify injected GLSL hook
    const glslSources = shaderDef.sources.glsl300;
    expect(glslSources?.fs).toContain("Noir comic-ink desaturation");

    // Verify injected WGSL hook
    const wgslSource = shaderDef.sources.wgsl;
    expect(wgslSource).toContain("Noir comic-ink desaturation");
  });
});
