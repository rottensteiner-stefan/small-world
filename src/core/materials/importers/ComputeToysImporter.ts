/// src/core/materials/importers/ComputeToysImporter.ts
import { ShaderImporter } from "./ShaderImporter.js";
import { CustomShaderMaterialOptions } from "../CustomShaderMaterial.js";
import { ShaderPropertyType } from "../../../enums/index.js";

/**
 * Importer for Compute.toys (WGSL).
 * Compute.toys uses WebGPU compute shaders. Since SmallWorld's CustomShaderMaterial
 * operates in the fragment pipeline, this importer uses heuristics to translate
 * `textureStore(screen, ...)` into fragment outputs, and provides the `custom` uniform struct.
 */
export class ComputeToysImporter implements ShaderImporter {
  public parse(sourceCode: string): CustomShaderMaterialOptions {
    // Basic heuristic: Replace compute signature with a fragment-friendly signature
    let adaptedCode = sourceCode;

    // Remove the compute attributes
    adaptedCode = adaptedCode.replace(/@compute\s*@workgroup_size\([^)]+\)/g, "");

    // Replace textureStore with returning the color
    // e.g. textureStore(screen, id.xy, vec4<f32>(col_linear, 1.)); -> return vec4<f32>(col_linear, 1.);
    adaptedCode = adaptedCode.replace(
      /textureStore\s*\(\s*screen\s*,\s*[^,]+,\s*(.*)\s*\)\s*;/g,
      "return $1;",
    );

    // Replace the main function signature
    adaptedCode = adaptedCode.replace(
      /fn\s+main_image\s*\(\s*@builtin\(global_invocation_id\)\s+id\s*:\s*vec3<u32>\s*\)/g,
      "fn compute_toys_main(id: vec3<u32>) -> vec4f",
    );

    const wgslSource = `
struct ObjectUniforms {
  model: mat4x4f,
  time: f32,
  timeDelta: f32,
  frame: f32,
  padding1: f32,
  resolution: vec2f,
  padding2: vec2f,
  mouse: vec4f,
}

@group(1) @binding(0) var<uniform> custom: ObjectUniforms;

${adaptedCode}

@vertex
fn vs(@location(0) a_position: vec3f, @location(1) a_uv: vec2f) -> @builtin(position) vec4f {
    return global.vp * custom.model * vec4f(a_position, 1.0);
}

@fragment
fn fs(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
    let id = vec3<u32>(u32(fragCoord.x), u32(fragCoord.y), 0u);
    return compute_toys_main(id);
}
`;

    return {
      sources: {
        wgsl: `[WGSL_STRUCTS]\n${wgslSource}`,
      },
      layout: {
        uniforms: {
          model: { type: ShaderPropertyType.MAT4 },
          time: { type: ShaderPropertyType.FLOAT },
          timeDelta: { type: ShaderPropertyType.FLOAT },
          frame: { type: ShaderPropertyType.FLOAT },
          padding1: { type: ShaderPropertyType.FLOAT },
          resolution: { type: ShaderPropertyType.VEC2 },
          padding2: { type: ShaderPropertyType.VEC2 },
          mouse: { type: ShaderPropertyType.VEC4 },
        },
        uniformLayout: [
          "model",
          "time",
          "timeDelta",
          "frame",
          "padding1",
          "resolution",
          "padding2",
          "mouse",
        ],
        textures: {},
      },
      properties: {
        model: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
        time: 0.0,
        timeDelta: 0.0,
        frame: 0.0,
        padding1: 0.0,
        resolution: [800, 600],
        padding2: [0, 0],
        mouse: [0, 0, 0, 0],
      },
    };
  }
}
