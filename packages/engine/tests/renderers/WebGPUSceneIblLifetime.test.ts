import "../../src/index.js";
import { describe, expect, it, vi } from "vitest";
import { WebGPURenderer } from "../../src/renderers/WebGPU/WebGPURenderer.js";

// Node/vitest has no WebGPU global; stub the bit-flag constants the code under test reads.
(globalThis as unknown as { GPUTextureUsage: Record<string, number> }).GPUTextureUsage ??= {
  COPY_SRC: 0x01,
  COPY_DST: 0x02,
  TEXTURE_BINDING: 0x04,
  STORAGE_BINDING: 0x08,
  RENDER_ATTACHMENT: 0x10,
};
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
(globalThis as unknown as { GPUShaderStage: Record<string, number> }).GPUShaderStage ??= {
  VERTEX: 0x1,
  FRAGMENT: 0x2,
  COMPUTE: 0x4,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RendererInternals = any;

function makeRenderer(): {
  renderer: RendererInternals;
  retain: ReturnType<typeof vi.fn>;
  release: ReturnType<typeof vi.fn>;
} {
  const retain = vi.fn();
  const release = vi.fn();
  const renderer = new WebGPURenderer() as RendererInternals;
  renderer._textures = { retainTexture: retain, releaseRetainedTexture: release };
  renderer._createGlobalBindGroup = vi.fn(() => ({}));
  return { renderer, retain, release };
}

const map = (name: string): object => ({ name });

describe("WebGPURenderer: lifetime of the scene IBL textures in the global bind group", () => {
  it("holds a reference on each IBL map it binds, and none for missing ones", () => {
    const { renderer, retain } = makeRenderer();
    const irradiance = map("irradiance");
    const brdf = map("brdf");

    renderer._rebuildGlobalBindGroupForScene({
      irradianceMap: irradiance,
      prefilterMap: undefined,
      brdfLUT: brdf,
    });

    expect(retain).toHaveBeenCalledTimes(2);
    expect(retain).toHaveBeenCalledWith(irradiance);
    expect(retain).toHaveBeenCalledWith(brdf);
  });

  it("takes the new references before dropping the old ones, so a shared map is never destroyed in between", () => {
    const { renderer, retain, release } = makeRenderer();
    const shared = map("shared");
    const oldOnly = map("old-only");
    const newOnly = map("new-only");

    renderer._rebuildGlobalBindGroupForScene({
      irradianceMap: oldOnly,
      prefilterMap: shared,
      brdfLUT: undefined,
    });
    retain.mockClear();
    renderer._rebuildGlobalBindGroupForScene({
      irradianceMap: newOnly,
      prefilterMap: shared,
      brdfLUT: undefined,
    });

    expect(release).toHaveBeenCalledTimes(2);
    expect(release).toHaveBeenCalledWith(oldOnly);
    expect(release).toHaveBeenCalledWith(shared);
    const lastRetain = Math.max(...retain.mock.invocationCallOrder);
    const firstRelease = Math.min(...release.mock.invocationCallOrder);
    expect(lastRetain).toBeLessThan(firstRelease);
  });

  it("counts the rebuild so passes holding a copy of the bind group rebuild theirs", () => {
    const { renderer } = makeRenderer();
    const before = renderer.globalResourcesVersion;

    renderer._rebuildGlobalBindGroupForScene({
      irradianceMap: map("a"),
      prefilterMap: undefined,
      brdfLUT: undefined,
    });

    expect(renderer.globalResourcesVersion).toBe(before + 1);
  });
});
