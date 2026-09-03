# Vollständiges Codebase-Review — 2026-09-03

**Auftrag:** Kompletter kritischer Review der gesamten `src/`-Codebase (396 TS-Dateien, ~64.7k LOC) durch
5 parallele Reviewer-Agenten, je einem Subsystem zugeteilt. Maßstab: TypeScript-/Architektur-/3D-Engine-Profi
mit kritischem Blick — echte, verifizierte Findings (Bugs, Anti-Patterns, Performance-Fallen, tote/spekulative
Codepfade, Architekturbrüche), keine spekulativen Nitpicks ohne Substanz. Auch Positives wird festgehalten.

Vorläufer/Referenz: [`maker-property-panel-row-grouping-review.md`](../maker-property-panel-row-grouping-review.md)
(Review des uncommitted Maker-Diffs, gleicher Maßstab, u.a. ein verifizierter DOM-Leak-Fund).

Jeder Agent schreibt **laufend** in seine Datei (nicht erst am Ende) — Status-Spalte unten wird von mir
aktualisiert, sobald ein Agent zurückmeldet.

## Zuteilung

| # | Datei | Scope (Verzeichnisse) | Dateien (ca.) | Status |
|---|-------|------------------------|----------------|--------|
| A | [01-core-foundations.md](01-core-foundations.md) | `src/core/*.ts` (Scene, Object3D, SmallWorld, Octree, FrustumCuller, InteractionManager, ...), `src/core/{events,fsm,stage,threading,helpers,animation,controllers,text,textures,colors}`, `src/math`, `src/interfaces`, `src/enums` | ~115 | ⚠️ mit kritischen Funden fertig (4× 🔴, 7× 🟠, 5× 🟡) |
| B | [02-materials-lights-cameras-behaviors.md](02-materials-lights-cameras-behaviors.md) | `src/core/materials`, `src/core/lights`, `src/core/cameras`, `src/core/behaviors`, `src/core/showcase` | ~72 | ⚠️ mit kritischen Funden fertig (5× 🔴) |
| C | [03-rendering-backends.md](03-rendering-backends.md) | `src/renderers/**` (WebGL1, WebGL2, WebGPU, passes, post), `src/core/renderers/shaders` | ~67 | ⚠️ mit kritischen Funden fertig (7× 🔴, 5× 🟠, 5× 🟡, 1× 🟢) |
| D | [04-geometry-loaders-physics-audio.md](04-geometry-loaders-physics-audio.md) | `src/geometry`, `src/loaders`, `src/physix`, `src/audio`, `src/extensions`, `src/utils` | ~81 | ⚠️ mit kritischen Funden fertig (5× 🔴) |
| E | [05-tools-apps.md](05-tools-apps.md) | `src/tools/**` (maker, forge, common), `src/apps/**` (yad, neon-labyrinth, and-now, light-cycle-arena) | ~57 | ⚠️ mit kritischen Funden fertig (2× 🔴) |

Status-Legende: 🔵 läuft · 🟢 fertig · ⚠️ mit kritischen Funden fertig

Alle 5 Agenten fertig. **Gesamt: 23× 🔴 kritisch, ~29× 🟠 fragil, ~20× 🟡 Stil/Cleanup, mehrere 🟢 Test-Lücken**, plus ausführliche ✅-Positiv-Abschnitte in jeder Datei.

## Aggregierte Kritisch-Funde (🔴) — zur schnellen Priorisierung

### A — Core Foundations (4×)
- [x] ~~`Object3D.lookAt()` schreibt nur Euler-`rotation`, `updateMatrixWorld()` bevorzugt aber `quaternion` falls gesetzt → Rotation wird für praktisch jedes glTF-geladene/animierte Objekt stillschweigend verschluckt.~~ *(✅ Behoben)*
- [x] ~~`Input.ts` registriert ~15 `window`/`document`-Listener ohne jeden `destroy()`-Pfad; `SmallWorld.destroy()` räumt das nie auf — Leak bei jeder Engine-Instanz, widerspricht der "mehrere Engine-Instanzen pro Seite"-Architekturgarantie.~~ *(✅ Behoben)*
- [x] ~~`PlanarReflectionNode.updateReflection()` setzt den gespiegelten `up`-Vektor NACH `updateViewMatrix()` — Korrektur greift nie (im Gegensatz zu `DynamicReflectionProbe`, das die Reihenfolge richtig hat).~~ *(✅ Behoben)*
- [x] ~~`EventDispatcherImpl.dispatchEvent()` alloziert bei jedem Aufruf ein neues Array (`.slice(0)`) — direkter Verstoß gegen CONTEXT.md's eigenes Zero-Allocation-Beispiel "event dispatch", erreichbar über jedes Physik-Kollisionsevent.~~ *(✅ Behoben)*

### B — Materials/Lights/Cameras/Behaviors (5×)
- [x] ~~`Color.WHITE` (gefrorenes Singleton) wird an 7 Stellen als Default per Referenz zugewiesen — jede In-Place-Farbmutation (RainbowBehavior, Maker-Farbinspector) wirft `TypeError`.~~ *(✅ Behoben)*
- [x] ~~`CameraStrategyFactory` gibt gecachte Singleton-Strategie-Instanzen mit per-Kamera-mutablem State aus — mehrere Kameras mit gleicher Strategie korrumpieren sich gegenseitig.~~ *(✅ Behoben)*
- [x] ~~`CloneUtils.shallowCloneWithValueTypes()` klont nur Vector3D/Quaternion/Color tief, nicht Vector2D/Arrays/Plain Objects — mehrere Material-/Behavior-Felder leaken Referenzen zwischen Original und Klon.~~ *(✅ Behoben)*
- [x] ~~`AreaLight` ist unter `StandardMaterial` (PBR) auf allen 3 Backends komplett unsichtbar — keine PBR-Lighting-Chunk wertet sie aus.~~ *(✅ Behoben)*
- [x] ~~`AbstractShowcase` registriert einen anonymen, nie entfernbaren `keydown`-Listener auf `window` — bricht `SmallWorld.destroy()`s dokumentierten "entfernt alle globalen Listener"-Vertrag für jede Showcase.~~ *(✅ Behoben)*

### C — Rendering Backends (7×)
- [x] ~~Clustered Forward+ Lighting kaputt auf WebGL2 (falscher `AreaLight`-UBO-Stride, 112 statt 96 Byte → Cluster-Dims lesen immer Null) UND auf WebGPU (`cluster_cull.wgsl` nutzt falsche NDC→Pixel-Y-Konvention → vertikal gespiegelte Cluster-Zuordnung).~~ *(✅ Behoben)*
- [x] ~~WebGPU `_packObjectUniforms()`-Alpha-Fallback-Bug kann `CustomShaderMaterial`-Objekte komplett unsichtbar rendern.~~ *(✅ Behoben)*
- [x] ~~Fehlende `_activeRenderTarget`-Guards auf WebGPU TAA/Bloom/HBAO (im Gegensatz zu HZB) — Reflection-Probe-Renders kontaminieren die persistente TAA-History.~~ *(✅ Behoben)*
- [x] ~~`_depthTexture`-Leak bei jedem WebGPU-Resize.~~ *(✅ Behoben)*
- [x] ~~WebGL-Post-Processing-Uber-Shader-Rekompilierung bei jedem Slider-Tweak (`PostProcessPassGL.ts`).~~ *(✅ Behoben)*

### D — Geometry/Loaders/Physics/Audio (5×)
- [x] ~~`PhysicsSystem.ts` Positionskorrektur (`depth/totalInvMass + 0.005`) konvergiert nie — ruhende Kugel oszilliert für immer zwischen zwei Y-Positionen (per Test verifiziert).~~ *(✅ Behoben)*
- `Object3D.computeBounds()` verwirft eine manuell zugewiesene `OBB` und ersetzt sie durch eine simple `BoundingBox`, sobald das Objekt Geometrie hat; zusätzlich totes/auskommentiertes `OBB.transform()`-Scale-Extraction.
- Systemisches NaN bei `radius=0`/`segments=0` über fast jede parametrische Geometrie (Sphere, Torus, Cylinder, ...).
- Jeder Loader nutzt weiterhin das deprecated, prozessweite `AssetManager`-Singleton statt der bereits existierenden Instance-basierten Alternative.
- `SynthSFX.startDrone()`/`startFire()` erzeugen dauerhaft laufende Web-Audio-Graphen ohne Stop-Mechanismus — live bestätigt in `yad/LevelBuilder.ts` (einmal pro Lichtquelle pro Level).

### E — Tools/Apps (2×)
- `light-cycle-arena/ArenaGrid.isFree()` behandelt Zellen der eigenen Trail-Spur als frei — Cycle kollidiert nie mit sich selbst (Tron-Kernregel gebrochen, per Test verifiziert).
- `ForgeWindow.ts`: jedes Fenster registriert 10 permanente `window`-Listener (Drag + 4 Resize-Handles) ohne gespeicherte Funktionsreferenzen; `destroy()` existiert, wird aber nirgends aufgerufen.

### Übergreifendes Muster
Auffällig oft wiederkehrend über alle 5 Scopes hinweg: **nie aufgerufene globale `window`/`document`-Event-Listener ohne Cleanup-Pfad** (Input.ts, AbstractShowcase, ForgeWindow, PropertyPanel-Kontextmenüs) und **Reste von Alt-Singleton-Mustern**, die die dokumentierte "No Global Singletons"-Regel unterlaufen (ShaderRegistry-Fallback, CameraStrategyFactory, AssetManager, AsciiMapLegend-Modulzustand, FrustumCuller). Beides lohnt sich als eigenständige, projektweite Aufräum-Iteration statt Einzelfixes.
