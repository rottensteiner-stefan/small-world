import { describe, it, expect } from "vitest";
import { getGltfExtensions } from "@small-world/engine";
import "../src/register.js";

describe("@small-world/gltf-extensions register", () => {
  it("registers both KHR_draco_mesh_compression and KHR_texture_basisu in the global engine registry", () => {
    const extensions = getGltfExtensions();
    const names = extensions.map((ext) => ext.name);

    expect(names).toContain("KHR_draco_mesh_compression");
    expect(names).toContain("KHR_texture_basisu");
  });
});
