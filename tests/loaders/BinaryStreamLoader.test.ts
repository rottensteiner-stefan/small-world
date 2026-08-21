import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  AssetManager,
  BinaryStreamLoader,
  GeometryWorkerProcessor,
} from "../../src/loaders/index.js";

describe("BinaryStreamLoader & DirectStorage Web Streaming", () => {
  beforeEach(() => {
    // Reset caches if any
    // @ts-expect-error accessing private static cache for testing
    AssetManager._binaryCache = new Map();
    // @ts-expect-error accessing private static cache for testing
    AssetManager._activeLoaders = new Map();
  });

  it("should stream binary chunks correctly", async () => {
    const chunk1 = new Uint8Array([1, 2, 3]);
    const chunk2 = new Uint8Array([4, 5, 6]);

    const mockStream = new ReadableStream({
      start(controller): void {
        controller.enqueue(chunk1);
        controller.enqueue(chunk2);
        controller.close();
      },
    });

    const mockResponse = {
      ok: true,
      status: 200,
      headers: {
        get: (name: string) => (name.toLowerCase() === "content-length" ? "6" : null),
      },
      body: mockStream,
    } as unknown as Response;

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));

    const receivedChunks: Uint8Array[] = [];
    const progressLog: number[] = [];

    const buffer = await BinaryStreamLoader.stream("https://example.com/asset.bin", {
      onChunk: (chunk) => receivedChunks.push(chunk),
      onProgress: (loaded, total) => progressLog.push(loaded / total),
    });

    expect(receivedChunks.length).toBe(2);
    expect(new Uint8Array(buffer)).toEqual(new Uint8Array([1, 2, 3, 4, 5, 6]));
    expect(progressLog).toContain(1.0);
  });

  it("should compute normals and tangents asynchronously in GeometryWorkerProcessor", async () => {
    // 1 Triangle in XY plane (facing +Z)
    const vertices = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
    const uvs = new Float32Array([0, 0, 1, 0, 0, 1]);

    const processed = await GeometryWorkerProcessor.processGeometryAsync({
      vertices,
      uvs,
    });

    expect(processed.normals).toBeDefined();
    expect(processed.normals?.length).toBe(9);
    // Normals should point along +Z: (0, 0, 1)
    expect(processed.normals![2]).toBeCloseTo(1.0);

    expect(processed.tangents).toBeDefined();
    expect(processed.tangents?.length).toBe(9);
    // Tangents should point along +X: (1, 0, 0)
    expect(processed.tangents![0]).toBeCloseTo(1.0);
  });
});
