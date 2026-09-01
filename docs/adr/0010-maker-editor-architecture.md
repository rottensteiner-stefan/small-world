# Maker: World Format & Editor Architecture

## Context & Problem

Small World has grown a rich runtime object model (19 geometry primitives, 16 materials, 5 light types, ~20 behaviors) but no way to *compose* or *persist* a scene other than writing TypeScript by hand. `GadgetInspector` (`src/tools/GadgetInspector.ts`) is the closest existing tool — a Tweakpane-based overlay that raycast-picks a live object and edits its transform/material/light/behavior properties — but its own documentation (`docs/guides/gadget-inspector.md`) lists exactly the gaps that block it from becoming a real editor:

- **No persistence** — `getState()`/`setState()` are explicit no-op stubs; edits vanish on reload.
- **No export** — no way to dump a scene back out as data.
- **No undo/redo.**
- **No object creation/placement** — it only ever edits pre-existing objects.
- **No picking index** — raycasts against every object in the scene graph on every click.
- **No camera controls** — the camera it's given is only used to seed the raycaster.

It also has a scalability problem in how it recognizes properties: `Behavior` has a real, working reflection pattern (`static readonly inspector?: Record<string, InspectorField>`), which `GadgetInspector` reads generically. Materials and lights get no such treatment — they're exposed via hand-written `if ("roughness" in mat) matFolder.addBinding(...)` duck-typing chains, and `Object3D`'s own transform/visibility fields are hardcoded directly in `_buildGUI()`. Three different mechanisms for the same job; a new material property today requires a new line in `GadgetInspector.ts`, not automatic recognition.

Separately, there is no serialization layer anywhere in the engine core — the only `serialize`-adjacent hit in the codebase is unrelated (`ThreadPool`). Building an in-game/in-editor content pipeline (**Maker**) requires solving both problems: a scene needs a real file format, and the property system needs to actually be dynamic rather than hand-maintained.

## Decision

### 1. Generalize the reflection layer, don't keep it Behavior-only

The `InspectorField`/`static inspector` pattern already proven on `Behavior` becomes the shared contract for every editable class: `AbstractMaterial`, `AbstractLight`, geometries, and `Object3D` itself (whose transform/visibility/shadow fields move from hardcoded UI calls to a base-level declarative schema). One generic panel renderer replaces the current three-way split of hardcoded / duck-typed / declarative property exposure. This is additive and backward compatible — existing `Behavior.inspector` declarations keep working unchanged.

### 2. World Format = glTF 2.0 + a `SW_*` extension namespace, not a new format from scratch

Scenes are persisted as glTF 2.0 JSON (node hierarchy, transforms, PBR materials, `KHR_lights_punctual` lights, cameras), reusing `src/loaders/GltfLoader.ts` as the read-side foundation — it already parses the `extensions` object (currently only `KHR_materials_emissive_strength`). Small-World-specific data that has no glTF equivalent (Behaviors and their parameters, physics config, non-PBR material fields) is carried in vendor extension objects under a `SW_*` prefix, exactly the mechanism Khronos designed for this case. A companion `WorldWriter` is added alongside `GltfLoader` to serialize the live `Scene`/`Object3D` graph back into this shape.

Rejected alternatives:
- **A bespoke custom JSON schema**: more control, but reinvents a scene-graph format the industry has already standardized, forfeits interop with Blender/DCC tools, and requires a parser/writer built from zero instead of extending `GltfLoader`.
- **YAML**: rejected on concrete precedent, not taste — Unity's `.unity`/`.prefab` files are YAML and it is a well-known source of merge-conflict pain (Unity ships a dedicated "Smart Merge" tool specifically to cope), plus YAML's scalar-inference ambiguities (the "Norway problem": `no`/`off`/`on` parsed as booleans depending on parser/version).
- **TOML**: fine for flat config, unreadable for deeply nested scene-graph trees (array-of-tables syntax).
- **USD**: the "biggest" industry answer (Pixar/Apple/NVIDIA-backed), but a C++-scale composition system that contradicts `VISION.md`'s "Lightweight over Exhaustive" philosophy — out of scope for an engine this size.

### 3. Maker ships as a standalone page, not a docked Forge tool

Following the existing precedent of `public/tools/pixler.html`, `map-gen.html`, and `xtractor.html` (dedicated asset-editing workflows that don't require a running game canvas), Maker gets `public/tools/maker.html`. This matches its actual scope — composing whole environments, not just live-tweaking one already-running scene — and doesn't require a `SmallWorld` instance to exist first.

### 4. No explicit Save button — autosave, undo-first UX

Every property edit: (a) applies live to the in-memory scene immediately, (b) pushes onto an undo/redo command stack (reusing the pattern already proven in `Pixler`'s "full Undo/Redo history"), (c) triggers a debounced (~500ms) write-through to the bound project folder via the File System Access API (`showDirectoryPicker`/`FileSystemFileHandle`). No modal "Save" dialog for ordinary edits; an "unsaved changes" indicator plays the role a title-bar dot plays on macOS. Cmd+S remains available as an explicit fallback/export path for browsers without File System Access API support.

### 5. GadgetInspector is retired only after feature parity, not on day one

`GadgetInspector`'s pick → property-panel interaction model is correct and stays conceptually; its implementation is superseded incrementally as Maker's generalized panel, picking index, and undo system come online. `GadgetInspector.ts` is deleted and `enableInspector`/the Forge hub repointed at Maker only once Maker covers its documented feature list (persistence, export, undo/redo, creation, picking index, camera controls) — an explicit acceptance gate, not an assumption.

### Phased delivery

0. **Foundation** — generalized reflection metadata across materials/lights/geometry/`Object3D`; minimal glTF+`SW_*` round-trip (transform tree + one material + one light) with tests.
1. **Maker MVP** — standalone page, edit-mode camera, hierarchy panel with real reparenting, generic property panel, object-creation palette (existing geometry/material/light/behavior catalog, nothing new to build), File System Access autosave, undo/redo.
2. **Environment scale** — viewport transform gizmos (translate/rotate/scale handles, not just numeric fields), nested/instanced sub-scenes (prefab-equivalent, e.g. a reusable Flakturm zone or the diorama prop set), a bridge to `MapGenerator`'s existing ASCII/`GridLevelBuilder` pipeline.

3. **Consolidation (Delivered)** — Parity check against §5's gate passed (full persistence, export, undo/redo, creation, picking, bookmarks, transform gizmos, snapping, marquee selection). Maker integrated into `public/index.html` (T-08), `vite.config.ts`, Forge tool listings, and documentation. `GadgetInspector.ts` and its helper modules are retired and deleted from the source tree.

## Consequences

- **Chromium-only autosave.** File System Access API has no Firefox/Safari support today. Accepted as a deliberate scope trade-off for a dev tool, not a blocker — Maker still functions via manual export where the API is absent.
- **glTF verbosity.** glTF's schema is optimized for asset interchange, not for "editor writes a minimal diff every 500ms" — it's more rigid/verbose than a bespoke schema would be. Accepted in exchange for reusing `GltfLoader` and gaining free interop with Blender and other DCC tools.
- **Extension-namespace discipline required.** `SW_*` extension keys must be kept additive and namespaced carefully, or a future glTF spec revision could collide with vendor data — standard glTF extension hygiene, not a new risk class.
- **Migration cost for existing hand-authored scenes.** Showcases/apps built directly in TypeScript are unaffected (Maker is additive tooling); only content authored *through* Maker uses the new format.
- **`GadgetInspector` retired.** Replaced entirely by Maker. Scene inspection and authoring now share a single unified reflection layer (`Inspectable`) and workflow.
