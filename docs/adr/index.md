# Architecture Decision Records (ADRs)

This section contains the architectural decision records that document significant architectural decisions, trade-offs, and design principles in Small World Engine.

## Index of Decisions

- **[ADR 0001: Config Shape (Named Keys)](./0001-config-shape-named-keys-not-tagged-arrays.md)** — Config sub-structures use named keys, not `{ type, ... }` arrays.
- **[ADR 0002: TAA Jitter](./0002-taa-jitter-shared-viewproj-matrix.md)** — TAA jitter is baked into the shared view-projection matrix, not a separate one.
- **[ADR 0003: Global Hit-Stop](./0003-hit-stop-is-global-not-per-entity.md)** — Hit-stop scales gameplay time globally, not per entity.
- **[ADR 0004: Global Light Cap](./0004-point-spot-light-global-cap.md)** — Point/spot light cap is global, not per-object.
- **[ADR 0005: CCD Sphere-Only Scope](./0005-ccd-sphere-only-scope.md)** — Continuous Collision Detection (CCD) covers sphere bodies only.
- **[ADR 0006: PCSS Soft Shadows Scope](./0006-pcss-directional-light-only.md)** — Directional lights everywhere, spot lights on WebGPU only.
- **[ADR 0007: Clustered Forward+ Lighting](./0007-clustered-lighting-webgl2-webgpu-only.md)** — Fixed-capacity grid, WebGPU-only capacity increase.
- **[ADR 0008: Hierarchical-Z Occlusion Culling](./0008-hzb-occlusion-culling-webgpu-only.md)** — WebGPU-only, sphere bounds, one-frame-stale.
- **[ADR 0009: Character Pipeline & Mixamo Rigging](./0009-character-pipeline-and-mixamo-rigging-standard.md)** — Standardized humanoid armature, scale isolation, and socket transforms.
- **[ADR 0010: Maker Editor Architecture](./0010-maker-editor-architecture.md)** — Standalone 3D editor, glTF 2.0 + `SW_*` persistence, undo stack, and transform gizmos.
- **[ADR 0011: Modular Asset Kits & Remote Catalog](./0011-modular-asset-kits-and-remote-catalog.md)** — Out-of-tree modular asset packs and manifest-driven remote library loading.
- **[ADR 0012: Atmospheric Indie Game Design ("The Stray Principle")](./0012-atmospheric-indie-game-design-and-rendering-philosophy.md)** — Story-first philosophy, cinematic lighting, and mood over raw spec-chasing.
- **[ADR 0013: Unified Liquid Surface Materials](./0013-unified-liquid-surface-material.md)** — Shared liquid shader chunks: Wave family (ocean/water) and Flow family (lava/slime).
- **[ADR 0014: Modular Ecosystem & Domain Layering](./0014-modular-ecosystem-and-domain-layering.md)** — Dissolution of `extensions/` into domain-specific namespaces (`physix`, `environment`, `geometry`, `audio`).
- **[ADR 0015: App-First Genre Code Extraction Rule](./0015-app-first-genre-code-extraction-rule.md)** — Genre-specific gameplay code stays inside apps until a second project requires extraction into core.
