import "../../src/index.js";
import { describe, expect, it, vi, beforeAll } from "vitest";
import { WebGL2Renderer } from "../../src/renderers/WebGL2/WebGL2Renderer.js";
import { CoreShaderChunks } from "../../src/core/renderers/shaders/CoreShaderChunks.js";
import { BasicMaterial } from "../../src/core/materials/BasicMaterial.js";
import { Object3D } from "../../src/core/Object3D.js";
import { MaterialType } from "../../src/enums/index.js";

function makeMockGl(): WebGL2RenderingContext {
  const shaders = new Set<object>();
  const programs = new Set<object>();
  return {
    createShader: vi.fn(() => ({})),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    getShaderParameter: vi.fn(() => true),
    getShaderInfoLog: vi.fn(() => ""),
    createProgram: vi.fn(() => {
      const p = {};
      programs.add(p);
      return p;
    }),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: vi.fn(() => true),
    getProgramInfoLog: vi.fn(() => ""),
    deleteShader: vi.fn((s: object) => shaders.delete(s)),
    deleteProgram: vi.fn(),
    getAttribLocation: vi.fn(() => 0),
    getUniformLocation: vi.fn(() => ({})),
    VERTEX_SHADER: 1,
    FRAGMENT_SHADER: 2,
    COMPILE_STATUS: 3,
    LINK_STATUS: 4,
  } as unknown as WebGL2RenderingContext;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RendererInternals = any;

describe("WebGL2 program reference counting", () => {
  beforeAll(async () => {
    await CoreShaderChunks.init();
  });

  it("compiles a program on first use and reuses it for a second object sharing the material's shader", () => {
    const gl = makeMockGl();
    const renderer = new WebGL2Renderer();
    (renderer as RendererInternals).gl = gl;
    (renderer as RendererInternals)._globalUBO = { bindToProgram: vi.fn() };
    // A real material so ShaderRegistry has a genuine, valid GLSL300 definition to compile.
    new BasicMaterial();

    const objA = new Object3D("A");
    const objB = new Object3D("B");
    const key = (renderer as RendererInternals)._programCacheKey(MaterialType.BASIC, false, []);

    const cacheA = (renderer as RendererInternals)._getProgram(MaterialType.BASIC);
    (renderer as RendererInternals)._acquireProgram(objA, key);
    expect(gl.createProgram).toHaveBeenCalledTimes(1);
    expect(cacheA.refCount).toBe(1);

    (renderer as RendererInternals)._acquireProgram(objB, key);
    expect(gl.createProgram).toHaveBeenCalledTimes(1); // reused, not recompiled
    expect(cacheA.refCount).toBe(2);
  });

  it("does not delete the shared program while another object still references it", () => {
    const gl = makeMockGl();
    const renderer = new WebGL2Renderer();
    (renderer as RendererInternals).gl = gl;
    (renderer as RendererInternals)._globalUBO = { bindToProgram: vi.fn() };
    new BasicMaterial();

    const objA = new Object3D("A");
    const objB = new Object3D("B");
    const key = (renderer as RendererInternals)._programCacheKey(MaterialType.BASIC, false, []);

    (renderer as RendererInternals)._getProgram(MaterialType.BASIC);
    (renderer as RendererInternals)._acquireProgram(objA, key);
    (renderer as RendererInternals)._acquireProgram(objB, key);

    (renderer as RendererInternals)._releaseObjectProgram(objA);
    expect(gl.deleteProgram).not.toHaveBeenCalled();

    (renderer as RendererInternals)._releaseObjectProgram(objB);
    expect(gl.deleteProgram).toHaveBeenCalled();
  });

  it("releases the old program and acquires the new one when an object's material changes shader at runtime", () => {
    const gl = makeMockGl();
    const renderer = new WebGL2Renderer();
    (renderer as RendererInternals).gl = gl;
    (renderer as RendererInternals)._globalUBO = { bindToProgram: vi.fn() };
    new BasicMaterial();

    const obj = new Object3D("Swappable");
    const keyA = (renderer as RendererInternals)._programCacheKey(MaterialType.BASIC, false, []);
    const keyB = (renderer as RendererInternals)._programCacheKey(MaterialType.BASIC, false, [
      "SOME_FLAG",
    ]);

    (renderer as RendererInternals)._getProgram(MaterialType.BASIC);
    (renderer as RendererInternals)._acquireProgram(obj, keyA);
    const resolvedA = (renderer as RendererInternals)._programs.get(keyA);
    expect(resolvedA.refCount).toBe(1);

    (renderer as RendererInternals)._getProgram(MaterialType.BASIC, false, ["SOME_FLAG"]);
    (renderer as RendererInternals)._acquireProgram(obj, keyB);
    const resolvedB = (renderer as RendererInternals)._programs.get(keyB);
    expect(resolvedB.refCount).toBe(1);
    expect(resolvedA.refCount).toBe(0);
    expect(gl.deleteProgram).toHaveBeenCalled();
  });
});
