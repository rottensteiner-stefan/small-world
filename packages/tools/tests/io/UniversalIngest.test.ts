import { describe, it, expect } from "vitest";
import { zipSync, gzipSync } from "fflate";
import {
  matchPbrSlots,
  ArchiveDecompressor,
  UniversalIngestRouter,
} from "../../src/common/io/index.js";

describe("Universal Ingestion Engine", () => {
  describe("PbrSlotMatcher", () => {
    it("matches multi-file texture batches to PBR slots", () => {
      const dummyBlob = new Blob(["dummy"], { type: "image/png" });
      const files = [
        { name: "dungeon_brick_albedo.png", blob: dummyBlob },
        { name: "dungeon_brick_normal.png", blob: dummyBlob },
        { name: "dungeon_brick_roughness.png", blob: dummyBlob },
        { name: "dungeon_brick_metallic.png", blob: dummyBlob },
        { name: "dungeon_brick_ao.png", blob: dummyBlob },
        { name: "readme.txt", blob: new Blob(["txt"], { type: "text/plain" }) },
      ];

      const pbr = matchPbrSlots(files);
      expect(pbr).not.toBeNull();
      expect(pbr!.name).toBe("dungeon_brick");
      expect(pbr!.albedo).toBeDefined();
      expect(pbr!.normal).toBeDefined();
      expect(pbr!.roughness).toBeDefined();
      expect(pbr!.metallic).toBeDefined();
      expect(pbr!.ao).toBeDefined();
      expect(pbr!.height).toBeUndefined();
    });

    it("recognizes alternative suffixes like _diff, _norm, _rgh, _disp", () => {
      const dummyBlob = new Blob(["dummy"], { type: "image/png" });
      const files = [
        { name: "rusted_iron_diff.jpg", blob: dummyBlob },
        { name: "rusted_iron_norm.png", blob: dummyBlob },
        { name: "rusted_iron_rgh.webp", blob: dummyBlob },
        { name: "rusted_iron_disp.png", blob: dummyBlob },
      ];

      const pbr = matchPbrSlots(files);
      expect(pbr).not.toBeNull();
      expect(pbr!.albedo).toBeDefined();
      expect(pbr!.normal).toBeDefined();
      expect(pbr!.roughness).toBeDefined();
      expect(pbr!.height).toBeDefined();
    });

    it("returns null if not enough matching slots are present", () => {
      const dummyBlob = new Blob(["dummy"], { type: "text/plain" });
      const files = [
        { name: "document.pdf", blob: dummyBlob },
        { name: "notes.txt", blob: dummyBlob },
      ];

      const pbr = matchPbrSlots(files);
      expect(pbr).toBeNull();
    });
  });

  describe("ArchiveDecompressor", () => {
    it("decompresses GZIP files in memory", async () => {
      const decompressor = new ArchiveDecompressor();
      const content = new TextEncoder().encode('{"name": "test_map", "version": 1}');
      const gzipped = gzipSync(content);

      const result = await decompressor.decompressGzip(gzipped, "level.json.gz");
      expect(result.name).toBe("level.json");
      expect(result.mimeType).toBe("application/json");
      const text = new TextDecoder().decode(result.data);
      expect(JSON.parse(text).name).toBe("test_map");
    });

    it("unpacks ZIP files into sanitized IngestFileItem entries", async () => {
      const decompressor = new ArchiveDecompressor();
      const zipData = zipSync({
        "manifest.json": new TextEncoder().encode('{"kit": "scifi"}'),
        "textures/wall_albedo.png": new Uint8Array([1, 2, 3, 4]),
      });

      const items = await decompressor.unpackZip(zipData);
      expect(items.length).toBe(2);
      const manifest = items.find((i) => i.name === "manifest.json");
      const texture = items.find((i) => i.name === "wall_albedo.png");
      expect(manifest).toBeDefined();
      expect(manifest!.mimeType).toBe("application/json");
      expect(texture).toBeDefined();
      expect(texture!.path).toBe("textures/wall_albedo.png");
    });
  });

  describe("UniversalIngestRouter", () => {
    const router = new UniversalIngestRouter();

    it("routes raw JSON string to kind json", async () => {
      const jsonStr = JSON.stringify({ author: "SmallWorld", entities: [1, 2, 3] });
      const res = await router.routeText(jsonStr, "test_config");
      expect(res.kind).toBe("json");
      if (res.kind === "json") {
        expect((res.data as { author: string }).author).toBe("SmallWorld");
        expect(res.name).toBe("test_config.json");
      }
    });

    it("routes raw plain text to kind text", async () => {
      const text = "Hello Small World 3D!";
      const res = await router.routeText(text, "greeting");
      expect(res.kind).toBe("text");
      if (res.kind === "text") {
        expect(res.text).toBe("Hello Small World 3D!");
      }
    });

    it("routes multi-file PBR texture batch to kind pbr-set", async () => {
      const albedoFile = new File([new Uint8Array([0])], "cobblestone_albedo.png", {
        type: "image/png",
      });
      const normalFile = new File([new Uint8Array([0])], "cobblestone_normal.png", {
        type: "image/png",
      });
      const roughFile = new File([new Uint8Array([0])], "cobblestone_roughness.png", {
        type: "image/png",
      });

      const res = await router.routeFiles([albedoFile, normalFile, roughFile]);
      expect(res.kind).toBe("pbr-set");
      if (res.kind === "pbr-set") {
        expect(res.name).toBe("cobblestone");
        expect(res.pbrSet.albedo).toBeDefined();
        expect(res.pbrSet.normal).toBeDefined();
        expect(res.pbrSet.roughness).toBeDefined();
      }
    });

    it("routes ZIP package containing glTF to kind gltf", async () => {
      const zipData = zipSync({
        "robot.gltf": new TextEncoder().encode('{"asset": {"version": "2.0"}}'),
        "robot.bin": new Uint8Array([0, 1, 2]),
      });

      const res = await router.routeZipArchive(zipData, "robot_model.zip");
      expect(res.kind).toBe("gltf");
      if (res.kind === "gltf") {
        expect(res.mainFile).toBe("robot.gltf");
        expect(res.name).toBe("robot");
      }
    });

    it("routes ZIP package containing PBR maps to kind pbr-set", async () => {
      const zipData = zipSync({
        "wood_albedo.png": new Uint8Array([0]),
        "wood_normal.png": new Uint8Array([0]),
        "wood_roughness.png": new Uint8Array([0]),
      });

      const res = await router.routeZipArchive(zipData, "wood_pack.zip");
      expect(res.kind).toBe("pbr-set");
      if (res.kind === "pbr-set") {
        expect(res.name).toBe("wood");
        expect(res.pbrSet.albedo).toBeDefined();
        expect(res.pbrSet.normal).toBeDefined();
      }
    });
  });
});
