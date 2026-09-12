import "../../src/index.js";
import { describe, expect, it, vi } from "vitest";
import { WebGL1Renderer } from "../../src/renderers/WebGL1/WebGL1Renderer.js";
import { WebGLTextureManager } from "../../src/renderers/WebGL2/managers/WebGLTextureManager.js";
import { GPUTextureResourceCache } from "../../src/renderers/WebGPU/managers/GPUTextureResourceCache.js";
import { GPUFallbackResources } from "../../src/renderers/WebGPU/managers/GPUFallbackResources.js";
import { Texture } from "../../src/core/textures/Texture.js";
import { TextureArray } from "../../src/core/textures/TextureArray.js";

// Node/vitest has no WebGPU global; @webgpu/types only provides ambient TS types,
// not a runtime value. Stub the bit-flag constants this renderer actually reads.
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

function makeMockGl(): WebGL2RenderingContext {
  return {
    createTexture: vi.fn().mockReturnValue({}),
    bindTexture: vi.fn(),
    texImage2D: vi.fn(),
    texImage3D: vi.fn(),
    texSubImage3D: vi.fn(),
    texParameteri: vi.fn(),
    generateMipmap: vi.fn(),
    TEXTURE_2D: 1,
    RGBA: 2,
    UNSIGNED_BYTE: 3,
    TEXTURE_MAG_FILTER: 4,
    TEXTURE_MIN_FILTER: 5,
    NEAREST: 6,
    LINEAR: 7,
    LINEAR_MIPMAP_LINEAR: 8,
    NEAREST_MIPMAP_LINEAR: 9,
    TEXTURE_WRAP_S: 10,
    TEXTURE_WRAP_T: 11,
    REPEAT: 12,
    MIRRORED_REPEAT: 13,
    CLAMP_TO_EDGE: 14,
    TEXTURE_2D_ARRAY: 15,
  } as unknown as WebGL2RenderingContext;
}

function makeMockDevice(): GPUDevice {
  const view = {};
  const gpuTexture = { createView: vi.fn().mockReturnValue(view) };
  return {
    createTexture: vi.fn().mockReturnValue(gpuTexture),
    createBuffer: vi.fn(() => ({ destroy: vi.fn() })),
    createSampler: vi.fn(() => ({})),
    createBindGroupLayout: vi.fn(() => ({})),
    createBindGroup: vi.fn(() => ({})),
    createShaderModule: vi.fn(() => ({})),
    createPipelineLayout: vi.fn(() => ({})),
    createRenderPipeline: vi.fn(() => ({})),
    queue: { copyExternalImageToTexture: vi.fn(), writeBuffer: vi.fn(), writeTexture: vi.fn() },
  } as unknown as GPUDevice;
}

describe("Texture GPU re-upload on needsUpdate", () => {
  it("WebGL1Renderer re-uploads pixels without recreating the GL texture", () => {
    const gl = makeMockGl();
    const renderer = new WebGL1Renderer();
    (renderer as RendererInternals).gl = gl;

    const tex = Texture.fromCanvas({ width: 32, height: 33 } as HTMLCanvasElement);

    const first = (renderer as RendererInternals)._getWebGLTexture(tex);
    expect(gl.createTexture).toHaveBeenCalledTimes(1);
    expect(gl.texImage2D).toHaveBeenCalledTimes(1);
    const firstSamplerCallCount = vi.mocked(gl.texParameteri).mock.calls.length;
    expect(firstSamplerCallCount).toBeGreaterThan(0);

    vi.mocked(gl.texParameteri).mockClear();
    tex.needsUpdate = true;
    const second = (renderer as RendererInternals)._getWebGLTexture(tex);

    expect(second).toBe(first);
    expect(gl.createTexture).toHaveBeenCalledTimes(1);
    expect(gl.texImage2D).toHaveBeenCalledTimes(2);
    expect(tex.needsUpdate).toBe(false);
    // Sampler params (wrap/filter) must be re-applied on re-upload, not just on first creation --
    // otherwise a texture that changes wrap/filter mode after needsUpdate silently keeps stale GL state.
    expect(vi.mocked(gl.texParameteri).mock.calls.length).toBe(firstSamplerCallCount);
    expect(gl.texParameteri).toHaveBeenCalledWith(
      gl.TEXTURE_2D,
      gl.TEXTURE_WRAP_S,
      expect.any(Number),
    );
  });

  it("WebGLTextureManager re-uploads pixels without recreating the GL texture", () => {
    const gl = makeMockGl();
    const textures = new WebGLTextureManager(gl, new Map(), {} as never, {} as never);

    const tex = Texture.fromCanvas({ width: 32, height: 32 } as HTMLCanvasElement);

    const first = textures.getWebGLTexture(tex, undefined);
    expect(gl.createTexture).toHaveBeenCalledTimes(1);
    expect(gl.texImage2D).toHaveBeenCalledTimes(1);
    const firstSamplerCallCount = vi.mocked(gl.texParameteri).mock.calls.length;
    expect(firstSamplerCallCount).toBeGreaterThan(0);

    vi.mocked(gl.texParameteri).mockClear();
    tex.needsUpdate = true;
    const second = textures.getWebGLTexture(tex, undefined);

    expect(second).toBe(first);
    expect(gl.createTexture).toHaveBeenCalledTimes(1);
    expect(gl.texImage2D).toHaveBeenCalledTimes(2);
    expect(tex.needsUpdate).toBe(false);
    // Same sampler-reapply guarantee as the WebGL1Renderer path above, but through
    // WebGLTextureManager's own (WebGL2) code path.
    expect(vi.mocked(gl.texParameteri).mock.calls.length).toBe(firstSamplerCallCount);
    expect(gl.texParameteri).toHaveBeenCalledWith(
      gl.TEXTURE_2D,
      gl.TEXTURE_WRAP_S,
      expect.any(Number),
    );
  });

  it("WebGLTextureManager re-uploads a TextureArray's layers on needsUpdate, not just on first upload", () => {
    const gl = makeMockGl();
    const textures = new WebGLTextureManager(gl, new Map(), {} as never, {} as never);

    const layer = { width: 8, height: 8 } as ImageBitmap;
    const texArray = TextureArray.fromImages([layer, layer]);

    const first = textures.getWebGLTexture(texArray, undefined);
    expect(gl.createTexture).toHaveBeenCalledTimes(1);
    expect(gl.texImage3D).toHaveBeenCalledTimes(1);
    expect(gl.texSubImage3D).toHaveBeenCalledTimes(2); // one per layer

    vi.mocked(gl.texImage3D).mockClear();
    vi.mocked(gl.texSubImage3D).mockClear();
    texArray.needsUpdate = true;
    const second = textures.getWebGLTexture(texArray, undefined);

    expect(second).toBe(first);
    expect(gl.createTexture).toHaveBeenCalledTimes(1); // no new GL texture, same object re-bound
    expect(gl.texImage3D).toHaveBeenCalledTimes(1);
    expect(gl.texSubImage3D).toHaveBeenCalledTimes(2);
    expect(texArray.needsUpdate).toBe(false);
  });

  it("does not re-upload when needsUpdate stays false", () => {
    const gl = makeMockGl();
    const textures = new WebGLTextureManager(gl, new Map(), {} as never, {} as never);

    const tex = Texture.fromCanvas({ width: 32, height: 32 } as HTMLCanvasElement);

    textures.getWebGLTexture(tex, undefined);
    textures.getWebGLTexture(tex, undefined);

    expect(gl.texImage2D).toHaveBeenCalledTimes(1);
  });

  it("WebGPURenderer re-uploads via copyExternalImageToTexture without recreating the GPU texture", () => {
    const device = makeMockDevice();
    const fallback = new GPUFallbackResources(device);
    const textures = new GPUTextureResourceCache(device, fallback);

    // Mip generation is covered separately in WebGPUMipmapGeneration.test.ts -- this test is
    // only about the re-upload-without-recreation path, so mips are opted out here.
    const tex = Texture.fromCanvas({ width: 16, height: 16 } as HTMLCanvasElement, {
      generateMipmaps: false,
    });

    vi.mocked(device.createTexture).mockClear();
    vi.mocked(device.queue.copyExternalImageToTexture).mockClear();

    const firstView = textures.getTextureView(tex, undefined);
    expect(device.createTexture).toHaveBeenCalledTimes(1);
    expect(device.queue.copyExternalImageToTexture).toHaveBeenCalledTimes(1);

    tex.needsUpdate = true;
    const secondView = textures.getTextureView(tex, undefined);

    expect(secondView).toBe(firstView);
    expect(device.createTexture).toHaveBeenCalledTimes(1);
    expect(device.queue.copyExternalImageToTexture).toHaveBeenCalledTimes(2);
    expect(tex.needsUpdate).toBe(false);
  });
});
