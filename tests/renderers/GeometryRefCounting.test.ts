import "../../src/index.js";
import { describe, expect, it, vi } from "vitest";
import { WebGL2Renderer } from "../../src/renderers/WebGL2/WebGL2Renderer.js";
import { Object3D } from "../../src/core/Object3D.js";
import { Scene } from "../../src/core/Scene.js";
import { GeometryDataInterface } from "../../src/interfaces/index.js";

function makeMockGl(): WebGL2RenderingContext {
  let bufferId = 0;
  return {
    createBuffer: vi.fn(() => ({ id: bufferId++ })),
    deleteBuffer: vi.fn(),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    ARRAY_BUFFER: 1,
    ELEMENT_ARRAY_BUFFER: 2,
    STATIC_DRAW: 3,
    UNSIGNED_SHORT: 4,
    UNSIGNED_INT: 5,
  } as unknown as WebGL2RenderingContext;
}

function makeGeometry(): GeometryDataInterface {
  return {
    vertices: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
    getBoundingVolume: (): never => {
      throw new Error("not used in this test");
    },
  };
}

// Accesses private WebGL2Renderer internals directly (geometry cache + refcounting).
// This is genuinely private implementation, not public API -- but the refcounting
// correctness here (shared geometry across many objects, reassignment on a live
// object, disposal only at zero references) can't be verified visually in this repo's
// sandbox (headless WebGPU/WebGL can't reliably render), so a direct unit test is the
// only real safety net for this logic.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RendererInternals = any;

describe("WebGL geometry reference counting", () => {
  it("creates a GPU mesh on first use and reuses it for a second object sharing the geometry", () => {
    const gl = makeMockGl();
    const renderer = new WebGL2Renderer();
    (renderer as RendererInternals).gl = gl;

    const geo = makeGeometry();
    const objA = new Object3D("A");
    const objB = new Object3D("B");

    const meshA = (renderer as RendererInternals)._getOrCreateMesh(objA, geo);
    expect(gl.createBuffer).toHaveBeenCalledTimes(1);
    expect(meshA.refCount).toBe(1);

    const meshB = (renderer as RendererInternals)._getOrCreateMesh(objB, geo);
    expect(meshB).toBe(meshA);
    // No second GPU buffer was created for the shared geometry.
    expect(gl.createBuffer).toHaveBeenCalledTimes(1);
    expect(meshA.refCount).toBe(2);
  });

  it("does not delete the shared buffer while another object still references it", () => {
    const gl = makeMockGl();
    const renderer = new WebGL2Renderer();
    (renderer as RendererInternals).gl = gl;

    const geo = makeGeometry();
    const objA = new Object3D("A");
    const objB = new Object3D("B");

    (renderer as RendererInternals)._getOrCreateMesh(objA, geo);
    (renderer as RendererInternals)._getOrCreateMesh(objB, geo);

    (renderer as RendererInternals).releaseObjectResources(objA);
    expect(gl.deleteBuffer).not.toHaveBeenCalled();

    (renderer as RendererInternals).releaseObjectResources(objB);
    expect(gl.deleteBuffer).toHaveBeenCalled();
  });

  it("releases the old geometry and acquires the new one when an object's geometry is reassigned at runtime", () => {
    const gl = makeMockGl();
    const renderer = new WebGL2Renderer();
    (renderer as RendererInternals).gl = gl;

    const geoA = makeGeometry();
    const geoB = makeGeometry();
    const obj = new Object3D("Swappable");

    const meshA = (renderer as RendererInternals)._getOrCreateMesh(obj, geoA);
    expect(meshA.refCount).toBe(1);

    // Simulate `obj.material = newMaterial`-style live reassignment: same object,
    // new geometry, still attached to the scene -- no explicit release call.
    const meshB = (renderer as RendererInternals)._getOrCreateMesh(obj, geoB);
    expect(meshB.refCount).toBe(1);
    expect(meshA.refCount).toBe(0);
    expect(gl.deleteBuffer).toHaveBeenCalled(); // geoA's buffers were freed
  });

  it("releases geometry via the Scene removal queue when an object is fully removed", () => {
    const gl = makeMockGl();
    const renderer = new WebGL2Renderer();
    (renderer as RendererInternals).gl = gl;

    const scene = new Scene();
    const geo = makeGeometry();
    const obj = new Object3D("Removable");
    obj.geometry = geo;
    scene.add(obj);

    const mesh = (renderer as RendererInternals)._getOrCreateMesh(obj, geo);
    expect(mesh.refCount).toBe(1);

    scene.remove(obj);
    (renderer as RendererInternals)._releaseRemovedObjects(scene.consumeRemovedObjects());

    expect(mesh.refCount).toBe(0);
    expect(gl.deleteBuffer).toHaveBeenCalled();
  });

  it("also releases descendants when a parent with children is removed from the scene", () => {
    const gl = makeMockGl();
    const renderer = new WebGL2Renderer();
    (renderer as RendererInternals).gl = gl;

    const scene = new Scene();
    const parentGeo = makeGeometry();
    const childGeo = makeGeometry();

    const parent = new Object3D("Parent");
    parent.geometry = parentGeo;
    const child = new Object3D("Child");
    child.geometry = childGeo;
    parent.add(child);
    scene.add(parent);

    const parentMesh = (renderer as RendererInternals)._getOrCreateMesh(parent, parentGeo);
    const childMesh = (renderer as RendererInternals)._getOrCreateMesh(child, childGeo);

    scene.remove(parent);
    (renderer as RendererInternals)._releaseRemovedObjects(scene.consumeRemovedObjects());

    expect(parentMesh.refCount).toBe(0);
    expect(childMesh.refCount).toBe(0);
  });
});
