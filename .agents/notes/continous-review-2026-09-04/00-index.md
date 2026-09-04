# Fortsetzungs-Review — 2026-09-04 (letzte 48h)

**Auftrag:** Kritischer Review NUR der Änderungen der letzten 48 Stunden (Commit-Range
`1d70c608..HEAD`, 47 Commits, 236 Dateien, ~10.8k Zeilen hinzugefügt / ~3.7k entfernt) durch
5 parallele Reviewer-Agenten, je einem Subsystem zugeteilt. Fortsetzung von
[`full-review-2026-09-03`](../full-review-2026-09-03/00-index.md) — dieser Zeitraum enthält
größtenteils die Fixes für dessen Funde, plus neue Arbeit (Liquid-Material-Konsolidierung,
`extensions/`→domänenspezifischer Umbau, Maker-Tool-Erweiterungen). Maßstab unverändert:
TypeScript-/Architektur-/3D-Engine-Profi mit kritischem Blick — echte, verifizierte Findings
(Bugs, Anti-Patterns, Performance-Fallen, tote/spekulative Codepfade, Architekturbrüche,
Regressionen ggü. den behobenen Vorbefunden), keine spekulativen Nitpicks ohne Substanz. Prüfe
explizit gegen die alt-eingesessenen Regeln aus `.agents/AGENTS.md` (No Global Singletons,
Right-Handed System, Strict Types/kein `any`, Fail-Fast ohne Werfen in Settern, Behavior-System
statt Controller-Arrays) und gegen die in `full-review-2026-09-03` dokumentierten wiederkehrenden
Muster (Listener-Leaks ohne Cleanup, Alt-Singleton-Reste). Auch Positives wird festgehalten.

Jeder Agent schreibt **laufend** in seine Datei — Status-Spalte wird aktualisiert, sobald ein
Agent zurückmeldet.

## Zuteilung

| # | Datei | Scope (Verzeichnisse/Dateien) | Status |
|---|-------|------------------------|--------|
| A | [01-core-foundations.md](01-core-foundations.md) | `src/core/*.ts` (Object3D, Input, EventDispatcherImpl, CloneUtils, SmallWorld, FrustumCuller, InteractionManager, DeviceCaps, FPSCounter, PlanarReflectionNode, Scene, SpawnPoint, Sprite, UniversalGamepadController, Inspectable, ImposterSprite, BillboardInstancer), `src/core/animation/**`, `src/core/behaviors/**`, `src/core/events/**`, `src/core/cameras/CameraStrategyFactory.ts`, `src/environment/**`, `src/math/MathUtils.ts`, `src/core/index.ts` | ⚠️ mit kritischem Fund fertig (1× 🔴) |
| B | [02-materials-lights-shaders.md](02-materials-lights-shaders.md) | `src/core/materials/**` (inkl. neuer `LiquidWaveMaterial`/`OpenWaterMaterial`/`StylizedWaterMaterial`/`LavaMaterial`/`SlimeMaterial`/`FluidSurfaceMaterial` + Shader-Chunks), `src/core/lights/**`, `src/core/renderers/shaders/**` (ShaderRegistry, CoreShaderChunks, StandardWebGPULayout, UniformPacker, alle geänderten `.wgsl`/`.glsl`-Chunks), `src/core/showcase/AbstractShowcase.ts` | ⚠️ mit kritischem Fund fertig (1× 🔴) |
| C | [03-rendering-backends.md](03-rendering-backends.md) | `src/renderers/**` (WebGL1Renderer, WebGL2Renderer, WebGPURenderer, WebGLTextureManager, GPUGeometryCache, ImposterBaker, RendererFactory, passes/CascadedShadowPassGPU, passes/SpotShadowPassGPU, passes/WebGLShadowPass, post/elements/OutlineElement, post/passes/PostProcessPassGL) | 🟢 fertig, alle 7 Vorbefunde sauber gefixt, keine neuen 🔴 |
| D | [04-geometry-loaders-physics-audio.md](04-geometry-loaders-physics-audio.md) | `src/geometry/**` (NaN-Guards in allen parametrischen Geometrien), `src/loaders/**` (inkl. entferntem `GeometryWorkerProcessor.ts`), `src/physix/OBB.ts`, `src/physix/PhysicsSystem.ts`, `src/audio/AudioSystem.ts`, `src/audio/SynthSFX.ts` | 🟢 fertig, alle 5 Vorbefunde sauber gefixt, keine neuen 🔴 |
| E | [05-tools-apps.md](05-tools-apps.md) | `src/tools/forge/**`, `src/tools/maker/**` (inkl. neuem `LightGizmoManager.ts`, `PropertyPanel.ts`, `UndoStack.ts`, `MakerApp.ts`), `src/tools/procgen/**`, `src/apps/light-cycle-arena/**`, `src/apps/yad/core/LevelBuilder.ts`, `src/apps/and-now/scenes/prologue/PrologueScene.ts` (entfernt -- prüfen ob referenzlos), Showcase-Dateien (`showcases/10,11,15,16,24-26,31-34`) | 🟢 fertig, keine neuen 🔴 (1× 🟠 bekannt, kein Regress) |

Status-Legende: 🔵 läuft · 🟢 fertig · ⚠️ mit kritischen Funden fertig

Alle 5 Agenten fertig. **Gesamt: 2× neuer 🔴 kritischer Fund**, alle 18 aus `full-review-2026-09-03` dokumentierten kritischen Vorbefunde (4+5+7+5+2, verteilt über A-E) sind verifiziert vollständig und korrekt gefixt — keine oberflächlichen/Teil-Fixes gefunden. Mehrere 🟠/🟡/🟢-Funde (Details je Datei).

## Neue kritische Funde (🔴) — zur schnellen Priorisierung

### A — Core Foundations (1×)
- [x] ~~`BillboardInstancer.ts:125-135` (`axisLocked: false`, "spherical"-Modus): delegiert an `Object3D.lookAt()`, das die lokale **-Z**-Achse zum Ziel dreht — die `Plane`-Geometrie zeigt aber laut eigenem Doc-Kommentar mit **+Z** nach vorne. Empirisch verifiziert: identische Kameraposition ergibt bei `axisLocked: true` Yaw `+π/2`, bei `axisLocked: false` `-π/2` — exakte 180°-Diskrepanz.~~ *(✅ Behoben: 180°-Flip um Y nach dem `lookAt()`-Copy ergänzt, 2 neue Regressionstests in `tests/core/BillboardInstancer.test.ts`.)*

### B — Materials/Lights/Shaders (1×)
- [x] ~~`WebGPURenderer._packObjectUniforms()` (`src/renderers/WebGPU/WebGPURenderer.ts:1747-1753`) überschreibt für jedes Objekt ohne Skelett bedingungslos `u_isSkinned`/`u_boneOffset` — *nachdem* die Materialwerte reingeschrieben wurden. `LiquidWaveMaterial` (neu, dieses Fenster) zweckentfremdet genau diese beiden Slots für `waterAbsorption.r`/`.g` (OpenWaterMaterial/StylizedWaterMaterial). Da Wasser-Meshes nie ein Skelett haben, werden diese Kanäle auf WebGPU immer auf `0.0` gezwungen.~~ *(✅ Behoben: Default-Zweig jetzt mit `values["u_isSkinned"] === undefined` geguarded, analog zum bestehenden `u_color`-Fallback; neuer Regressionstest in `tests/renderers/WebGPUSkinning.test.ts`.)*

### Cross-Cutting: durchgängig sauberer Fix-Batch
Anders als beim letzten Review kein wiederkehrendes systemisches Muster (z.B. Listener-Leaks) mehr gefunden — alle in `full-review-2026-09-03` dokumentierten Leak-/Singleton-Fixes wurden geprüft und sind vollständig (inkl. `CameraStrategyFactory`, `DeviceCaps` WebGL-Probe-Context-Leak, `ForgeWindow`, `AbstractShowcase`). Die beiden neuen 🔴-Funde sind beide **neue Regressionen aus dieser Session** (Billboard-Feature bzw. Liquid-Material-Konsolidierung), nicht wiederkehrende Altlasten.
