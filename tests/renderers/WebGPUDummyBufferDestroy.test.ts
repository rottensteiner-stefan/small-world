import "../../src/index.js";
import { describe, expect, it, vi } from "vitest";
import { WebGPURenderer } from "../../src/renderers/WebGPU/WebGPURenderer.js";

// Node/vitest has no WebGPU global; @webgpu/types only provides ambient TS types,
// not a runtime value. Stub the bit-flag constants this renderer actually reads.
(globalThis as unknown as { GPUBufferUsage: Record<string, number> }).GPUBufferUsage ??= {
  MAP_READ: 0x0001,
  MAP_WRITE: 0x0002,
  COPY_SRC: 0x0004,
  COPY_DST: 0x0008,
  INDEX: 0x0010,
  VERTEX: 0x0020,
  UNIFORM: 0x0040,
  STORAGE: 0x0080,
  INDIRECT: 0x0100,
  QUERY_RESOLVE: 0x0200,
};
(globalThis as unknown as { GPUTextureUsage: Record<string, number> }).GPUTextureUsage ??= {
  COPY_SRC: 0x01,
  COPY_DST: 0x02,
  TEXTURE_BINDING: 0x04,
  STORAGE_BINDING: 0x08,
  RENDER_ATTACHMENT: 0x10,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RendererInternals = any;

function makeMockDevice(): GPUDevice {
  return {
    createBuffer: vi.fn(() => ({ destroy: vi.fn() })),
    createTexture: vi.fn(() => ({ createView: vi.fn(() => ({})) })),
    createSampler: vi.fn(() => ({})),
    queue: { writeBuffer: vi.fn() },
  } as unknown as GPUDevice;
}

function makeRenderer(): RendererInternals {
  const device = makeMockDevice();
  const renderer = new WebGPURenderer() as RendererInternals;
  renderer._device = device;
  return renderer;
}

describe("WebGPU dummy vertex buffer growth defers destruction past the current frame", () => {
  it("the very first call (no existing buffers) destroys nothing and doesn't throw", () => {
    const renderer = makeRenderer();
    expect(() => renderer._ensureDummyBufferSize(10)).not.toThrow();
    expect(renderer._dummyBuffersPendingDestroy).toEqual([]);
  });

  it("growth queues the old buffers for deferred destroy instead of destroying immediately", () => {
    const renderer = makeRenderer();
    renderer._ensureDummyBufferSize(10);
    const firstNormalBuffer = renderer._dummyNormalBuffer;
    const firstUvBuffer = renderer._dummyUvBuffer;
    const firstTangentBuffer = renderer._dummyTangentBuffer;
    const firstJointsBuffer = renderer._dummyJointsBuffer;
    const firstWeightsBuffer = renderer._dummyWeightsBuffer;

    renderer._ensureDummyBufferSize(10000); // forces growth

    expect(firstNormalBuffer.destroy).not.toHaveBeenCalled();
    expect(firstUvBuffer.destroy).not.toHaveBeenCalled();
    expect(firstTangentBuffer.destroy).not.toHaveBeenCalled();
    expect(firstJointsBuffer.destroy).not.toHaveBeenCalled();
    expect(firstWeightsBuffer.destroy).not.toHaveBeenCalled();
    expect(renderer._dummyBuffersPendingDestroy).toEqual([
      firstNormalBuffer,
      firstUvBuffer,
      firstTangentBuffer,
      firstJointsBuffer,
      firstWeightsBuffer,
    ]);
    // The renderer must keep using the NEW buffers going forward.
    expect(renderer._dummyNormalBuffer).not.toBe(firstNormalBuffer);
  });

  it("the pending buffers are only destroyed once drained (simulating render()'s post-submit cleanup)", () => {
    const renderer = makeRenderer();
    renderer._ensureDummyBufferSize(10);
    const firstNormalBuffer = renderer._dummyNormalBuffer;
    renderer._ensureDummyBufferSize(10000);

    // Mirrors the drain step added to render() right after queue.submit().
    for (const b of renderer._dummyBuffersPendingDestroy) b.destroy();
    renderer._dummyBuffersPendingDestroy.length = 0;

    expect(firstNormalBuffer.destroy).toHaveBeenCalledTimes(1);
    expect(renderer._dummyBuffersPendingDestroy).toEqual([]);
  });
});
