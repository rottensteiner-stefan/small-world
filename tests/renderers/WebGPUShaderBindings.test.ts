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
    const wgslPath = path.resolve(
      __dirname,
      "../../src/core/renderers/shaders/source/web_gpu/chunks/structs.wgsl",
    );
    const wgslContent = fs.readFileSync(wgslPath, "utf-8");

    // The strict typing of WebGPU requires an exact @binding mapping
    // for textures in the material.
    // 1: sampler
    // 2-10: 2D maps
    // 11: Skybox (Cube)
    // 12: Emissive Map
    expect(wgslContent).toContain("@group(1) @binding(12) var u_emissiveMap: texture_2d<f32>;");
  });

  it("should correctly rewrite base.vert.wgsl for instanced rendering without corrupting parameters", () => {
    const wgslPath = path.resolve(
      __dirname,
      "../../src/core/renderers/shaders/source/web_gpu/base.vert.wgsl",
    );
    let code = fs.readFileSync(wgslPath, "utf-8");

    // Apply the instancing rewrite logic
    code = code.replace(/fn\s+vs\s*\(([\s\S]*?)\)\s*->\s*Out\s*\{/, (_match, params) => {
      const trimmedParams = params.trim();
      const comma = trimmedParams.length > 0 ? "," : "";
      return `fn vs(
  ${trimmedParams}${comma}
  @location(4) inst_col0: vec4f,
  @location(5) inst_col1: vec4f,
  @location(6) inst_col2: vec4f,
  @location(7) inst_col3: vec4f
) -> Out {
  let instMatrix = mat4x4f(inst_col0, inst_col1, inst_col2, inst_col3);`;
    });
    code = code.replace(/obj\.model/g, "(obj.model * instMatrix)");

    // Assertions
    // 1. Should contain location 4, 5, 6, 7
    expect(code).toContain("@location(4) inst_col0: vec4f");
    expect(code).toContain("@location(5) inst_col1: vec4f");
    expect(code).toContain("@location(6) inst_col2: vec4f");
    expect(code).toContain("@location(7) inst_col3: vec4f");

    // 2. Original parameters should still be completely intact
    expect(code).toContain("@location(0) pos: vec3f");
    expect(code).toContain("@location(1) normal: vec3f");
    expect(code).toContain("@location(2) uv: vec2f");
    expect(code).toContain("@location(3) tangent: vec3f");

    // 3. instMatrix should be instantiated
    expect(code).toContain("let instMatrix = mat4x4f(inst_col0, inst_col1, inst_col2, inst_col3);");

    // 4. obj.model should be replaced
    expect(code).toContain("(obj.model * instMatrix)");
    expect(code).not.toContain("obj.model * vec4f(pos, 1.0)");
  });
});
