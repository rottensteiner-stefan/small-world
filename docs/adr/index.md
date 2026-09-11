# Architekturentscheidungen (ADRs)

Dieser Abschnitt enthält die Architekturentscheidungs-Protokolle, die signifikante Architekturentscheidungen, Trade-offs und Designprinzipien in Small World Engine dokumentieren.

## Index der Entscheidungen

- **[ADR 0001: Config-Form (benannte Schlüssel)](./0001-config-shape-named-keys-not-tagged-arrays.md)** — Config-Unterstrukturen nutzen benannte Schlüssel, keine `{ type, ... }`-Arrays.
- **[ADR 0002: TAA-Jitter](./0002-taa-jitter-shared-viewproj-matrix.md)** — TAA-Jitter wird in die gemeinsame View-Projection-Matrix eingebacken, nicht in eine separate.
- **[ADR 0003: Globaler Hit-Stop](./0003-hit-stop-is-global-not-per-entity.md)** — Hit-Stop skaliert die Gameplay-Zeit global, nicht pro Entität.
- **[ADR 0004: Globale Licht-Obergrenze](./0004-point-spot-light-global-cap.md)** — Die Punkt-/Spot-Licht-Obergrenze ist global, nicht pro Objekt.
- **[ADR 0005: CCD nur für Kugeln](./0005-ccd-sphere-only-scope.md)** — Continuous Collision Detection (CCD) deckt nur Kugelkörper ab.
- **[ADR 0006: PCSS-Weichschatten-Umfang](./0006-pcss-directional-light-only.md)** — Directional Lights überall, Spot Lights nur auf WebGPU.
- **[ADR 0007: Clustered Forward+ Lighting](./0007-clustered-lighting-webgl2-webgpu-only.md)** — Raster fester Kapazität, Kapazitätserhöhung nur auf WebGPU.
- **[ADR 0008: Hierarchical-Z-Occlusion-Culling](./0008-hzb-occlusion-culling-webgpu-only.md)** — Nur WebGPU, Kugel-Bounds, einen Frame veraltet.
- **[ADR 0009: Charakter-Pipeline & Mixamo-Rigging](./0009-character-pipeline-and-mixamo-rigging-standard.md)** — Standardisiertes humanoides Skelett, Skalen-Isolation und Socket-Transforms.
- **[ADR 0010: Maker-Editor-Architektur](./0010-maker-editor-architecture.md)** — Eigenständiger 3D-Editor, glTF-2.0-+-`SW_*`-Persistenz, Undo-Stack und Transform-Gizmos.
- **[ADR 0011: Modulare Asset-Kits & Remote-Katalog](./0011-modular-asset-kits-and-remote-catalog.md)** — Out-of-Tree-modulare Asset-Pakete und manifest-gesteuertes Remote-Bibliotheks-Laden.
- **[ADR 0012: Atmosphärisches Indie-Game-Design ("Das Streuner-Prinzip")](./0012-atmospheric-indie-game-design-and-rendering-philosophy.md)** — Story-first-Philosophie, filmische Beleuchtung und Stimmung statt rohem Spec-Jagen.
- **[ADR 0013: Vereinheitlichte Flüssigkeits-Materialien](./0013-unified-liquid-surface-material.md)** — Gemeinsame Flüssigkeits-Shader-Chunks: Wellen-Familie (Ozean/Wasser) und Fluss-Familie (Lava/Schleim).
- **[ADR 0014: Modulares Ökosystem & Domänen-Schichtung](./0014-modular-ecosystem-and-domain-layering.md)** — Auflösung von `extensions/` in domänenspezifische Namensräume (`physix`, `environment`, `geometry`, `audio`).
- **[ADR 0015: App-First-Regel für Genre-Code](./0015-app-first-genre-code-extraction-rule.md)** — Genre-spezifischer Gameplay-Code bleibt in Apps, bis ein zweites Projekt die Extraktion in den Kern verlangt.
- **[ADR 0016: 2.5D-Bühnen-Zonen als glTF-Erweiterung](./0016-2-5d-stage-zones-as-a-gltf-extension.md)** — `SW_stage_zone`/`SW_stage_vanishing_point` erweitern Makers bestehendes Format statt ein zweites zu schaffen; beliebige-*n*-Eck-Zonen und ein datengetriebenes `uvToWorld`.
