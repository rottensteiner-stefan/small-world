import { describe, it, expect } from "vitest";
import { GltfMaterialParser } from "../../../src/loaders/gltf/GltfMaterialParser.js";
import { AssetManager } from "../../../src/loaders/AssetManager.js";
import { CullMode } from "../../../src/enums/index.js";

describe("GltfMaterialParser", () => {
  it("parses PBR metallic-roughness factors and colors", async () => {
    const gltfMat = {
      pbrMetallicRoughness: {
        baseColorFactor: [1, 0, 0, 1],
        metallicFactor: 0.5,
        roughnessFactor: 0.25,
      },
      doubleSided: true,
      alphaMode: "BLEND" as const,
    };

    const mat = await GltfMaterialParser.parseMaterial(gltfMat, {}, "", [], new AssetManager());

    expect(mat.color.r).toBe(1);
    expect(mat.color.g).toBe(0);
    expect(mat.metallic).toBe(0.5);
    expect(mat.roughness).toBe(0.25);
    expect(mat.cullMode).toBe(CullMode.NONE);
    expect(mat.transparent).toBe(true);
  });

  it("applies clamp constraints to metallic and roughness", () => {
    expect(GltfMaterialParser.applyClamp(0.8, 0.5)).toBe(0.5);
    expect(GltfMaterialParser.applyClamp(0.2, [0.3, 0.7])).toBe(0.3);
    expect(GltfMaterialParser.applyClamp(0.9, [0.3, 0.7])).toBe(0.7);
    expect(GltfMaterialParser.applyClamp(0.5, [0.3, 0.7])).toBe(0.5);
  });
});
