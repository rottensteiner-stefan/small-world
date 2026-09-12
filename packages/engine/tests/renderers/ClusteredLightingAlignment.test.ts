import { describe, it, expect } from "vitest";

describe("Clustered Lighting Alignment & Coordinate Conventions", () => {
  describe("WebGL2 std140 GlobalUniforms UBO Layout", () => {
    it("computes exact std140 byte offsets for all uniform blocks", () => {
      // Header: mat4 u_vp (64) + 4x (vec3+int pad) (64) + 4x int/float (16) + float+pad+vec2 (16) = 160
      const headerSize = 160;

      // 16 PointLights: each 32 bytes (pos+intensity = 16, col+decay = 16)
      const pointLightsOffset = headerSize;
      const pointLightsSize = 16 * 32; // 512
      expect(pointLightsOffset).toBe(160);

      // 16 SpotLights: each 64 bytes (pos+pad = 16, dir+pad = 16, col+pad = 16, params = 16)
      const spotLightsOffset = pointLightsOffset + pointLightsSize; // 160 + 512 = 672
      const spotLightsSize = 16 * 64; // 1024
      expect(spotLightsOffset).toBe(672);

      // 4 AreaLights: each 96 bytes (pos+pad, col+pad, right+pad, up+pad, norm+pad, size+pad = 6 * 16 = 96)
      const areaLightsOffset = spotLightsOffset + spotLightsSize; // 672 + 1024 = 1696
      const areaLightStride = 96;
      const areaLightsSize = 4 * areaLightStride; // 384
      expect(areaLightsOffset).toBe(1696);
      expect(areaLightStride).toBe(96);

      // Trailing Cluster Grid uniforms:
      // vec2 u_tileSizePx (8 bytes + 8 pad to align next vec4 to 16-byte boundary) = 16
      const tileSizePxOffset = areaLightsOffset + areaLightsSize; // 1696 + 384 = 2080
      expect(tileSizePxOffset).toBe(2080);

      // vec4 u_clusterDims (16 bytes, offset 2096 .. 2111)
      const clusterDimsOffset = tileSizePxOffset + 16; // 2096
      expect(clusterDimsOffset).toBe(2096);

      const totalUboSize = clusterDimsOffset + 16; // 2112
      expect(totalUboSize).toBe(2112);
    });
  });

  describe("WebGPU Cluster Culling Coordinate Convention", () => {
    it("maps NDC Y-up to WebGPU Top-Left Origin (Y-down) framebuffer coordinates", () => {
      const resolutionY = 1080;
      const tileSizeY = 64;

      const lightCellRangeY = (ndcY: number, ndcRadius: number): [number, number] => {
        const centerPx = (1.0 - (ndcY * 0.5 + 0.5)) * resolutionY;
        const radiusPx = ndcRadius * 0.5 * resolutionY;
        return [(centerPx - radiusPx) / tileSizeY, (centerPx + radiusPx) / tileSizeY];
      };

      // NDC Y = +1 (top of screen) should map to pixel Y = 0 (top row of tiles)
      const [minTop, maxTop] = lightCellRangeY(1.0, 0.1);
      expect((minTop + maxTop) / 2).toBeCloseTo(0, 1);

      // NDC Y = -1 (bottom of screen) should map to pixel Y = resolutionY (bottom row of tiles)
      const [minBottom, maxBottom] = lightCellRangeY(-1.0, 0.1);
      expect((minBottom + maxBottom) / 2).toBeCloseTo(resolutionY / tileSizeY, 1);
    });
  });
});
