import "../../src/index.js";
import { describe, expect, it, vi } from "vitest";
import { HzbOcclusionPassGPU } from "../../src/renderers/passes/HzbOcclusionPassGPU.js";
import { WebGPURenderer } from "../../src/renderers/WebGPU/WebGPURenderer.js";
import { Object3D } from "../../src/core/Object3D.js";
import { Scene } from "../../src/core/Scene.js";
import { FrustumCuller } from "../../src/core/FrustumCuller.js";
import { BoundingSphere } from "../../src/physix/index.js";
import { Vector3D } from "../../src/math/index.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RendererInternals = any;

function makeMockComputePass(): {
  setPipeline: ReturnType<typeof vi.fn>;
  setBindGroup: ReturnType<typeof vi.fn>;
  dispatchWorkgroups: ReturnType<typeof vi.fn>;
  end: ReturnType<typeof vi.fn>;
} {
  return {
    setPipeline: vi.fn(),
    setBindGroup: vi.fn(),
    dispatchWorkgroups: vi.fn(),
    end: vi.fn(),
  };
}

function makeMockCommandEncoder(): {
  ce: {
    beginComputePass: ReturnType<typeof vi.fn>;
    copyBufferToBuffer: ReturnType<typeof vi.fn>;
  };
  computePasses: ReturnType<typeof makeMockComputePass>[];
} {
  const computePasses: ReturnType<typeof makeMockComputePass>[] = [];
  const ce = {
    beginComputePass: vi.fn(() => {
      const p = makeMockComputePass();
      computePasses.push(p);
      return p;
    }),
    copyBufferToBuffer: vi.fn(),
  };
  return { ce, computePasses };
}

function makeMockDevice(): { device: unknown; createTexture: ReturnType<typeof vi.fn> } {
  const createTexture = vi.fn(() => ({
    createView: vi.fn(() => ({ id: "view" })),
    destroy: vi.fn(),
  }));
  const device = {
    createTexture,
    createBindGroup: vi.fn((desc: unknown) => ({ desc })),
    queue: { writeBuffer: vi.fn() },
  };
  return { device, createTexture };
}

function makeObjectWithBounds(x: number, y: number, z: number, radius: number): Object3D {
  const obj = new Object3D(`obj_${x}_${y}_${z}`);
  obj.bounds = new BoundingSphere(new Vector3D(x, y, z), radius);
  return obj;
}

describe("HzbOcclusionPassGPU", () => {
  it("builds the pyramid before dispatching the visibility test", () => {
    const pass = new HzbOcclusionPassGPU();
    const calls: string[] = [];
    const renderer: RendererInternals = {
      _buildHzbPyramid: vi.fn(() => calls.push("build")),
      _dispatchHzbTest: vi.fn(() => calls.push("test")),
    };

    pass.execute(
      renderer,
      new Scene(),
      {} as unknown as GPUCommandEncoder,
      undefined as unknown as GPUTextureView,
      new Float32Array(16),
      Vector3D.ZERO,
      undefined,
    );

    expect(calls).toEqual(["build", "test"]);
  });
});

describe("WebGPURenderer._buildHzbPyramid", () => {
  it("dispatches one copy pass plus one downsample pass per additional mip level", () => {
    const { device } = makeMockDevice();
    const renderer = new WebGPURenderer() as RendererInternals;
    renderer._device = device;
    renderer._context = { canvas: { width: 64, height: 64 } };
    renderer._activeRenderTarget = null;
    renderer._hzbTexture = { createView: vi.fn(() => ({ id: "mipView" })) };
    renderer._hzbMipLevelCount = 4;
    renderer._hzbCopyPipeline = { id: "copyPipeline" };
    renderer._hzbCopyBGL = { id: "copyBGL" };
    renderer._hzbDownsamplePipeline = { id: "downsamplePipeline" };
    renderer._hzbDownsampleBGL = { id: "downsampleBGL" };
    Object.defineProperty(renderer, "activeDepthView", { get: () => ({ id: "depthView" }) });

    const { ce, computePasses } = makeMockCommandEncoder();
    renderer._buildHzbPyramid(ce as unknown as GPUCommandEncoder);

    // 1 copy (mip 0) + 3 downsamples (mips 1, 2, 3) for a 4-level chain.
    expect(computePasses).toHaveLength(4);
    expect(computePasses[0]!.setPipeline).toHaveBeenCalledWith(renderer._hzbCopyPipeline);
    expect(computePasses[1]!.setPipeline).toHaveBeenCalledWith(renderer._hzbDownsamplePipeline);
    expect(computePasses[3]!.setPipeline).toHaveBeenCalledWith(renderer._hzbDownsamplePipeline);
    for (const p of computePasses) expect(p.end).toHaveBeenCalledTimes(1);
  });

  it("does nothing for an offscreen render target", () => {
    const { device } = makeMockDevice();
    const renderer = new WebGPURenderer() as RendererInternals;
    renderer._device = device;
    renderer._activeRenderTarget = { id: "someRenderTarget" };
    renderer._hzbTexture = { createView: vi.fn() };
    renderer._hzbCopyPipeline = { id: "copyPipeline" };
    renderer._hzbCopyBGL = { id: "copyBGL" };

    const { ce, computePasses } = makeMockCommandEncoder();
    renderer._buildHzbPyramid(ce as unknown as GPUCommandEncoder);

    expect(computePasses).toHaveLength(0);
  });
});

describe("WebGPURenderer._dispatchHzbTest", () => {
  function makeReadyRenderer(): { renderer: RendererInternals; device: unknown } {
    const { device } = makeMockDevice();
    const renderer = new WebGPURenderer() as RendererInternals;
    renderer._device = device;
    renderer._activeRenderTarget = null;
    renderer._hzbTestPipeline = { id: "testPipeline" };
    renderer._hzbTestBGL = { id: "testBGL" };
    renderer._hzbAabbBuffer = { id: "aabbBuffer" };
    renderer._hzbResultsBuffer = { id: "resultsBuffer" };
    renderer._hzbTestParamsBuffer = { id: "paramsBuffer" };
    renderer._hzbSampledView = { id: "sampledView" };
    renderer._hzbMipLevelCount = 5;
    renderer._globalBindGroup = { id: "globalBindGroup" };
    renderer._hzbStagingBuffers = [{ id: "staging0" }, { id: "staging1" }];
    renderer._hzbStagingSlot = 0;
    renderer._hzbStagingPending = [false, false];
    renderer._hzbSlotObjects = [[], []];
    return { renderer, device };
  }

  it("packs bounding-sphere AABBs for objects with bounds and skips those without", () => {
    const { renderer, device } = makeReadyRenderer();
    FrustumCuller.lastVisibleObjects = [
      makeObjectWithBounds(1, 2, 3, 0.5),
      new Object3D("NoBounds"), // bounds left undefined -- must be skipped, not crash
      makeObjectWithBounds(-4, 0, 7, 2.5),
    ];

    const { ce } = makeMockCommandEncoder();
    renderer._dispatchHzbTest(ce as unknown as GPUCommandEncoder);

    const writeCalls = (device as { queue: { writeBuffer: ReturnType<typeof vi.fn> } }).queue
      .writeBuffer.mock.calls;
    const aabbWrite = writeCalls.find((c: unknown[]) => c[0] === renderer._hzbAabbBuffer);
    expect(aabbWrite).toBeDefined();
    const data = aabbWrite![2] as Float32Array;
    expect(Array.from(data.slice(0, 4))).toEqual([1, 2, 3, 0.5]);
    expect(Array.from(data.slice(4, 8))).toEqual([-4, 0, 7, 2.5]);

    const paramsWrite = writeCalls.find((c: unknown[]) => c[0] === renderer._hzbTestParamsBuffer);
    expect(paramsWrite).toBeDefined();
    expect((paramsWrite![2] as Uint32Array)[0]).toBe(2); // objectCount: only the 2 with bounds
    expect((paramsWrite![2] as Uint32Array)[1]).toBe(5); // mipCount

    expect(ce.copyBufferToBuffer).toHaveBeenCalledWith(
      renderer._hzbResultsBuffer,
      0,
      renderer._hzbStagingBuffers[0],
      0,
      2 * 4,
    );
    expect(renderer._hzbSlotObjects[0]).toHaveLength(2);
    expect(renderer._hzbCopyRecordedThisFrame).toBe(true);
  });

  it("skips entirely when the current staging slot is still pending a previous mapAsync", () => {
    const { renderer } = makeReadyRenderer();
    renderer._hzbStagingPending = [true, false];
    FrustumCuller.lastVisibleObjects = [makeObjectWithBounds(0, 0, 0, 1)];

    const { ce, computePasses } = makeMockCommandEncoder();
    renderer._dispatchHzbTest(ce as unknown as GPUCommandEncoder);

    expect(computePasses).toHaveLength(0);
    expect(ce.copyBufferToBuffer).not.toHaveBeenCalled();
  });

  it("does nothing when there are no bounded candidates", () => {
    const { renderer } = makeReadyRenderer();
    FrustumCuller.lastVisibleObjects = [new Object3D("NoBounds")];

    const { ce, computePasses } = makeMockCommandEncoder();
    renderer._dispatchHzbTest(ce as unknown as GPUCommandEncoder);

    expect(computePasses).toHaveLength(0);
  });
});

describe("WebGPURenderer.applyPendingOcclusionResults", () => {
  it("zips a resolved staging buffer's u32 flags onto the dispatched objects and unmaps", () => {
    const renderer = new WebGPURenderer() as RendererInternals;
    renderer._occlusionCullingEnabled = true;
    renderer._hzbResultsReady = true;
    renderer._hzbReadySlot = 0;

    const raw = new Uint32Array([1, 0, 1]).buffer;
    const unmap = vi.fn();
    renderer._hzbStagingBuffers = [
      { getMappedRange: vi.fn(() => raw), unmap },
      { getMappedRange: vi.fn(), unmap: vi.fn() },
    ];
    const [objA, objB, objC] = [
      makeObjectWithBounds(0, 0, 0, 1),
      makeObjectWithBounds(1, 0, 0, 1),
      makeObjectWithBounds(2, 0, 0, 1),
    ];
    renderer._hzbSlotObjects = [[objA, objB, objC], []];
    renderer._hzbStagingPending = [true, false];

    renderer.applyPendingOcclusionResults(new Scene());

    expect(objA.occlusionCulled).toBe(false); // 1 = visible
    expect(objB.occlusionCulled).toBe(true); // 0 = occluded
    expect(objC.occlusionCulled).toBe(false);
    expect(unmap).toHaveBeenCalledTimes(1);
    expect(renderer._hzbStagingPending[0]).toBe(false);
    expect(renderer._hzbResultsReady).toBe(false);
    expect(renderer._hzbReadySlot).toBeUndefined();
  });

  it("does nothing when no results are ready", () => {
    const renderer = new WebGPURenderer() as RendererInternals;
    renderer._occlusionCullingEnabled = true;
    renderer._hzbResultsReady = false;

    // Should not throw even with no staging buffers configured.
    expect(() => renderer.applyPendingOcclusionResults(new Scene())).not.toThrow();
  });

  it("does nothing when occlusion culling isn't enabled", () => {
    const renderer = new WebGPURenderer() as RendererInternals;
    renderer._occlusionCullingEnabled = false;
    renderer._hzbResultsReady = true;
    renderer._hzbReadySlot = 0;
    const unmap = vi.fn();
    renderer._hzbStagingBuffers = [{ getMappedRange: vi.fn(), unmap }, {}];
    renderer._hzbSlotObjects = [[], []];

    renderer.applyPendingOcclusionResults(new Scene());

    expect(unmap).not.toHaveBeenCalled();
  });
});
