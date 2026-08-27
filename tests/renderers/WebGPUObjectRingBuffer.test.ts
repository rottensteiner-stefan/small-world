import "../../src/index.js";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { WebGPURenderer } from "../../src/renderers/WebGPU/WebGPURenderer.js";
import { Object3D } from "../../src/core/Object3D.js";
import { ShaderRegistry } from "../../src/core/renderers/shaders/ShaderRegistry.js";
import { RenderManifest } from "../../src/core/renderers/shaders/RenderManifest.js";
import { ShaderPropertyType } from "../../src/enums/index.js";

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

function makeMockDevice(): GPUDevice {
  let bufferId = 0;
  return {
    createBuffer: vi.fn(() => ({
      id: bufferId++,
      destroy: vi.fn(),
    })),
    createBindGroup: vi.fn((desc: unknown) => ({ desc })),
    queue: { writeBuffer: vi.fn() },
  } as unknown as GPUDevice;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RendererInternals = any;

const SHADER_ID = "test/ring-buffer-shader";

function registerTestShader(): void {
  ShaderRegistry.instance.register({
    id: SHADER_ID,
    sources: {},
    layout: {
      uniforms: { u_model: { type: ShaderPropertyType.MAT4 } },
      uniformLayout: ["u_model"],
      textures: {},
    },
  });
}

function makeManifest(overrides?: Partial<RenderManifest>): RenderManifest {
  return {
    shaderId: SHADER_ID,
    properties: {},
    textures: {},
    ...overrides,
  };
}

function makeRenderer(): { renderer: RendererInternals; device: GPUDevice } {
  const device = makeMockDevice();
  const renderer = new WebGPURenderer() as RendererInternals;
  renderer._device = device;
  renderer._objectBGL = { mock: "objectBGL" };
  renderer._ensureObjectRingCapacity(1024);
  return { renderer, device };
}

describe("WebGPU object uniform ring buffer", () => {
  beforeEach(() => registerTestShader());

  it("writes once and binds at offset 0 for a single object", () => {
    const { renderer, device } = makeRenderer();
    const obj = new Object3D("A");

    const offset = renderer._getObjectSlotOffset(obj, makeManifest(), "matA");

    expect(offset).toBe(0);
    expect(device.queue.writeBuffer).toHaveBeenCalledTimes(1);
  });

  it("dedupes the same object+material across multiple calls in one frame (e.g. CSM cascades sharing one DepthMaterial)", () => {
    const { renderer, device } = makeRenderer();
    const obj = new Object3D("Caster");
    const manifest = makeManifest();

    const offset1 = renderer._getObjectSlotOffset(obj, manifest, "depthMatUuid");
    const offset2 = renderer._getObjectSlotOffset(obj, manifest, "depthMatUuid");
    const offset3 = renderer._getObjectSlotOffset(obj, manifest, "depthMatUuid");

    expect(offset1).toBe(offset2);
    expect(offset2).toBe(offset3);
    expect(device.queue.writeBuffer).toHaveBeenCalledTimes(1);
  });

  it("does NOT dedupe the same object across different materials (main pass vs. shadow pass)", () => {
    const { renderer, device } = makeRenderer();
    const obj = new Object3D("Caster");
    const manifest = makeManifest();

    const shadowOffset = renderer._getObjectSlotOffset(obj, manifest, "depthMatUuid");
    const mainOffset = renderer._getObjectSlotOffset(obj, manifest, "standardMatUuid");

    expect(mainOffset).not.toBe(shadowOffset);
    expect(device.queue.writeBuffer).toHaveBeenCalledTimes(2);
  });

  it("never dedupes sprites, since their model matrix is billboarded per-pass view matrix", () => {
    const { renderer, device } = makeRenderer();
    const obj = new Object3D("Billboard");
    const manifest = makeManifest({ state: { isSprite: true } });
    const camVMat = new Float32Array(16);
    const lightVMat = new Float32Array(16).fill(1);

    const camOffset = renderer._getObjectSlotOffset(obj, manifest, "spriteMatUuid", camVMat);
    const lightOffset = renderer._getObjectSlotOffset(obj, manifest, "spriteMatUuid", lightVMat);

    expect(camOffset).not.toBe(lightOffset);
    expect(device.queue.writeBuffer).toHaveBeenCalledTimes(2);
  });

  it("returns offsets aligned to the object uniform stride", () => {
    const { renderer } = makeRenderer();
    const offsets = [0, 1, 2].map((i) =>
      renderer._getObjectSlotOffset(new Object3D(`O${i}`), makeManifest(), `mat${i}`),
    );

    for (const offset of offsets) {
      expect(offset % renderer._objectUniformStride).toBe(0);
    }
    expect(new Set(offsets).size).toBe(3);
  });

  it("grows the ring buffer (new GPUBuffer + bind group) instead of shrinking or reusing capacity", () => {
    const { renderer, device } = makeRenderer();
    expect(renderer._objectRingCapacity).toBe(1024);

    const bufferBefore = renderer._objectRingBuffer;
    renderer._ensureObjectRingCapacity(2048);

    expect(renderer._objectRingCapacity).toBeGreaterThanOrEqual(2048);
    expect(renderer._objectRingBuffer).not.toBe(bufferBefore);
    expect(device.createBuffer).toHaveBeenCalledTimes(2);
    // Old buffer is kept alive (not destroyed) until the frame that grew it finishes submitting.
    expect(bufferBefore.destroy).not.toHaveBeenCalled();
    expect(renderer._objectRingPendingDestroy).toBe(bufferBefore);
  });

  it("clamps to the last slot and warns once when a frame needs more slots than predicted", () => {
    const { renderer } = makeRenderer();
    renderer._objectRingCapacity = 2;
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const offsetA = renderer._getObjectSlotOffset(new Object3D("A"), makeManifest(), "mA");
    const offsetB = renderer._getObjectSlotOffset(new Object3D("B"), makeManifest(), "mB");
    const offsetOverflow1 = renderer._getObjectSlotOffset(new Object3D("C"), makeManifest(), "mC");
    const offsetOverflow2 = renderer._getObjectSlotOffset(new Object3D("D"), makeManifest(), "mD");

    expect(offsetA).toBe(0);
    expect(offsetB).toBe(renderer._objectUniformStride);
    // Overflowing draws reuse the last valid slot instead of writing out of bounds.
    expect(offsetOverflow1).toBe(offsetB);
    expect(offsetOverflow2).toBe(offsetB);
    expect(warnSpy).toHaveBeenCalledTimes(1);

    warnSpy.mockRestore();
  });
});
