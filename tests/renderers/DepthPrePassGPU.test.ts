import "../../src/index.js";
import { describe, expect, it, vi } from "vitest";
import { DepthPrePassGPU } from "../../src/renderers/passes/DepthPrePassGPU.js";
import { InstancedMesh } from "../../src/core/InstancedMesh.js";
import { Object3D } from "../../src/core/Object3D.js";
import { Vector3D } from "../../src/math/index.js";
import { MaterialType } from "../../src/enums/index.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Internals = any;

function makeMockRenderer(): Internals {
  return {
    activeDepthView: { mock: "depthView" },
    globalBindGroup: { mock: "globalBindGroup" },
    _renderSubgroup: vi.fn(),
  };
}

function makeMockScene(opaqueBatches: Internals[]): Internals {
  return {
    getVisibleObjectsSorted: vi.fn(() => ({ opaqueBatches })),
  };
}

function makeCe(): { ce: Internals; rp: Internals } {
  const rp = { setBindGroup: vi.fn(), setPipeline: vi.fn(), end: vi.fn() };
  const ce = { beginRenderPass: vi.fn(() => rp) };
  return { ce, rp };
}

describe("DepthPrePassGPU", () => {
  it("clears the depth buffer and the throwaway color target every frame, even with nothing to draw", () => {
    const renderer = makeMockRenderer();
    const scene = makeMockScene([]);
    const { ce, rp } = makeCe();
    const targetView = { mock: "targetView" };

    const pass = new DepthPrePassGPU() as Internals;
    pass.execute(renderer, scene, ce, targetView, new Float32Array(16), new Vector3D(0, 0, 0));

    expect(ce.beginRenderPass).toHaveBeenCalledWith(
      expect.objectContaining({
        colorAttachments: [
          expect.objectContaining({ view: targetView, loadOp: "clear", storeOp: "discard" }),
        ],
        depthStencilAttachment: expect.objectContaining({
          view: renderer.activeDepthView,
          depthLoadOp: "clear",
          depthClearValue: 1.0,
        }),
      }),
    );
    expect(rp.setBindGroup).toHaveBeenCalledWith(0, renderer.globalBindGroup);
    expect(rp.end).toHaveBeenCalledTimes(1);
    expect(renderer._renderSubgroup).not.toHaveBeenCalled();
  });

  it("skips the skybox batch entirely", () => {
    const renderer = makeMockRenderer();
    const obj = new Object3D("skybox-mesh");
    const scene = makeMockScene([
      { shaderId: MaterialType.SKYBOX, objects: [obj], topology: undefined },
    ]);
    const { ce } = makeCe();

    const pass = new DepthPrePassGPU() as Internals;
    pass.execute(renderer, scene, ce, {}, new Float32Array(16), new Vector3D(0, 0, 0));

    expect(renderer._renderSubgroup).not.toHaveBeenCalled();
  });

  it("splits standard vs. instanced objects and passes viewOffset 0 (main camera slot)", () => {
    const renderer = makeMockRenderer();
    const standard = new Object3D("standard");
    // _renderSubgroup is mocked below, so geometry/material are never actually read here --
    // only `instanceof InstancedMesh` matters for the standard/instanced split this pass does.
    const instanced = new InstancedMesh(
      "instanced",
      undefined as unknown as Internals,
      undefined as unknown as Internals,
      1,
    );
    const scene = makeMockScene([
      { shaderId: "test-shader", objects: [standard, instanced], topology: undefined },
    ]);
    const { ce } = makeCe();

    const pass = new DepthPrePassGPU() as Internals;
    pass.execute(renderer, scene, ce, {}, new Float32Array(16), new Vector3D(0, 0, 0));

    expect(renderer._renderSubgroup).toHaveBeenCalledTimes(2);
    const calls = (renderer._renderSubgroup as ReturnType<typeof vi.fn>).mock.calls;

    const standardCall = calls.find((c: Internals) => c[2] === false)!;
    expect(standardCall[1]).toEqual([standard]);
    expect(standardCall[5]).toBe(0); // VIEW_SLOT_MAIN_CAMERA

    const instancedCall = calls.find((c: Internals) => c[2] === true)!;
    expect(instancedCall[1]).toEqual([instanced]);
    expect(instancedCall[5]).toBe(0);
  });
});
