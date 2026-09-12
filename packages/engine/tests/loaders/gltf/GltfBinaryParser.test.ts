import { describe, it, expect } from "vitest";
import { GltfBinaryParser } from "../../../src/loaders/gltf/GltfBinaryParser.js";

describe("GltfBinaryParser", () => {
  it("decodes Base64 data URIs correctly", () => {
    // "Hello" in base64 is "SGVsbG8="
    const dataUri = "data:application/octet-stream;base64,SGVsbG8=";
    const buffer = GltfBinaryParser.decodeBase64(dataUri);
    const text = new TextDecoder().decode(buffer);
    expect(text).toBe("Hello");
  });

  it("calculates component counts for glTF accessor types", () => {
    expect(GltfBinaryParser.getComponentCount("SCALAR")).toBe(1);
    expect(GltfBinaryParser.getComponentCount("VEC2")).toBe(2);
    expect(GltfBinaryParser.getComponentCount("VEC3")).toBe(3);
    expect(GltfBinaryParser.getComponentCount("VEC4")).toBe(4);
    expect(GltfBinaryParser.getComponentCount("MAT4")).toBe(16);
  });

  it("extracts typed buffer data from accessors", () => {
    const rawFloats = new Float32Array([1.0, 2.0, 3.0, 4.0]);
    const buffers = [rawFloats.buffer];

    const json = {
      bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 16 }],
      accessors: [{ bufferView: 0, byteOffset: 0, componentType: 5126, count: 4, type: "SCALAR" }],
    };

    const data = GltfBinaryParser.getBufferData(json.accessors[0], json, buffers);
    expect(data).toBeInstanceOf(Float32Array);
    expect(Array.from(data as Float32Array)).toEqual([1, 2, 3, 4]);
  });
});
