import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { BasisWasmTranscoder } from "../src/basisu/BasisWasmTranscoder.js";

const vendorDir = fileURLToPath(new URL("../vendor/basis/", import.meta.url));
const fixtureDir = fileURLToPath(new URL("./fixtures/ktx2/", import.meta.url));

function asArrayBuffer(source: Uint8Array<ArrayBufferLike>): ArrayBuffer {
  return source.buffer.slice(
    source.byteOffset,
    source.byteOffset + source.byteLength,
  ) as ArrayBuffer;
}

function loadFixtureExplicitWasm(name: string): { ktx2: Uint8Array; wasmBinary: ArrayBuffer } {
  const buffer = readFileSync(fixtureDir + name);
  const wasmBinary = asArrayBuffer(readFileSync(vendorDir + "basis_transcoder.wasm"));
  return { ktx2: new Uint8Array(buffer), wasmBinary };
}

describe("BasisWasmTranscoder", () => {
  it("transcodes a real ETC1S KTX2 payload to RGBA8 planes", async () => {
    const { ktx2, wasmBinary } = loadFixtureExplicitWasm("2d_etc1s.ktx2");

    const result = await BasisWasmTranscoder.transcode(ktx2, { wasmBinary });

    expect(result.width).toBe(40);
    expect(result.height).toBe(40);
    // 6 mip levels, single layer/face for a plain 2D texture.
    expect(result.images).toHaveLength(6);
    expect(result.images[0]!.width).toBe(40);
    expect(result.images[0]!.height).toBe(40);

    // Every plane has non-zero pixel data (4 bytes per texel).
    for (const plane of result.images) {
      expect(plane.rgba.length).toBe(plane.width * plane.height * 4);
      let sum = 0;
      for (let i = 0; i < plane.rgba.length; i++) sum += plane.rgba[i]!;
      expect(sum).toBeGreaterThan(0);
    }
  });

  it("rejects a buffer that is not a valid KTX2 file", async () => {
    const wasmBinary = asArrayBuffer(readFileSync(vendorDir + "basis_transcoder.wasm"));
    const garbage = new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05]);

    await expect(BasisWasmTranscoder.transcode(garbage, { wasmBinary })).rejects.toThrow(
      "Invalid or unsupported .ktx2",
    );
  });
});
