import "../../src/index.js";
import { describe, expect, it, vi } from "vitest";
import { WebGPURenderer } from "../../src/renderers/WebGPU/WebGPURenderer.js";
import { Texture } from "../../src/core/textures/Texture.js";

// Node/vitest has no WebGPU global; @webgpu/types only provides ambient TS types,
// not a runtime value. Stub the bit-flag constants this renderer actually reads.
(globalThis as unknown as { GPUTextureUsage: Record<string, number> }).GPUTextureUsage ??= {
  COPY_SRC: 0x01,
  COPY_DST: 0x02,
  TEXTURE_BINDING: 0x04,
  STORAGE_BINDING: 0x08,
  RENDER_ATTACHMENT: 0x10,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RendererInternals = any;

function makeMockDevice(): { device: GPUDevice; renderPass: { draw: ReturnType<typeof vi.fn> } } {
  const view = {};
  const gpuTexture = { createView: vi.fn().mockReturnValue(view) };
  const renderPass = {
    setPipeline: vi.fn(),
    setBindGroup: vi.fn(),
    draw: vi.fn(),
    end: vi.fn(),
  };
  const commandEncoder = {
    beginRenderPass: vi.fn().mockReturnValue(renderPass),
    finish: vi.fn().mockReturnValue({}),
  };
  const device = {
    createTexture: vi.fn().mockReturnValue(gpuTexture),
    createCommandEncoder: vi.fn().mockReturnValue(commandEncoder),
    createBindGroup: vi.fn().mockReturnValue({}),
    queue: { copyExternalImageToTexture: vi.fn(), submit: vi.fn() },
  } as unknown as GPUDevice;
  return { device, renderPass };
}

function makeRenderer(): { renderer: RendererInternals; device: GPUDevice } {
  const { device } = makeMockDevice();
  const renderer = new WebGPURenderer() as RendererInternals;
  renderer._device = device;
  renderer._mipGenBGL = { mock: "mipGenBGL" };
  renderer._mipGenPipeline = { mock: "mipGenPipeline" };
  renderer._mipGenSampler = { mock: "mipGenSampler" };
  return { renderer, device };
}

describe("WebGPU runtime mipmap generation", () => {
  it("computes the standard full mip chain length", () => {
    const { renderer } = makeRenderer();
    expect(renderer._computeMipLevelCount(16, 16)).toBe(5);
    expect(renderer._computeMipLevelCount(1, 1)).toBe(1);
    expect(renderer._computeMipLevelCount(300, 150)).toBe(9);
  });

  it("creates a full mip chain and generates it for a fresh texture by default", () => {
    const { renderer, device } = makeRenderer();
    const tex = Texture.fromCanvas({ width: 16, height: 16 } as HTMLCanvasElement);

    renderer._getTextureView(tex);

    expect(device.createTexture).toHaveBeenCalledWith(
      expect.objectContaining({ mipLevelCount: 5 }),
    );
    expect(device.queue.submit).toHaveBeenCalledTimes(1);
  });

  it("issues mipLevelCount - 1 blit draws per generation", () => {
    const { renderer, device } = makeRenderer();
    const tex = Texture.fromCanvas({ width: 16, height: 16 } as HTMLCanvasElement);

    renderer._getTextureView(tex);

    const commandEncoder = (device.createCommandEncoder as ReturnType<typeof vi.fn>).mock
      .results[0]!.value;
    expect(commandEncoder.beginRenderPass).toHaveBeenCalledTimes(4);
  });

  it("skips generation when the texture opts out via generateMipmaps: false", () => {
    const { renderer, device } = makeRenderer();
    const tex = Texture.fromCanvas({ width: 16, height: 16 } as HTMLCanvasElement, {
      generateMipmaps: false,
    });

    renderer._getTextureView(tex);

    expect(device.createTexture).toHaveBeenCalledWith(
      expect.objectContaining({ mipLevelCount: 1 }),
    );
    expect(device.queue.submit).not.toHaveBeenCalled();
  });

  it("skips generation when quality.mipmapping is disabled, even if the texture allows it", () => {
    const { renderer, device } = makeRenderer();
    renderer._quality.mipmapping = false;
    const tex = Texture.fromCanvas({ width: 16, height: 16 } as HTMLCanvasElement);

    renderer._getTextureView(tex);

    expect(device.createTexture).toHaveBeenCalledWith(
      expect.objectContaining({ mipLevelCount: 1 }),
    );
    expect(device.queue.submit).not.toHaveBeenCalled();
  });

  it("regenerates the mip chain on a needsUpdate re-upload", () => {
    const { renderer, device } = makeRenderer();
    const tex = Texture.fromCanvas({ width: 16, height: 16 } as HTMLCanvasElement);

    renderer._getTextureView(tex);
    expect(device.queue.submit).toHaveBeenCalledTimes(1);

    tex.needsUpdate = true;
    renderer._getTextureView(tex);

    expect(device.queue.copyExternalImageToTexture).toHaveBeenCalledTimes(2);
    expect(device.queue.submit).toHaveBeenCalledTimes(2);
  });
});
