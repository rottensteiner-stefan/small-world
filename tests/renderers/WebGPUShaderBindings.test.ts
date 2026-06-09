import { describe, expect, it } from "vitest";
import { StandardMaterial } from "../../src/core/materials/StandardMaterial";
import * as fs from "fs";
import * as path from "path";

describe("WebGPU Shader Bindings & Layouts", () => {
  it("should ensure StandardMaterial declares u_emissiveMap in its WebGPU layout", () => {
    const mat = new StandardMaterial();
    const layout = mat.getShaderDefinition().layout;
    
    expect(layout).toBeDefined();
    expect(layout!.textures).toBeDefined();
    
    // WebGPURenderer requires explicit declaration of textures in the layout
    expect(layout!.textures).toHaveProperty("u_emissiveMap");
    expect(layout!.textures!["u_emissiveMap"].type).toBe("texture");
  });

  it("should have matching @binding(12) for u_emissiveMap in structs.wgsl", () => {
    // Read the WebGPU structs definition
    const wgslPath = path.resolve(__dirname, "../../public/resources/shaders/web_gpu/chunks/structs.wgsl");
    const wgslContent = fs.readFileSync(wgslPath, "utf-8");

    // The strict typing of WebGPU requires an exact @binding mapping
    // We expect binding 12 to be u_emissiveMap
    const emissiveBindingRegex = /@group\(\d+\)\s+@binding\(12\)\s+var\s+u_emissiveMap\s*:\s*texture_2d<f32>/;
    
    expect(emissiveBindingRegex.test(wgslContent)).toBe(true);
  });
});
