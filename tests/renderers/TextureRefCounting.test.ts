import "../../src/index.js";
import { describe, expect, it, vi } from "vitest";
import { WebGL2Renderer } from "../../src/renderers/WebGL2/WebGL2Renderer.js";
import { Texture } from "../../src/core/textures/Texture.js";
import { RenderTarget } from "../../src/core/textures/RenderTarget.js";
import { Object3D } from "../../src/core/Object3D.js";

function makeMockGl(): WebGL2RenderingContext {
  return { deleteTexture: vi.fn() } as unknown as WebGL2RenderingContext;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RendererInternals = any;

describe("WebGL2 texture reference counting", () => {
  it("shares a texture across two objects and only deletes it once both release it", () => {
    const gl = makeMockGl();
    const renderer = new WebGL2Renderer();
    (renderer as RendererInternals).gl = gl;

    const tex = Texture.empty();
    const glTex = {};
    (renderer as RendererInternals)._texCache.set(tex, glTex);

    const objA = new Object3D("A");
    const objB = new Object3D("B");

    (renderer as RendererInternals)._acquireTextures(objA, { u_diffuseMap: tex });
    (renderer as RendererInternals)._acquireTextures(objB, { u_diffuseMap: tex });
    expect((renderer as RendererInternals)._texRefCounts.get(tex)).toBe(2);

    (renderer as RendererInternals)._releaseObjectTextures(objA);
    expect(gl.deleteTexture).not.toHaveBeenCalled();

    (renderer as RendererInternals)._releaseObjectTextures(objB);
    expect(gl.deleteTexture).toHaveBeenCalledWith(glTex);
  });

  it("releases the old texture and acquires the new one when a material's texture slot changes", () => {
    const gl = makeMockGl();
    const renderer = new WebGL2Renderer();
    (renderer as RendererInternals).gl = gl;

    const texA = Texture.empty();
    const texB = Texture.empty();
    (renderer as RendererInternals)._texCache.set(texA, {});

    const obj = new Object3D("Swappable");
    (renderer as RendererInternals)._acquireTextures(obj, { u_diffuseMap: texA });
    expect((renderer as RendererInternals)._texRefCounts.get(texA)).toBe(1);

    (renderer as RendererInternals)._acquireTextures(obj, { u_diffuseMap: texB });
    expect((renderer as RendererInternals)._texRefCounts.get(texA)).toBeUndefined();
    expect((renderer as RendererInternals)._texRefCounts.get(texB)).toBe(1);
    expect(gl.deleteTexture).toHaveBeenCalled();
  });

  it("never destroys a RenderTarget's texture through the material refcount, even at zero references", () => {
    const gl = makeMockGl();
    const renderer = new WebGL2Renderer();
    (renderer as RendererInternals).gl = gl;

    const rt = RenderTarget.create({ width: 4, height: 4 });
    (renderer as RendererInternals)._texCache.set(rt, {});

    const obj = new Object3D("MirrorSurface");
    (renderer as RendererInternals)._acquireTextures(obj, { u_diffuseMap: rt });
    (renderer as RendererInternals)._releaseObjectTextures(obj);

    // The render target is reused across frames independently of this one material
    // reference -- releasing the last object using it must NOT tear down its GPU texture.
    expect(gl.deleteTexture).not.toHaveBeenCalled();
    expect((renderer as RendererInternals)._texCache.has(rt)).toBe(true);
  });
});
