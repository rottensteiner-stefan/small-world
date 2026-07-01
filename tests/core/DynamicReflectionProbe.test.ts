import { describe, it, expect, vi } from "vitest";
import { DynamicReflectionProbe, Scene } from "../../src/index.js";
import { Renderer } from "../../src/interfaces/Renderer.js";

describe("DynamicReflectionProbe", () => {
  it("initializes with 1 face per frame by default", () => {
    const probe = new DynamicReflectionProbe("TestProbe", 128);
    expect(probe.facesPerFrame).toBe(1);
    expect(probe.renderTarget.width).toBe(128);
    expect(probe.renderTarget.height).toBe(128);
  });

  it("updates correct number of faces and cycles through them", () => {
    const probe = new DynamicReflectionProbe();
    probe.facesPerFrame = 2;

    const scene = new Scene();
    const mockRenderer = {
      setRenderTarget: vi.fn(),
      render: vi.fn(),
    } as unknown as Renderer;

    // First update (should do faces 0, 1)
    probe.updateReflection(scene, mockRenderer);
    expect(mockRenderer.setRenderTarget).toHaveBeenCalledTimes(3); // 2 faces + 1 null at end
    expect(mockRenderer.render).toHaveBeenCalledTimes(2);

    // Second update (should do faces 2, 3)
    probe.updateReflection(scene, mockRenderer);
    expect(mockRenderer.render).toHaveBeenCalledTimes(4);

    // Third update (should do faces 4, 5)
    probe.updateReflection(scene, mockRenderer);
    expect(mockRenderer.render).toHaveBeenCalledTimes(6);

    // Fourth update (should cycle back to faces 0, 1)
    probe.updateReflection(scene, mockRenderer);
    expect(mockRenderer.render).toHaveBeenCalledTimes(8);
  });
});
