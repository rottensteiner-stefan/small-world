import "../../src/index.js";
import { describe, expect, it, vi } from "vitest";
import { WebGPURenderer } from "../../src/renderers/WebGPU/WebGPURenderer.js";
import { Object3D } from "../../src/core/Object3D.js";
import { Scene } from "../../src/core/Scene.js";
import { GeometryDataInterface } from "../../src/interfaces/index.js";

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
  const destroy = vi.fn();
  return {
    createBuffer: vi.fn(() => ({
      getMappedRange: () => new ArrayBuffer(64),
      unmap: vi.fn(),
      destroy,
    })),
    queue: { writeBuffer: vi.fn() },
  } as unknown as GPUDevice;
}

function makeGeometry(): GeometryDataInterface {
  return {
    vertices: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
    getBoundingVolume: (): never => {
      throw new Error("not used in this test");
    },
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RendererInternals = any;

describe("WebGPU geometry reference counting", () => {
  it("creates GPU buffers on first use and reuses them for a second object sharing the geometry", () => {
    const device = makeMockDevice();
    const renderer = new WebGPURenderer();
    (renderer as RendererInternals)._device = device;

    const geo = makeGeometry();
    const objA = new Object3D("A");
    const objB = new Object3D("B");

    const cacheA = (renderer as RendererInternals)._getGeoCache(objA, geo);
    expect(device.createBuffer).toHaveBeenCalledTimes(1);
    expect(cacheA.refCount).toBe(1);

    const cacheB = (renderer as RendererInternals)._getGeoCache(objB, geo);
    expect(cacheB).toBe(cacheA);
    expect(device.createBuffer).toHaveBeenCalledTimes(1);
    expect(cacheA.refCount).toBe(2);
  });

  it("does not destroy the shared buffer while another object still references it", () => {
    const device = makeMockDevice();
    const renderer = new WebGPURenderer();
    (renderer as RendererInternals)._device = device;

    const geo = makeGeometry();
    const objA = new Object3D("A");
    const objB = new Object3D("B");

    const cache = (renderer as RendererInternals)._getGeoCache(objA, geo);
    (renderer as RendererInternals)._getGeoCache(objB, geo);

    (renderer as RendererInternals)._releaseGeometryFor(objA);
    expect(cache.vb.destroy).not.toHaveBeenCalled();

    (renderer as RendererInternals)._releaseGeometryFor(objB);
    expect(cache.vb.destroy).toHaveBeenCalled();
  });

  it("releases the old geometry and acquires the new one when an object's geometry is reassigned at runtime", () => {
    const device = makeMockDevice();
    const renderer = new WebGPURenderer();
    (renderer as RendererInternals)._device = device;

    const geoA = makeGeometry();
    const geoB = makeGeometry();
    const obj = new Object3D("Swappable");

    const cacheA = (renderer as RendererInternals)._getGeoCache(obj, geoA);
    expect(cacheA.refCount).toBe(1);

    const cacheB = (renderer as RendererInternals)._getGeoCache(obj, geoB);
    expect(cacheB.refCount).toBe(1);
    expect(cacheA.refCount).toBe(0);
    expect(cacheA.vb.destroy).toHaveBeenCalled();
  });

  it("releases geometry via the Scene removal queue when the renderer's render() drains it", () => {
    const device = makeMockDevice();
    const renderer = new WebGPURenderer();
    (renderer as RendererInternals)._device = device;

    const scene = new Scene();
    const geo = makeGeometry();
    const obj = new Object3D("Removable");
    obj.geometry = geo;
    scene.add(obj);

    const cache = (renderer as RendererInternals)._getGeoCache(obj, geo);
    expect(cache.refCount).toBe(1);

    scene.remove(obj);
    for (const removed of scene.consumeRemovedObjects()) {
      (renderer as RendererInternals)._releaseGeometryFor(removed);
    }

    expect(cache.refCount).toBe(0);
    expect(cache.vb.destroy).toHaveBeenCalled();
  });
});
