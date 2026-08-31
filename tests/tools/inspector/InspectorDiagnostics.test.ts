import { describe, it, expect } from "vitest";
import { Scene, Object3D } from "../../../src/core/index.js";
import { InspectorDiagnostics } from "../../../src/tools/inspector/InspectorDiagnostics.js";

describe("InspectorDiagnostics", () => {
  it("counts scene objects recursively", () => {
    // Mock minimal TabPageApi
    const mockFolder = {
      addBinding: (): { refresh: () => void } => ({ refresh: (): void => {} }),
      addFolder: (): { addBinding: () => { refresh: () => void } } => ({
        addBinding: (): { refresh: () => void } => ({ refresh: (): void => {} }),
      }),
    };
    const mockTab = {
      addFolder: (): typeof mockFolder => mockFolder,
    };

    const diagnostics = new InspectorDiagnostics(
      mockTab as unknown as import("tweakpane").TabPageApi,
      mockTab as unknown as import("tweakpane").TabPageApi,
    );

    const scene = new Scene();
    const parent = new Object3D("Parent");
    const child1 = new Object3D("Child1");
    const child2 = new Object3D("Child2");
    const grandChild = new Object3D("GrandChild");

    child1.add(grandChild);
    parent.add(child1, child2);
    scene.add(parent);

    const mockCanvas = { width: 800, height: 600 } as HTMLCanvasElement;
    diagnostics.update(scene, mockCanvas);

    expect(diagnostics.stats.resolution).toBe("800x600");
    expect(diagnostics.stats.objects).toBe(4);
  });
});
