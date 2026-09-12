import "../../src/index.js";
import { describe, expect, it, vi } from "vitest";
import { MainRenderPass } from "../../src/renderers/passes/MainRenderPass.js";
import { Vector3D } from "../../src/math/index.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Internals = any;

function makeMockRenderer(): Internals {
  return {
    activeDepthView: { mock: "depthView" },
    clearColor: { r: 0, g: 0, b: 0, a: 1 },
    postProcessing: { enabled: false, get: vi.fn(() => undefined) },
    _renderBatch: vi.fn(),
  };
}

function makeMockScene(): Internals {
  return {
    getVisibleObjectsSorted: vi.fn(() => ({ opaqueBatches: [], transparent: [] })),
  };
}

describe("MainRenderPass", () => {
  it("relies on DepthPrePassGPU's clear -- opens the opaque pass with depthLoadOp: 'load', not 'clear'", () => {
    const renderer = makeMockRenderer();
    const scene = makeMockScene();
    const rp = { end: vi.fn() };
    const ce = { beginRenderPass: vi.fn(() => rp) };
    const targetView = { mock: "targetView" };

    const pass = new MainRenderPass() as Internals;
    pass.execute(renderer, scene, ce, targetView, new Float32Array(16), new Vector3D(0, 0, 0));

    expect(ce.beginRenderPass).toHaveBeenCalledWith(
      expect.objectContaining({
        depthStencilAttachment: expect.objectContaining({
          view: renderer.activeDepthView,
          depthLoadOp: "load",
        }),
      }),
    );
    // Must not re-clear -- that would erase what DepthPrePassGPU already wrote this frame.
    const call = (ce.beginRenderPass as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(call.depthStencilAttachment.depthLoadOp).not.toBe("clear");
  });
});
