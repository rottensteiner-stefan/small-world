import { describe, it, expect } from "vitest";
import { UniformPacker } from "../../src/core/renderers/shaders/UniformPacker.js";
import { ShaderPropertyType } from "../../src/enums/index.js";
import { Color } from "../../src/core/colors/Color.js";
import { Matrix4 } from "../../src/math/index.js";

describe("WebGPU Object Uniform Color/Alpha Packing", () => {
  it("correctly preserves alpha when packing 4-component COLOR into uniform buffer", () => {
    const layout = {
      uniforms: {
        u_color: { type: ShaderPropertyType.COLOR },
      },
      uniformLayout: ["u_color"],
      textures: {},
    };

    const targetBuffer = new Float32Array(16); // 64 bytes = 16 floats

    // Case 1: Custom color with specific alpha
    const color = new Color(0.2, 0.4, 0.6, 0.8);
    const scratchColor = new Float32Array([color.r, color.g, color.b, color.a]);

    UniformPacker.packInto(layout, { u_color: scratchColor }, targetBuffer);

    expect(targetBuffer[0]).toBeCloseTo(0.2);
    expect(targetBuffer[1]).toBeCloseTo(0.4);
    expect(targetBuffer[2]).toBeCloseTo(0.6);
    expect(targetBuffer[3]).toBeCloseTo(0.8);

    // Case 2: Fallback when material has no color (defaults to 1.0, 1.0, 1.0, 1.0)
    const fallbackColor = new Float32Array([1.0, 1.0, 1.0, 1.0]);
    UniformPacker.packInto(layout, { u_color: fallbackColor }, targetBuffer);

    expect(targetBuffer[0]).toBeCloseTo(1.0);
    expect(targetBuffer[1]).toBeCloseTo(1.0);
    expect(targetBuffer[2]).toBeCloseTo(1.0);
    expect(targetBuffer[3]).toBeCloseTo(1.0);
  });
});

describe("WebGPU Object Uniform MAT4 alignment (WGSL/std140 spec compliance)", () => {
  it("aligns a MAT4 following a scalar to a 16-byte (4-float) boundary, not 64 bytes", () => {
    // WGSL/std140: a mat4x4's base alignment equals its column type's (vec4 -> 16 bytes),
    // not its total size (64 bytes). A single leading FLOAT lands at float-offset 0; the correct
    // next aligned offset for a MAT4 is 4 (16 bytes), not 16 (64 bytes).
    const layout = {
      uniforms: {
        u_pad: { type: ShaderPropertyType.FLOAT },
        u_model: { type: ShaderPropertyType.MAT4 },
      },
      uniformLayout: ["u_pad", "u_model"],
      textures: {},
    };

    const identity = new Matrix4();
    const targetBuffer = new Float32Array(32);
    UniformPacker.packInto(layout, { u_pad: 1, u_model: identity }, targetBuffer);

    expect(targetBuffer[0]).toBeCloseTo(1); // u_pad at offset 0
    // The 3 floats between the scalar and the correct 4-float alignment boundary must be padding.
    expect(Array.from(targetBuffer.slice(1, 4))).toEqual([0, 0, 0]);
    // u_model must start at float-offset 4 (16 bytes), matching the WGSL struct layout exactly --
    // not offset 16, which the old (spec-violating) 64-byte alignment would have produced.
    expect(Array.from(targetBuffer.slice(4, 20))).toEqual(Array.from(identity.data));
  });

  it("still packs correctly when a MAT4 is the very first uniform (offset 0 either way)", () => {
    const layout = {
      uniforms: {
        u_model: { type: ShaderPropertyType.MAT4 },
        u_color: { type: ShaderPropertyType.COLOR },
      },
      uniformLayout: ["u_model", "u_color"],
      textures: {},
    };

    const identity = new Matrix4();
    const color = new Color(0.1, 0.2, 0.3, 0.4);
    const targetBuffer = new Float32Array(32);
    UniformPacker.packInto(layout, { u_model: identity, u_color: color }, targetBuffer);

    expect(Array.from(targetBuffer.slice(0, 16))).toEqual(Array.from(identity.data));
    // A MAT4 still occupies its full 64 bytes (16 floats) -- only its *alignment* changed.
    const packedColor = Array.from(targetBuffer.slice(16, 20));
    [0.1, 0.2, 0.3, 0.4].forEach((expected, i) => expect(packedColor[i]).toBeCloseTo(expected));
  });
});
