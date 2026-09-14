import { describe, it, expect } from "vitest";
import { AssetManager } from "../../src/loaders/AssetManager.js";

describe("AssetManager.resolveUrl", () => {
  it("preserves absolute URLs", () => {
    const manager = new AssetManager();
    expect(manager.resolveUrl("https://example.com/texture.jpg")).toBe(
      "https://example.com/texture.jpg",
    );
    expect(manager.resolveUrl("http://example.com/texture.jpg")).toBe(
      "http://example.com/texture.jpg",
    );
    expect(manager.resolveUrl("//cdn.example.com/texture.jpg")).toBe(
      "//cdn.example.com/texture.jpg",
    );
  });

  it("preserves relative ./ and ../ paths", () => {
    const manager = new AssetManager();
    expect(manager.resolveUrl("./assets/mesh.glb")).toBe("./assets/mesh.glb");
    expect(manager.resolveUrl("../textures/wall.jpg")).toBe("../textures/wall.jpg");
  });

  it("resolves against custom baseUrl with or without trailing slash", () => {
    const manager = new AssetManager();
    manager.setBaseUrl("https://cdn.example.com/root");

    expect(manager.resolveUrl("/assets/and-now/diorama/wall.jpg")).toBe(
      "https://cdn.example.com/root/assets/and-now/diorama/wall.jpg",
    );
    expect(manager.resolveUrl("assets/and-now/diorama/wall.jpg")).toBe(
      "https://cdn.example.com/root/assets/and-now/diorama/wall.jpg",
    );
  });
});
