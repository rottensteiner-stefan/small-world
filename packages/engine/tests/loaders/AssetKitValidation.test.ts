import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import type { ValidateFunction } from "ajv";

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
  textures?: Array<{
    id: string;
    name: string;
    category: string;
    maps: string[];
  }>;
  decals?: Array<{
    id: string;
    name: string;
    file: string;
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

const kitsRootDir = path.resolve(process.cwd(), "public/assets/kits");

// The formal JSON Schemas own every shape/type/pattern constraint (required fields, `<kit>/<slug>`
// id pattern, enum-ish string patterns, the box-vs-cylinder `dimensions` oneOf). They cannot see
// across files, though -- cross-file cross-references (id equals directory name, item.meta
// resolves to a real file, meta.kit equals the owning manifest's id) stay as explicit assertions
// below instead of being fought into schema keywords no JSON Schema validator can express.
const schemasDir = path.resolve(process.cwd(), "public/schemas");
const ajv = new Ajv2020({ allErrors: true, strict: true });
const kitSchema = JSON.parse(fs.readFileSync(path.join(schemasDir, "kit.schema.json"), "utf-8"));
const propMetaSchema = JSON.parse(
  fs.readFileSync(path.join(schemasDir, "prop-meta.schema.json"), "utf-8"),
);
const validateKit: ValidateFunction = ajv.compile(kitSchema);
const validatePropMeta: ValidateFunction = ajv.compile(propMetaSchema);

function formatAjvErrors(validate: ValidateFunction): string {
  return JSON.stringify(validate.errors, null, 2);
}

// Every kit under `public/assets/kits/` must conform to the same schema (ADR 0011) — discovered
// dynamically so a new kit is validated automatically instead of silently drifting unnoticed the
// way `bunker`/`flakturm` did before this test covered them (they used `props`/`model` with no
// `meta` link, while only `industrial` — the one kit this test used to hardcode — matched the
// schema below).
const kitNames = fs
  .readdirSync(kitsRootDir, { withFileTypes: true })
  .filter(
    (entry) => entry.isDirectory() && fs.existsSync(path.join(kitsRootDir, entry.name, "kit.json")),
  )
  .map((entry) => entry.name)
  .sort();

describe("Asset Kits & Metadata Standards (ADR 0011)", () => {
  it("finds at least one kit to validate", () => {
    expect(kitNames.length).toBeGreaterThan(0);
  });

  describe.each(kitNames)("kit: %s", (kitName) => {
    const kitDir = path.join(kitsRootDir, kitName);
    const manifest: KitManifest = JSON.parse(
      fs.readFileSync(path.join(kitDir, "kit.json"), "utf-8"),
    );

    it("conforms to kit.schema.json", () => {
      const valid = validateKit(manifest);
      expect(valid, formatAjvErrors(validateKit)).toBe(true);
    });

    it("its own $schema pointer resolves to the real schema file (not expressible in the schema itself)", () => {
      const raw = JSON.parse(fs.readFileSync(path.join(kitDir, "kit.json"), "utf-8")) as {
        $schema?: string;
      };
      expect(raw.$schema).toBeDefined();
      const resolved = path.resolve(kitDir, raw.$schema!);
      expect(fs.existsSync(resolved), `$schema does not resolve: ${raw.$schema}`).toBe(true);
      expect(resolved).toBe(path.join(schemasDir, "kit.schema.json"));
    });

    it("has a manifest whose id matches its directory name", () => {
      expect(manifest.id).toBe(kitName);
      expect(manifest.name.length).toBeGreaterThan(0);
      expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(manifest.license.length).toBeGreaterThan(0);
      expect(manifest.author.length).toBeGreaterThan(0);
    });

    it("declares at least one item, texture, or decal", () => {
      const total =
        (manifest.items?.length ?? 0) +
        (manifest.textures?.length ?? 0) +
        (manifest.decals?.length ?? 0);
      expect(total).toBeGreaterThan(0);
    });

    it("every item's id is namespaced `<kit>/<slug>` and its path/preview/meta exist on disk", () => {
      for (const item of manifest.items ?? []) {
        expect(item.id).toBe(`${kitName}/${item.id.split("/").pop()}`);
        expect(item.id.startsWith(`${kitName}/`)).toBe(true);

        const glbPath = path.join(kitDir, item.path);
        const previewPath = path.join(kitDir, item.preview);
        const metaPath = path.join(kitDir, item.meta);

        expect(fs.existsSync(glbPath), `GLB model missing: ${item.path}`).toBe(true);
        expect(fs.existsSync(previewPath), `Preview missing: ${item.preview}`).toBe(true);
        expect(fs.existsSync(metaPath), `Meta JSON missing: ${item.meta}`).toBe(true);

        expect(fs.statSync(glbPath).size).toBeGreaterThan(10000);
        expect(fs.statSync(previewPath).size).toBeGreaterThan(1000);
      }
    });

    it("every item's meta.json conforms to prop-meta.schema.json", () => {
      for (const item of manifest.items ?? []) {
        const meta: unknown = JSON.parse(fs.readFileSync(path.join(kitDir, item.meta), "utf-8"));
        const valid = validatePropMeta(meta);
        expect(valid, `${item.meta}: ${formatAjvErrors(validatePropMeta)}`).toBe(true);
      }
    });

    it("every item's meta.json cross-references its manifest entry (not expressible in a single-file schema)", () => {
      for (const item of manifest.items ?? []) {
        const meta: PropMeta = JSON.parse(fs.readFileSync(path.join(kitDir, item.meta), "utf-8"));
        expect(meta.id).toBe(item.id);
        expect(meta.kit).toBe(manifest.id);
      }
    });

    it("every item's meta.json $schema pointer resolves to the real schema file", () => {
      for (const item of manifest.items ?? []) {
        const metaDir = path.dirname(path.join(kitDir, item.meta));
        const raw = JSON.parse(fs.readFileSync(path.join(kitDir, item.meta), "utf-8")) as {
          $schema?: string;
        };
        expect(raw.$schema, `${item.meta} has no $schema`).toBeDefined();
        const resolved = path.resolve(metaDir, raw.$schema!);
        expect(
          fs.existsSync(resolved),
          `${item.meta}: $schema does not resolve: ${raw.$schema}`,
        ).toBe(true);
        expect(resolved).toBe(path.join(schemasDir, "prop-meta.schema.json"));
      }
    });

    it("every texture entry's id is namespaced and its maps exist on disk", () => {
      for (const tex of manifest.textures ?? []) {
        expect(tex.id.startsWith(`${kitName}/`)).toBe(true);
        const texDir = path.join(kitDir, "textures", tex.id.split("/").pop()!);
        for (const map of tex.maps) {
          expect(
            fs.existsSync(path.join(texDir, map)),
            `Texture map missing: ${tex.id}/${map}`,
          ).toBe(true);
        }
      }
    });

    it("every decal entry's id is namespaced and its file exists on disk", () => {
      for (const decal of manifest.decals ?? []) {
        expect(decal.id.startsWith(`${kitName}/`)).toBe(true);
        const decalPath = path.join(kitDir, "decals", decal.file);
        expect(fs.existsSync(decalPath), `Decal missing: ${decal.file}`).toBe(true);
      }
    });
  });

  // Kit-specific fixtures that go beyond the generic schema above.
  describe("industrial kit fixtures", () => {
    const industrialDir = path.join(kitsRootDir, "industrial");

    it("validates socket configuration on wall_lamp", () => {
      const metaPath = path.join(industrialDir, "wall_lamp/meta.json");
      const meta: PropMeta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));

      expect(meta.sockets).toBeDefined();
      expect(meta.sockets!.length).toBeGreaterThanOrEqual(1);

      const lightBulbSocket = meta.sockets!.find((s) => s.name === "LightBulb");
      expect(lightBulbSocket).toBeDefined();
      expect(lightBulbSocket!.position).toEqual([0, 0, 0.18]);
      expect(lightBulbSocket!.recommendedLight?.type).toBe("PointLight");
      expect(lightBulbSocket!.recommendedLight?.intensity).toBe(3.8);
    });

    it("validates ADR / GHS hazard class labeling on barrels", () => {
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
});
