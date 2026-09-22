import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  GltfLoader,
  registerGltfExtension,
  Texture,
  StandardMaterial,
  Object3D,
} from "@small-world/engine";
import { khrTextureBasisu } from "../src/basisu/KhrTextureBasisu.js";
import { BasisTranscoder } from "../src/basisu/BasisTranscoder.js";

describe("KHR_texture_basisu", () => {
  beforeEach(() => {
    registerGltfExtension(khrTextureBasisu);
  });

  afterEach(() => {
    BasisTranscoder.setTranscodeHandler(null);
  });

  it("resolves Basis Universal texture via custom transcoder and attaches to material", async () => {
    const mockTexture = Texture.empty();
    BasisTranscoder.setTranscodeHandler((_buffer, mimeType) => {
      expect(mimeType).toBe("image/ktx2");
      return mockTexture;
    });

    const ktx2Payload = new Uint8Array([0xab, 0x4b, 0x54, 0x58, 0x20, 0x32, 0x30, 0xbb, 1, 2, 3])
      .buffer;

    const gltf = {
      json: {
        bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: ktx2Payload.byteLength }],
        images: [{ bufferView: 0, mimeType: "image/ktx2" }],
        textures: [
          {
            extensions: {
              KHR_texture_basisu: {
                source: 0,
              },
            },
          },
        ],
        materials: [
          {
            name: "BasisuPbrMaterial",
            pbrMetallicRoughness: {
              baseColorTexture: { index: 0 },
            },
          },
        ],
        meshes: [
          {
            primitives: [
              {
                attributes: {},
                material: 0,
              },
            ],
          },
        ],
        nodes: [{ name: "MaterialNode", mesh: 0 }],
      },
      buffers: [ktx2Payload],
    };

    const loader = new GltfLoader();
    const withParseAccess = loader as unknown as {
      _parse: (gltfData: typeof gltf, baseUrl: string) => Promise<Object3D>;
    };

    const scene = await withParseAccess._parse(gltf, "");
    expect(scene).toBeDefined();

    const node = scene.getObjectByName("MaterialNode");
    expect(node).toBeDefined();

    // Verify the material received the mock texture
    // Check material resolution directly
    const parseMat = loader as unknown as {
      _parseMaterial: (
        m: unknown,
        json: unknown,
        folder: string,
        buffers: ArrayBuffer[],
      ) => Promise<StandardMaterial>;
    };
    if (parseMat._parseMaterial) {
      const mat = await parseMat._parseMaterial(
        gltf.json.materials[0],
        gltf.json,
        "",
        gltf.buffers,
      );
      expect(mat.diffuseMap).toBe(mockTexture);
    }
  });

  it("handles missing basisu source index gracefully by returning null", async () => {
    const textureDef = {
      extensions: {
        KHR_texture_basisu: {
          source: 99, // out of bounds
        },
      },
    };

    const readCtx = { json: { images: [] }, state: new Map() };
    const res = await khrTextureBasisu.resolveTexture?.(textureDef, readCtx, "", [], {} as never);

    expect(res).toBeNull();
  });

  it("loads external URI images via assetManager.loadBinary [MAJ-09]", async () => {
    const mockTexture = Texture.empty();
    BasisTranscoder.setTranscodeHandler((_buffer, mimeType) => {
      expect(mimeType).toBe("image/ktx2");
      return mockTexture;
    });

    const textureDef = {
      extensions: {
        KHR_texture_basisu: {
          source: 0,
        },
      },
    };

    const readCtx = {
      json: {
        images: [{ uri: "textures/compressed.ktx2" }],
      },
      state: new Map(),
    };

    const fakePayload = new Uint8Array([1, 2, 3, 4]).buffer;
    const mockAssetManager = {
      loadBinary: async (url: string): Promise<ArrayBuffer> => {
        expect(url).toBe("https://assets.local/textures/compressed.ktx2");
        return fakePayload;
      },
    };

    const res = await khrTextureBasisu.resolveTexture?.(
      textureDef,
      readCtx,
      "https://assets.local/",
      [],
      mockAssetManager as never,
    );

    expect(res).toBe(mockTexture);
  });
});
