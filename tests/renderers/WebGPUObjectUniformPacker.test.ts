import { describe, it, expect } from "vitest";
import { UniformPacker } from "../../src/core/renderers/shaders/UniformPacker.js";
import { ShaderPropertyType } from "../../src/enums/index.js";
import { Color } from "../../src/core/colors/Color.js";

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
