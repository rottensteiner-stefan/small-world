import { describe, it, expect } from "vitest";
import {
  computeClusterCounts,
  zSliceFromViewDepth,
  clusterIndex,
  lightClusterCoverage,
} from "../../src/index.js";

describe("ClusterGrid", () => {
  describe("computeClusterCounts", () => {
    it("divides the screen into tiles, rounding up partial tiles", () => {
      const dims = computeClusterCounts(1920, 1080, [16, 16], 24);
      expect(dims.x).toBe(Math.ceil(1920 / 16));
      expect(dims.y).toBe(Math.ceil(1080 / 16));
      expect(dims.z).toBe(24);
    });

    it("never returns fewer than one cell per axis", () => {
      const dims = computeClusterCounts(1, 1, [16, 16], 0);
      expect(dims.x).toBe(1);
      expect(dims.y).toBe(1);
      expect(dims.z).toBe(1);
    });
  });

  describe("zSliceFromViewDepth", () => {
    const near = 0.1;
    const far = 1000;
    const numSlices = 24;

    it("maps the near plane to slice 0", () => {
      expect(zSliceFromViewDepth(near, near, far, numSlices)).toBe(0);
    });

    it("maps the far plane to the last slice", () => {
      expect(zSliceFromViewDepth(far, near, far, numSlices)).toBe(numSlices - 1);
    });

    it("clamps depths outside [near, far]", () => {
      expect(zSliceFromViewDepth(near / 2, near, far, numSlices)).toBe(0);
      expect(zSliceFromViewDepth(far * 2, near, far, numSlices)).toBe(numSlices - 1);
    });

    it("is monotonically non-decreasing with depth", () => {
      let prev = -1;
      for (let i = 0; i <= 100; i++) {
        const viewZ = near + ((far - near) * i) / 100;
        const slice = zSliceFromViewDepth(viewZ, near, far, numSlices);
        expect(slice).toBeGreaterThanOrEqual(prev);
        prev = slice;
      }
    });
  });

  describe("lightClusterCoverage", () => {
    const dims = { x: 20, y: 12, z: 24 };
    const tileSize: [number, number] = [16, 16];
    const near = 0.1;
    const far = 1000;
    const screenWidth = dims.x * tileSize[0];
    const screenHeight = dims.y * tileSize[1];

    it("covers a small range around dead-center for a small light straight ahead", () => {
      const coverage = lightClusterCoverage(
        50, // viewDist
        1, // radius
        0,
        0, // ndc center
        1, // clipW
        1,
        1, // projScale
        screenWidth,
        screenHeight,
        tileSize,
        dims,
        near,
        far,
      );
      const midX = Math.floor(dims.x / 2);
      const midY = Math.floor(dims.y / 2);
      expect(coverage.cellMinX).toBeLessThanOrEqual(midX);
      expect(coverage.cellMaxX).toBeGreaterThanOrEqual(midX - 1);
      expect(coverage.cellMinY).toBeLessThanOrEqual(midY);
      expect(coverage.cellMaxY).toBeGreaterThanOrEqual(midY - 1);
      expect(coverage.cellMaxX - coverage.cellMinX).toBeLessThan(dims.x - 1);
    });

    it("covers the whole X/Y grid when the camera is inside the light's sphere", () => {
      const coverage = lightClusterCoverage(
        1,
        5,
        0,
        0,
        1,
        1,
        1,
        screenWidth,
        screenHeight,
        tileSize,
        dims,
        near,
        far,
      );
      expect(coverage).toMatchObject({
        cellMinX: 0,
        cellMaxX: dims.x - 1,
        cellMinY: 0,
        cellMaxY: dims.y - 1,
      });
    });

    it("covers the whole X/Y grid when the light center is behind the camera (clipW <= 0)", () => {
      const coverage = lightClusterCoverage(
        50,
        1,
        0,
        0,
        -1,
        1,
        1,
        screenWidth,
        screenHeight,
        tileSize,
        dims,
        near,
        far,
      );
      expect(coverage).toMatchObject({
        cellMinX: 0,
        cellMaxX: dims.x - 1,
        cellMinY: 0,
        cellMaxY: dims.y - 1,
      });
    });

    it("clamps the Z range to [0, numSlices - 1] and keeps sliceMin <= sliceMax", () => {
      const coverage = lightClusterCoverage(
        5,
        1000,
        0,
        0,
        1,
        1,
        1,
        screenWidth,
        screenHeight,
        tileSize,
        dims,
        near,
        far,
      );
      expect(coverage.sliceMin).toBe(0);
      expect(coverage.sliceMax).toBe(dims.z - 1);
    });

    it("grows the X/Y cell range with a larger radius at the same distance", () => {
      const small = lightClusterCoverage(
        50,
        1,
        0,
        0,
        1,
        1,
        1,
        screenWidth,
        screenHeight,
        tileSize,
        dims,
        near,
        far,
      );
      const large = lightClusterCoverage(
        50,
        10,
        0,
        0,
        1,
        1,
        1,
        screenWidth,
        screenHeight,
        tileSize,
        dims,
        near,
        far,
      );
      expect(large.cellMaxX - large.cellMinX).toBeGreaterThanOrEqual(
        small.cellMaxX - small.cellMinX,
      );
      expect(large.cellMaxY - large.cellMinY).toBeGreaterThanOrEqual(
        small.cellMaxY - small.cellMinY,
      );
    });
  });

  describe("clusterIndex", () => {
    it("flattens X-major, then Y, then Z", () => {
      const dims = { x: 4, y: 3, z: 2 };
      expect(clusterIndex(0, 0, 0, dims)).toBe(0);
      expect(clusterIndex(1, 0, 0, dims)).toBe(1);
      expect(clusterIndex(0, 1, 0, dims)).toBe(4);
      expect(clusterIndex(0, 0, 1, dims)).toBe(12);
      expect(clusterIndex(3, 2, 1, dims)).toBe(4 * 3 * 2 - 1);
    });
  });
});
