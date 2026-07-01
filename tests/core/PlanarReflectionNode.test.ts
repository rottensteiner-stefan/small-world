import { describe, expect, it } from "vitest";
import { Camera } from "../../src/core/Camera.js";
import { PerspectiveProjection } from "../../src/math/index.js";
import { PlanarReflectionNode } from "../../src/core/PlanarReflectionNode.js";
import { Scene } from "../../src/core/Scene.js";
import { Renderer } from "../../src/interfaces/Renderer.js";

class MockRenderer {
  public renderTargetParams: unknown[] = [];
  public renderCalls = 0;

  public setRenderTarget(target: unknown): void {
    this.renderTargetParams.push(target);
  }

  public render(): void {
    this.renderCalls++;
  }
}

describe("PlanarReflectionNode", () => {
  it("should initialize a RenderTarget and mirrored camera", () => {
    const reflectionNode = new PlanarReflectionNode("TestReflection", 512, 512);

    expect(reflectionNode.renderTarget).toBeDefined();
    expect(reflectionNode.renderTarget.width).toBe(512);
    expect(reflectionNode.renderTarget.height).toBe(512);

    // Internal camera should exist
    expect(reflectionNode.mirrorCamera).toBeDefined();
  });

  it("should properly mirror camera positions across its plane", () => {
    const reflectionNode = new PlanarReflectionNode("Mirror", 512, 512);
    // Node sits at Y=0 (XZ plane)
    reflectionNode.position.set(0, 0, 0);
    reflectionNode.updateMatrixWorld();

    const mainCamera = new Camera(new PerspectiveProjection());
    // Camera is 5 units above the floor looking down a bit
    mainCamera.position.set(0, 5, 10);
    mainCamera.updateViewMatrix();

    const scene = new Scene();
    const renderer = new MockRenderer();

    // Trigger update
    reflectionNode.updateReflection(scene, mainCamera, renderer as unknown as Renderer);

    // After updateReflection, the internal mirrored camera should be mirrored across Y=0
    const mirroredCamera = reflectionNode.mirrorCamera;

    expect(mirroredCamera.position.x).toBeCloseTo(0, 3);
    expect(mirroredCamera.position.y).toBeCloseTo(-5, 3); // Mirrored across Y=0!
    expect(mirroredCamera.position.z).toBeCloseTo(10, 3);

    // Renderer should have been asked to render to the render target, then null
    expect(renderer.renderTargetParams[0]).toBe(reflectionNode.renderTarget);
    expect(renderer.renderTargetParams[1]).toBeNull();
    expect(renderer.renderCalls).toBe(1);
  });
});
