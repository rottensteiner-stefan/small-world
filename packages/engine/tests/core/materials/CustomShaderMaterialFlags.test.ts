import { describe, it, expect } from "vitest";
import { CustomShaderMaterial, Texture } from "../../../src/index.js";

function makeMaterial(): CustomShaderMaterial {
  return new CustomShaderMaterial({
    sources: { wgsl: "fn test() {}" },
    layout: { uniforms: {}, textures: {} },
  });
}

describe("CustomShaderMaterial compile flags", () => {
  it("derives USE_*_MAP flags from the assigned textures", () => {
    const mat = makeMaterial();
    mat.setTexture("u_emissiveMap", Texture.empty());
    mat.setTexture("u_normalMap", Texture.empty());
    mat.setTexture("u_aoMap", undefined);
    expect(mat.getRenderManifest().flags).toEqual(["USE_EMISSIVE_MAP", "USE_NORMAL_MAP"]);
  });

  it("keeps the flags array reference stable across frames and tracks texture changes in place", () => {
    const mat = makeMaterial();
    mat.setTexture("u_emissiveMap", Texture.empty());
    const first = mat.getRenderManifest().flags;
    expect(mat.getRenderManifest().flags).toBe(first);

    mat.setTexture("u_emissiveMap", undefined);
    const second = mat.getRenderManifest();
    expect(second.flags).toBe(first);
    expect(second.flags).toEqual([]);
  });
});
