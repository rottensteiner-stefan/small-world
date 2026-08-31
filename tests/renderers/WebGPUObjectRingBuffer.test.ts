import "../../src/index.js";
import { describe, expect, it, vi } from "vitest";
import { GPUObjectRingBuffer } from "../../src/renderers/WebGPU/managers/GPUObjectRingBuffer.js";

// Node/vitest has no WebGPU global; @webgpu/types only provides ambient TS types,
// not a runtime value. Stub the bit-flag constants this class actually reads.
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
    limits: { minUniformBufferOffsetAlignment: 256 },
  } as unknown as GPUDevice;
}

describe("GPUObjectRingBuffer", () => {
  it("allocates a fresh slot at offset 0 for the first key", () => {
    const device = makeMockDevice();
    const ring = new GPUObjectRingBuffer(device, { mock: "objectBGL" } as unknown as GPUBindGroupLayout);

    const { offset, cached } = ring.acquireSlot("A:matA");

    expect(offset).toBe(0);
    expect(cached).toBe(false);
  });

  it("dedupes the same key across multiple calls in one frame (e.g. CSM cascades sharing one DepthMaterial)", () => {
    const device = makeMockDevice();
    const ring = new GPUObjectRingBuffer(device, { mock: "objectBGL" } as unknown as GPUBindGroupLayout);

    const first = ring.acquireSlot("Caster:depthMatUuid");
    const second = ring.acquireSlot("Caster:depthMatUuid");
    const third = ring.acquireSlot("Caster:depthMatUuid");

    expect(first.cached).toBe(false);
    expect(second.cached).toBe(true);
    expect(third.cached).toBe(true);
    expect(second.offset).toBe(first.offset);
    expect(third.offset).toBe(first.offset);
  });

  it("does NOT dedupe different keys (e.g. main pass vs. shadow pass material for the same object)", () => {
    const device = makeMockDevice();
    const ring = new GPUObjectRingBuffer(device, { mock: "objectBGL" } as unknown as GPUBindGroupLayout);

    const shadow = ring.acquireSlot("Caster:depthMatUuid");
    const main = ring.acquireSlot("Caster:standardMatUuid");

    expect(main.offset).not.toBe(shadow.offset);
    expect(main.cached).toBe(false);
  });

  it("never dedupes an undefined key (sprites: model matrix is billboarded per-pass view matrix)", () => {
    const device = makeMockDevice();
    const ring = new GPUObjectRingBuffer(device, { mock: "objectBGL" } as unknown as GPUBindGroupLayout);

    const cam = ring.acquireSlot(undefined);
    const light = ring.acquireSlot(undefined);

    expect(cam.offset).not.toBe(light.offset);
    expect(cam.cached).toBe(false);
    expect(light.cached).toBe(false);
  });

  it("returns offsets aligned to the object uniform stride", () => {
    const device = makeMockDevice();
    const ring = new GPUObjectRingBuffer(device, { mock: "objectBGL" } as unknown as GPUBindGroupLayout);

    const offsets = [0, 1, 2].map((i) => ring.acquireSlot(`key${i}`).offset);

    for (const offset of offsets) {
      expect(offset % ring.stride).toBe(0);
    }
    expect(new Set(offsets).size).toBe(3);
  });

  it("grows the ring buffer (new GPUBuffer + bind group) instead of shrinking or reusing capacity", () => {
    const device = makeMockDevice();
    const ring = new GPUObjectRingBuffer(device, { mock: "objectBGL" } as unknown as GPUBindGroupLayout);
    expect(ring.capacity).toBe(1024);

    const bufferBefore = ring.buffer;
    ring.ensureCapacity(2048);

    expect(ring.capacity).toBeGreaterThanOrEqual(2048);
    expect(ring.buffer).not.toBe(bufferBefore);
    expect(device.createBuffer).toHaveBeenCalledTimes(2);
    // Old buffer is kept alive (not destroyed) until the frame that grew it finishes submitting.
    expect(bufferBefore.destroy).not.toHaveBeenCalled();
    expect(ring.pendingDestroy).toBe(bufferBefore);
  });

  it("destroys a growth-replaced buffer only once endFrame() drains it", () => {
    const device = makeMockDevice();
    const ring = new GPUObjectRingBuffer(device, { mock: "objectBGL" } as unknown as GPUBindGroupLayout);
    const bufferBefore = ring.buffer;
    ring.ensureCapacity(2048);

    expect(bufferBefore.destroy).not.toHaveBeenCalled();
    ring.endFrame();
    expect(bufferBefore.destroy).toHaveBeenCalledTimes(1);
    expect(ring.pendingDestroy).toBeUndefined();
  });

  it("clamps to the last slot and warns once when a frame needs more slots than predicted", () => {
    const device = makeMockDevice();
    const ring = new GPUObjectRingBuffer(
      device,
      { mock: "objectBGL" } as unknown as GPUBindGroupLayout,
      2,
    );
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const a = ring.acquireSlot("A");
    const b = ring.acquireSlot("B");
    const overflow1 = ring.acquireSlot("C");
    const overflow2 = ring.acquireSlot("D");

    expect(a.offset).toBe(0);
    expect(b.offset).toBe(ring.stride);
    // Overflowing draws reuse the last valid slot instead of writing out of bounds.
    expect(overflow1.offset).toBe(b.offset);
    expect(overflow2.offset).toBe(b.offset);
    expect(warnSpy).toHaveBeenCalledTimes(1);

    warnSpy.mockRestore();
  });

  it("beginFrame() resets dedup state and grows capacity from last frame's usage", () => {
    const device = makeMockDevice();
    const ring = new GPUObjectRingBuffer(device, { mock: "objectBGL" } as unknown as GPUBindGroupLayout, 2);

    ring.acquireSlot("A");
    ring.acquireSlot("B");
    ring.acquireSlot("C"); // overflow, clamped to B's slot
    ring.endFrame();

    ring.beginFrame();
    // Same key from last frame must NOT still be cached -- beginFrame() clears the dedup map.
    const again = ring.acquireSlot("A");
    expect(again.cached).toBe(false);
    // Capacity grew from last frame's 3-slot demand (with 50% headroom, floored by the 1024 default).
    expect(ring.capacity).toBeGreaterThanOrEqual(1024);
  });

  it("write() forwards to device.queue.writeBuffer with the ring's current buffer", () => {
    const device = makeMockDevice();
    const ring = new GPUObjectRingBuffer(device, { mock: "objectBGL" } as unknown as GPUBindGroupLayout);
    const data = new Float32Array([1, 2, 3]);

    ring.write(256, data);

    expect(device.queue.writeBuffer).toHaveBeenCalledWith(ring.buffer, 256, data);
  });
});
