import { describe, expect, it } from "vitest";
import { Texture } from "../../src/core/textures/Texture.js";

describe("Texture", () => {
  it("creates an empty texture that is not loaded", () => {
    const texture = Texture.empty();
    expect(texture.isLoaded).toBe(false);
    expect(texture.image).toBeUndefined();
    expect(texture.needsUpdate).toBe(false);
  });

  it("creates a loaded texture from an image/bitmap via fromImage", () => {
    const bitmap = {} as ImageBitmap;
    const texture = Texture.fromImage(bitmap);
    expect(texture.isLoaded).toBe(true);
    expect(texture.image).toBe(bitmap);
    expect(texture.needsUpdate).toBe(false);
  });

  it("creates a loaded texture backed by a canvas via fromCanvas", () => {
    const canvas = { width: 64, height: 64 } as HTMLCanvasElement;
    const texture = Texture.fromCanvas(canvas);
    expect(texture.isLoaded).toBe(true);
    expect(texture.image).toBe(canvas);
    expect(texture.needsUpdate).toBe(false);
  });

  it("allows flagging a canvas-backed texture for GPU re-upload", () => {
    const canvas = { width: 64, height: 64 } as HTMLCanvasElement;
    const texture = Texture.fromCanvas(canvas);
    texture.needsUpdate = true;
    expect(texture.needsUpdate).toBe(true);
  });
});
