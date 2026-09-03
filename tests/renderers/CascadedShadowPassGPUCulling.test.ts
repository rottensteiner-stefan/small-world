import "../../src/index.js";
import { describe, expect, it, vi } from "vitest";
import { CascadedShadowPassGPU } from "../../src/renderers/passes/CascadedShadowPassGPU.js";
import { Object3D } from "../../src/core/Object3D.js";
import { Matrix4, Vector3D } from "../../src/math/index.js";
import { BoundingSphere } from "../../src/physix/index.js";

// Node/vitest has no WebGPU global; @webgpu/types only provides ambient TS types,
// not a runtime value. Stub the bit-flag constants this pass actually reads.
(globalThis as unknown as { GPUTextureUsage: Record<string, number> }).GPUTextureUsage ??= {
  COPY_SRC: 0x01,
  COPY_DST: 0x02,
  TEXTURE_BINDING: 0x04,
  STORAGE_BINDING: 0x08,
  RENDER_ATTACHMENT: 0x10,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Internals = any;

function makeCaster(name: string, bounds: BoundingSphere | undefined): Object3D {
  const obj = new Object3D(name);
  obj.castShadow = true;
  obj.bounds = bounds;
  return obj;
}

function makeMockRenderer(objects: Object3D[]): Internals {
  const scratchGlobalBufferData = new Float32Array(212);
  const device = {
    createTexture: vi.fn(() => ({ createView: vi.fn(() => ({})) })),
    queue: { writeBuffer: vi.fn() },
  };
  // Identity view-projection -> NDC clip space equals world space, so the cascade frustum is
  // exactly the unit cube [-1, 1]^3 -- a small, fully predictable volume to test culling against.
  const identityVp = new Matrix4().data;
  const dLight: Internals = {
    castShadow: true,
    numCascades: 1,
    shadowResolution: 256,
    cascadeCameras: [{ viewProjectionMatrix: identityVp, viewMatrix: identityVp }],
    cascadeSplits: [1.0],
    shadowBias: 0.001,
    shadowNormalBias: 0.002,
  };

  return {
    extractLights: vi.fn(() => ({ dLight })),
    gpuDevice: device,
    postProcessing: { enabled: false },
    gpuFormat: "rgba8unorm",
    shadowMaps: new Map(),
    defaultDirShadowTextureView: {},
    dummyDirShadowTextureView: {},
    defaultSpotShadowTextureView: {},
    dummySpotShadowTextureView: {},
    _createGlobalBindGroup: vi.fn(() => ({})),
    _setViewMatrix: vi.fn(() => 0),
    _renderSubgroup: vi.fn(),
    scratchGlobalBufferData,
    globalUniformBuffer: {},
    globalBindGroup: undefined,
    __objects: objects,
  };
}

function makeMockScene(objects: Object3D[]): Internals {
  return {
    getVisibleObjectsSorted: vi.fn(() => ({
      opaqueBatches: [{ shaderId: "test-batch", objects, topology: undefined }],
    })),
  };
}

describe("CascadedShadowPassGPU: per-cascade frustum culling", () => {
  it("includes a caster whose bounds are inside the cascade frustum", () => {
    const inside = makeCaster("inside", new BoundingSphere(new Vector3D(0, 0, 0), 0.1));
    const renderer = makeMockRenderer([inside]);
    const scene = makeMockScene([inside]);
    const ce = { beginRenderPass: vi.fn(() => ({ setBindGroup: vi.fn(), end: vi.fn() })) };

    const pass = new CascadedShadowPassGPU() as Internals;
    pass.execute(renderer, scene, ce, {}, new Float32Array(16), new Vector3D(0, 0, 0));

    expect(renderer._renderSubgroup).toHaveBeenCalledTimes(1);
    const [, objects] = (renderer._renderSubgroup as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(objects).toEqual([inside]);
  });

  it("excludes a caster whose bounds are far outside the cascade frustum", () => {
    const outside = makeCaster("outside", new BoundingSphere(new Vector3D(1000, 1000, 1000), 1));
    const renderer = makeMockRenderer([outside]);
    const scene = makeMockScene([outside]);
    const ce = { beginRenderPass: vi.fn(() => ({ setBindGroup: vi.fn(), end: vi.fn() })) };

    const pass = new CascadedShadowPassGPU() as Internals;
    pass.execute(renderer, scene, ce, {}, new Float32Array(16), new Vector3D(0, 0, 0));

    expect(renderer._renderSubgroup).not.toHaveBeenCalled();
  });

  it("selects only the in-frustum caster out of a mixed batch", () => {
    const inside = makeCaster("inside", new BoundingSphere(new Vector3D(0, 0, 0), 0.1));
    const outside = makeCaster("outside", new BoundingSphere(new Vector3D(1000, 0, 0), 1));
    const renderer = makeMockRenderer([inside, outside]);
    const scene = makeMockScene([inside, outside]);
    const ce = { beginRenderPass: vi.fn(() => ({ setBindGroup: vi.fn(), end: vi.fn() })) };

    const pass = new CascadedShadowPassGPU() as Internals;
    pass.execute(renderer, scene, ce, {}, new Float32Array(16), new Vector3D(0, 0, 0));

    expect(renderer._renderSubgroup).toHaveBeenCalledTimes(1);
    const [, objects] = (renderer._renderSubgroup as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(objects).toEqual([inside]);
  });

  it("still includes a caster with no bounds at all (fail-open, matches SpotShadowPassGPU)", () => {
    const noBounds = makeCaster("no-bounds", undefined);
    const renderer = makeMockRenderer([noBounds]);
    const scene = makeMockScene([noBounds]);
    const ce = { beginRenderPass: vi.fn(() => ({ setBindGroup: vi.fn(), end: vi.fn() })) };

    const pass = new CascadedShadowPassGPU() as Internals;
    pass.execute(renderer, scene, ce, {}, new Float32Array(16), new Vector3D(0, 0, 0));

    expect(renderer._renderSubgroup).toHaveBeenCalledTimes(1);
    const [, objects] = (renderer._renderSubgroup as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(objects).toEqual([noBounds]);
  });

  it("uploads only the cascadeMatrices/cascadeSplits/dirShadowInfo slice, not the whole 848-byte GlobalUniforms buffer", () => {
    const inside = makeCaster("inside", new BoundingSphere(new Vector3D(0, 0, 0), 0.1));
    const renderer = makeMockRenderer([inside]);
    const scene = makeMockScene([inside]);
    const ce = { beginRenderPass: vi.fn(() => ({ setBindGroup: vi.fn(), end: vi.fn() })) };

    const pass = new CascadedShadowPassGPU() as Internals;
    pass.execute(renderer, scene, ce, {}, new Float32Array(16), new Vector3D(0, 0, 0));

    const writeBuffer = renderer.gpuDevice.queue.writeBuffer as ReturnType<typeof vi.fn>;
    expect(writeBuffer).toHaveBeenCalledTimes(1);
    const [buffer, byteOffset, data, dataOffset, size] = writeBuffer.mock.calls[0]!;
    expect(buffer).toBe(renderer.globalUniformBuffer);
    expect(byteOffset).toBe(128 * 4); // cascadeMatrices starts at float 128
    expect(data).toBe(renderer.scratchGlobalBufferData);
    expect(dataOffset).toBe(128);
    expect(size).toBe(72); // cascadeMatrices(64) + cascadeSplits(4) + dirShadowInfo(4)
  });
});
