// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { GltfLoader, Object3D } from "../../src/index.js";
import * as path from "path";
import * as fs from "fs";

function traverse(obj: Object3D, fn: (child: Object3D) => void): void {
  fn(obj);
  for (const child of obj.children) {
    traverse(child, fn);
  }
}

describe("Sponza glTF Loading Benchmark", () => {
  it("successfully parses Sponza.gltf, its binary buffer and 103 mesh primitives", async () => {
    const gltfPath = path.resolve(__dirname, "../../../../showcases/29/assets/sponza/Sponza.gltf");
    const binPath = path.resolve(__dirname, "../../../../showcases/29/assets/sponza/Sponza.bin");
    expect(fs.existsSync(gltfPath)).toBe(true);
    expect(fs.existsSync(binPath)).toBe(true);

    const json = JSON.parse(
      fs.readFileSync(gltfPath, "utf-8"),
    ) as import("../../src/loaders/gltf/types.js").GltfJson;
    const binBuffer = fs.readFileSync(binPath).buffer;

    const loader = new GltfLoader();
    vi.spyOn(loader["_assetManager"], "loadImage").mockImplementation(async () => {
      return document.createElement("img");
    });

    const root = await (
      loader as unknown as {
        _parse: (
          data: {
            json: import("../../src/loaders/gltf/types.js").GltfJson;
            buffers: ArrayBuffer[];
          },
          url: string,
        ) => Promise<Object3D>;
      }
    )._parse({ json, buffers: [binBuffer] }, gltfPath);

    expect(root).toBeDefined();

    let meshCount = 0;
    traverse(root, (obj) => {
      if (obj.geometry) {
        meshCount++;
      }
    });

    expect(meshCount).toBe(103);
  });
});
