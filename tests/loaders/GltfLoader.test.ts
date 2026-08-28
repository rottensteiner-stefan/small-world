import { describe, it, expect } from "vitest";
import { GltfLoader } from "../../src/loaders/GltfLoader.js";
import { StandardMaterial } from "../../src/core/materials/StandardMaterial.js";

describe("GltfLoader PBR Options", () => {
  it("should apply defaultMetallic and defaultRoughness when factors are omitted", async () => {
    const loader = new GltfLoader({
      defaultMetallic: 0.1,
      defaultRoughness: 0.8,
    });

    const mat = await (
      loader as unknown as {
        _parseMaterial: (
          m: unknown,
          json: unknown,
          folder: string,
          buffers: ArrayBuffer[],
        ) => Promise<StandardMaterial>;
      }
    )._parseMaterial({ pbrMetallicRoughness: {} }, {}, "", []);

    expect(mat.metallic).toBe(0.1);
    expect(mat.roughness).toBe(0.8);
  });

  it("should clamp metallic factor to upper bound", async () => {
    const loader = new GltfLoader({
      clampMetallic: 0.25,
    });

    const mat = await (
      loader as unknown as {
        _parseMaterial: (
          m: unknown,
          json: unknown,
          folder: string,
          buffers: ArrayBuffer[],
        ) => Promise<StandardMaterial>;
      }
    )._parseMaterial(
      { pbrMetallicRoughness: { metallicFactor: 1.0, roughnessFactor: 0.5 } },
      {},
      "",
      [],
    );

    expect(mat.metallic).toBe(0.25);
    expect(mat.roughness).toBe(0.5);
  });

  it("should clamp metallic and roughness to [min, max] range", async () => {
    const loader = new GltfLoader({
      clampMetallic: [0.1, 0.4],
      clampRoughness: [0.3, 0.7],
    });

    const matOver = await (
      loader as unknown as {
        _parseMaterial: (
          m: unknown,
          json: unknown,
          folder: string,
          buffers: ArrayBuffer[],
        ) => Promise<StandardMaterial>;
      }
    )._parseMaterial(
      { pbrMetallicRoughness: { metallicFactor: 0.9, roughnessFactor: 0.95 } },
      {},
      "",
      [],
    );

    expect(matOver.metallic).toBe(0.4);
    expect(matOver.roughness).toBe(0.7);

    const matUnder = await (
      loader as unknown as {
        _parseMaterial: (
          m: unknown,
          json: unknown,
          folder: string,
          buffers: ArrayBuffer[],
        ) => Promise<StandardMaterial>;
      }
    )._parseMaterial(
      { pbrMetallicRoughness: { metallicFactor: 0.02, roughnessFactor: 0.1 } },
      {},
      "",
      [],
    );

    expect(matUnder.metallic).toBe(0.1);
    expect(matUnder.roughness).toBe(0.3);
  });
});
