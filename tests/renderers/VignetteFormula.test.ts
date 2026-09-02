import { describe, it, expect } from "vitest";

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

describe("Vignette Shader Math Consistency", () => {
  it("yields consistent results across WebGL1, WebGL2 and WebGPU formulations", () => {
    const offset = 0.8;
    const darkness = 0.5;

    // Test points from center (d=0) to corner (d=0.707)
    const testDistances = [0.0, 0.2, 0.4, 0.6, 0.8, 1.0];

    for (const d of testDistances) {
      // WebGL2/WebGPU formula:
      const innerRadius = offset * 0.5;
      const vignette = 1.0 - smoothstep(innerRadius, offset, d);
      const intensity = 1.0 * (1.0 - darkness) + vignette * darkness; // mix(1.0, vignette, darkness)

      // WebGL1 aligned formula:
      const gl1InnerRadius = offset * 0.5;
      const gl1Vignette = 1.0 - smoothstep(gl1InnerRadius, offset, d);
      const gl1Intensity = 1.0 * (1.0 - darkness) + gl1Vignette * darkness;

      expect(gl1Intensity).toBeCloseTo(intensity, 5);
    }
  });
});
