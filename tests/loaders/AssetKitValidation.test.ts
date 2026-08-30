import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

interface KitManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  items: Array<{
    id: string;
    name: string;
    category: string;
    hazardClass?: string;
    path: string;
    preview: string;
    meta: string;
  }>;
  author: string;
  license: string;
}

interface PropMeta {
  id: string;
  name: string;
  category: string;
  kit: string;
  version: string;
  description: string;
  triangles: number;
  materials: number;
  textures: string[];
  dimensions: {
    width: number;
    height: number;
    depth: number;
  };
  recommendedScale: number;
  sockets?: Array<{
    name: string;
    position: [number, number, number];
    recommendedLight?: {
      type: string;
      color: string;
      intensity: number;
      distance: number;
    };
  }>;
  hazardClass?: string;
  author: string;
  license: string;
}

describe("Asset Kits & Metadata Standards (ADR 0011)", () => {
  const kitsRootDir = path.resolve(process.cwd(), "public/assets/kits");

  it("should have a valid industrial kit directory and manifest", () => {
    const industrialKitPath = path.join(kitsRootDir, "industrial/kit.json");
    expect(fs.existsSync(industrialKitPath)).toBe(true);

    const raw = fs.readFileSync(industrialKitPath, "utf-8");
    const manifest: KitManifest = JSON.parse(raw);

    expect(manifest.id).toBe("industrial");
    expect(manifest.name).toBe("Underground & Industrial Kit");
    expect(manifest.version).toBe("1.0.0");
    expect(manifest.items.length).toBeGreaterThanOrEqual(4);
    expect(manifest.license).toBe("CC0-1.0");
  });

  it("should verify that every item in industrial kit has valid paths and files on disk", () => {
    const industrialDir = path.join(kitsRootDir, "industrial");
    const manifest: KitManifest = JSON.parse(
      fs.readFileSync(path.join(industrialDir, "kit.json"), "utf-8"),
    );

    for (const item of manifest.items) {
      const glbPath = path.join(industrialDir, item.path);
      const previewPath = path.join(industrialDir, item.preview);
      const metaPath = path.join(industrialDir, item.meta);

      expect(fs.existsSync(glbPath), `GLB model missing: ${item.path}`).toBe(true);
      expect(fs.existsSync(previewPath), `Preview JPG missing: ${item.preview}`).toBe(true);
      expect(fs.existsSync(metaPath), `Meta JSON missing: ${item.meta}`).toBe(true);

      const glbStats = fs.statSync(glbPath);
      expect(glbStats.size).toBeGreaterThan(10000); // Valid GLB payload

      const previewStats = fs.statSync(previewPath);
      expect(previewStats.size).toBeGreaterThan(1000); // Valid thumbnail payload
    }
  });

  it("should validate prop meta.json schema and dimensions", () => {
    const industrialDir = path.join(kitsRootDir, "industrial");
    const manifest: KitManifest = JSON.parse(
      fs.readFileSync(path.join(industrialDir, "kit.json"), "utf-8"),
    );

    for (const item of manifest.items) {
      const metaPath = path.join(industrialDir, item.meta);
      const meta: PropMeta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));

      expect(meta.id).toBe(item.id);
      expect(meta.kit).toBe(manifest.id);
      expect(meta.triangles).toBeGreaterThan(0);
      expect(meta.triangles).toBeLessThanOrEqual(25000); // Low-poly game budget

      expect(meta.dimensions).toBeDefined();
      const hasBoxDims =
        (meta.dimensions as { width?: number }).width !== undefined &&
        (meta.dimensions as { depth?: number }).depth !== undefined;
      const hasCylinderDims = (meta.dimensions as { radius?: number }).radius !== undefined;
      expect(hasBoxDims || hasCylinderDims).toBe(true);
      expect(meta.dimensions.height).toBeGreaterThan(0);
      expect(meta.recommendedScale).toBeGreaterThan(0);
    }
  });

  it("should validate socket configuration on wall_lamp", () => {
    const metaPath = path.join(kitsRootDir, "industrial/wall_lamp/meta.json");
    const meta: PropMeta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));

    expect(meta.sockets).toBeDefined();
    expect(meta.sockets!.length).toBeGreaterThanOrEqual(1);

    const lightBulbSocket = meta.sockets!.find((s) => s.name === "LightBulb");
    expect(lightBulbSocket).toBeDefined();
    expect(lightBulbSocket!.position).toEqual([0, 0, 0.18]);
    expect(lightBulbSocket!.recommendedLight?.type).toBe("PointLight");
    expect(lightBulbSocket!.recommendedLight?.intensity).toBe(3.8);
  });

  it("should validate ADR / GHS hazard class labeling on barrels", () => {
    const industrialDir = path.join(kitsRootDir, "industrial");
    const hazardYellowMeta: PropMeta = JSON.parse(
      fs.readFileSync(path.join(industrialDir, "barrel_hazard_yellow/meta.json"), "utf-8"),
    );
    const chemBlueMeta: PropMeta = JSON.parse(
      fs.readFileSync(path.join(industrialDir, "barrel_chemical_blue/meta.json"), "utf-8"),
    );

    expect(hazardYellowMeta.hazardClass).toBe("ADR Class 6.1 (Toxic) / GHS06");
    expect(chemBlueMeta.hazardClass).toBe("ADR Class 3 (Flammable Liquid) / GHS02");
  });
});
