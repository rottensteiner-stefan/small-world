# Modular Asset Kits & Out-of-Tree Asset Library Architecture

## Context & Problem

As the Small World ecosystem expands with richer diorama scenes, characters, animations, and 3D props (such as the Tripo3D-generated industrial bulkhead wall lamps, wooden crates, corrugated oil barrels, polygonal debris mounds, and humanoid biped rigs), binary asset volume increases rapidly.

Committing large binary assets (`.glb` models, 2K/4K PBR texture maps, skeletal motion clips, audio) directly into the core engine Git repository causes fundamental issues:
1. **Repository Bloat:** Git tracks binary delta histories inefficiently. The `.git` repository size grows monotonically, slowing down `git clone`, CI builds, and `npm install` for developers who only need the TypeScript rendering/math runtime.
2. **Coupling of Engine & Content:** Sample assets and app-specific props become tangled with engine core modules.
3. **Discoverability & Reusability:** Assets created for one app (e.g. `and-now`) are hard to browse, preview, and reuse in other apps or tools (like `MaterialStudio` or `Maker`).

## Decision

We establish a 3-phase architectural standard for modular asset kits and out-of-tree asset distribution:

### 1. Phase 1: Semantic Kit Structure & Metadata Standard
All reusable assets conform to a standardized kit hierarchy:
- **Location:** `public/assets/kits/<kit-name>/` (e.g. `industrial/`, `characters/`, `materials/`, `urban/`).
- **Standard Asset Bundle:**
  - `model.glb`: Optimized, self-contained binary glTF with embedded PBR textures ($\le 25.000$ triangles, $\le 2\text{K}$ textures).
  - `preview.webp`: Square 512×512 thumbnail for UI inspectors and catalogs.
  - `meta.json`: Semantic descriptors, bounding box extents, material slots, triangle counts, and license/attribution.
- **Metric Unit Standard:** All kits adhere strictly to $1.0\text{ unit} = 1.0\text{ meter}$.

### 2. Phase 2: Out-of-Tree Repository & CDN Distribution
- **Dedicated Asset Repository (`small-world-assets`):** Binary production assets, raw DCC files, and kit bundles are housed in a dedicated repository or Git LFS storage.
- **CDN Distribution:** Assets are published to a high-speed CDN (via GitHub Releases, jsDelivr, or Cloudflare), allowing scenes to reference standard assets via remote URIs without local disk bloat.

### 3. Phase 3: Runtime Catalog Ingest & CLI Tooling
- **`GltfLoader` Catalog Resolution:** Extend `GltfLoader` with catalog alias resolution:
  ```typescript
  // Resolves to local cache or CDN fallback:
  const lamp = await GltfLoader.loadFromCatalog("industrial/wall_lamp");
  ```
- **CLI Download Helper:** Developers can optionally fetch kit bundles into their local workspace on demand:
  ```bash
  npx small-world add kit industrial
  npx small-world add prop industrial/wall_lamp
  ```

## Consequences

- **Lightweight Core Engine:** The core `small-world` engine repository remains lean, fast to clone, and free of heavy binary baggage.
- **Modularity:** Creators can publish and consume self-contained thematic asset packs (e.g. *Graphic Noir Sewer Kit*, *Industrial Bunker Kit*, *Character Starter Kit*).
- **Tooling Compatibility:** `GadgetInspector`, `MaterialStudio`, and future In-Game Scene Editors can dynamically populate asset picker palettes directly from kit manifests.
