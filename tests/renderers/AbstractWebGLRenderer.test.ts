/// tests/renderers/AbstractWebGLRenderer.test.ts
import "../../src/index.js";
import { describe, expect, it, vi } from "vitest";
import { AbstractWebGLRenderer } from "../../src/renderers/AbstractWebGLRenderer.js";
import { type WebGLRenderPass } from "../../src/renderers/WebGLRenderPass.js";
import { Scene } from "../../src/core/Scene.js";

// Dummy implementation of the abstract base class
class TestWebGLRenderer extends AbstractWebGLRenderer {
  public override resetStateCache(): void {}
  public override renderGroup(): void {}
  public override bindMainRenderTarget(): boolean {
    return true;
  }
  public override bindPostProcessRenderTarget(): void {}
  public override copyToOpaqueTexture(): void {}
  public override flushPostProcess(): void {}
}

describe("AbstractWebGLRenderer Pass System", () => {
  it("should iterate and execute all registered passes in order", () => {
    const mockGL = {
      canvas: {},
      viewport: vi.fn(),
      clear: vi.fn(),
      enable: vi.fn(),
      blendFunc: vi.fn(),
      COLOR_BUFFER_BIT: 1,
      DEPTH_BUFFER_BIT: 2,
      BLEND: 3,
      SRC_ALPHA: 4,
      ONE_MINUS_SRC_ALPHA: 5,
    } as unknown as WebGL2RenderingContext;

    const renderer = new TestWebGLRenderer(mockGL);

    // Create mock passes
    const pass1: WebGLRenderPass = {
      name: "Pass1",
      execute: vi.fn(),
    };
    const pass2: WebGLRenderPass = {
      name: "Pass2",
      execute: vi.fn(),
    };

    renderer.addPass(pass1);
    renderer.addPass(pass2);

    const scene = new Scene();
    const vp = new Float32Array(16);

    // Call the generic render method
    renderer.render(scene, vp);

    // Verify both passes were executed exactly once
    expect(pass1.execute).toHaveBeenCalledTimes(1);
    expect(pass2.execute).toHaveBeenCalledTimes(1);

    // Verify execution order (pass1 before pass2)
    const order1 = (pass1.execute as import("vitest").Mock).mock.invocationCallOrder[0];
    const order2 = (pass2.execute as import("vitest").Mock).mock.invocationCallOrder[0];
    expect(order1).toBeLessThan(order2);
  });
});
