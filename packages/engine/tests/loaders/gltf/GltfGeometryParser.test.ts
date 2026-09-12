import { describe, it, expect } from "vitest";
import { GltfGeometryParser } from "../../../src/loaders/gltf/GltfGeometryParser.js";

describe("GltfGeometryParser", () => {
  it("parses primitive attributes into GeometryDataInterface", () => {
    const pos = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
    const norm = new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]);
    const buffers = [pos.buffer, norm.buffer];

    const json = {
      bufferViews: [
        { buffer: 0, byteOffset: 0, byteLength: 36 },
        { buffer: 1, byteOffset: 0, byteLength: 36 },
      ],
      accessors: [
        { bufferView: 0, byteOffset: 0, componentType: 5126, count: 3, type: "VEC3" },
        { bufferView: 1, byteOffset: 0, componentType: 5126, count: 3, type: "VEC3" },
      ],
    };

    const primitive = {
      attributes: {
        POSITION: 0,
        NORMAL: 1,
      },
    };

    const geo = GltfGeometryParser.parseGeometry(primitive, json, buffers);
    expect(geo).toBeDefined();
    expect(geo!.vertices).toHaveLength(9);
    expect(geo!.normals).toHaveLength(9);
  });
});
