# Small World — Tiefenanalyse & Roadmap für die nahe Zukunft

**Datum:** 2026-07-28
**Kontext:** Folgt auf einen ganzen Tag (2026-07-27) praktischer Arbeit an der WebGL1/WebGL2/WebGPU-Renderer-Parität (GPU-Introspektions-Refactor, WebGPU-Bind-Group-Textur-Budget-Fix, WebGL1-Bloom/FilmGrain-Portierung, garantierte DeviceCaps-Mindestwerte). Dieses Dokument fasst drei parallele Recherche-Durchgänge über den Rest der Codebasis zusammen: Kern-Engine-Systeme (Physik/Audio/Behaviors/Tools/Math), einen systematischen Drei-Wege-Konsistenzabgleich der Shader-Dialekte und die allgemeine Projekt-Gesundheit (Tests/CI/Docs/Changelog/Dependencies). Die Funde unten stammen aus dieser Recherche; Datei-/Zeilenangaben sind ein Ausgangspunkt zur Verifikation, nicht der Nachweis, dass etwas bereits gefixt ist.

---

## 1. Kern-Systeme (nicht renderingbezogen)

**Physik (`src/physix/`) — ausgereift.** Semi-implizites Euler-Verfahren, Fixed-Timestep-Substepping, Octree-Broadphase, vollständige Sphere/Box/OBB-Narrowphase (15-Achsen-SAT), `FluidVolume` (Auftrieb/Widerstand/Strömung), komplett gepoolt (keine Allokationen pro Frame). Skalare (keine Tensor-)Trägheit — passt für Primitive, nicht für lang gestreckte Formen. **Kein CCD** — bestätigt weiterhin die einzige bekannte Lücke. **`docs/guides/physics.md` ist veraltet**: behauptet, Box-Box-Kollisionen seien ungelöst; der Code löst tatsächlich Box-Box, OBB, Sphere-OBB, Sensoren und Fluid-Volumes.

**Audio (`src/audio/AudioSystem.ts`) — dünn.** Eine einzige 466-Zeilen-Datei. Hat Mixer-Graph, einen fest codierten Reverb, räumliche `PannerNode`-Wiedergabe, Listener-Sync. Lücken: keine Steuerung einzelner Wiedergaben über das rohe `play()`-Rückgabeobjekt hinaus, keine Voice-Begrenzung/Pooling, nur ein Reverb-Preset, kein Musik-Crossfade/Ducking. Ein großer Teil der Datei ist maßgeschneiderter, prozeduraler SFX-Code (`startDrone`, `startFire`, `playFootstep`, `playShoot`, `playHurt`, `playTone`), der eher wie Demo-Code wirkt, der in der Kernklasse gelandet ist. Es gibt überhaupt keinen Guide für Audio.

**Core (`src/core/`) — solide.** `Object3D`, `EventDispatcherImpl` (minimales, korrektes Pub/Sub, kein `once()`/keine Wildcards), `StateMachine` (aufgeräumt, hat einen Guide), `InteractionManager`, `Input` (Keyboard/Mouse/Touch/Gamepad inkl. Joy-Con) sind alle vollständig, nirgends Stubs gefunden. 17 Behaviors + `FirstPersonController`, alle fertig. 7 Kamera-Strategien über eine Factory, konsistent umgesetzt.

**Tools (`src/tools/`) — ausgereift, aber undokumentiert.** Forge (Fenster-Manager, hat einen Guide), GadgetInspector (Tweakpane-Szeneneditor), MaterialStudio, Xtractor, Pixler, MapGenerator, ibl-gen — jedes eine echte, mehrere hundert Zeilen umfassende Mini-App. Nur Forge hat einen eigenen Guide; der Rest existiert nur als generierte TypeDoc-API.

**Math (`src/math/`) — solide Grundlagen, eine echte Lücke.** Vector2D/3D, Matrix3/4, Quaternion, Frustum, Projektionen, `MathPool`, Splines (`CatmullRomSpline`/`Curve3D`), sogar ein eigenes `GearMath.ts`. **Nirgends `lerp`/`slerp`/Easing** — `Quaternion` hat überhaupt keine Interpolation. Behaviors und Kamera-Strategien bauen sich deshalb aktuell an jeder einzelnen Stelle ihre eigene, ad-hoc Dämpfung.

---

## 2. Konsistenz der Shader-Dialekte (WGSL / GLSL2 / GLSL100)

Systematischer Drei-Wege-Abgleich über alle Materialien mit vollständigem Dialekt-Trio. Echte Bugs mit hoher Konfidenz, nach Wirkung sortiert:

1. **`FluidSurfaceMaterial`s WebGL2/WebGL1-Shader implementieren das namensgebende Feature ("Depth Fade") gar nicht.** Nur WGSL hat den echten Tiefenpuffer-Fade; GLSL2/100 fahren ein unabhängiges, älteres Ambient/Normal/Specular-Blending. Wirkt wie ein Rewrite, der für WGSL ausgeliefert, aber nie in die anderen beiden Dialekte übertragen wurde (im Gegensatz zu `OpenWaterMaterial`, das seine WebGL1-Depth-Fade-Vereinfachung explizit dokumentiert).
2. **`FluidSurfaceMaterial.frag.glsl100` fehlt eine Textur-Guard, die GLSL2 hat**, was auf WebGL1 zu einer immer aktiven, ungewollten Specular-Aufhellung führt (sampelt bedingungslos die Standard-Weiß-Fallback-Textur der Engine, statt zu prüfen, ob überhaupt eine echte Specular-Map gesetzt wurde).
3. **`TerrainMaterial` verwirft auf WebGL1 stillschweigend das komplette Sand/Grass/Rock/Snow-Biome-Splatting.** `Terrain.frag.glsl100` fällt auf `u_diffuseMap` zurück, das `TerrainMaterial` nie setzt — WebGL1-Terrain rendert dadurch als flache, untexturierte, weiße Geometrie. Kein Kommentar kennzeichnet das als bewussten Kompromiss (anders als beim etablierten Glass/OpenWater-Präzedenzfall, solche Abstriche zu dokumentieren).
4. **`TerrainMaterial`s WGSL-Pfad wendet nie Specular-Highlights an**, während GLSL2 und GLSL100 das beide tun — die einzige Dialekt-Lücke, die in die *andere* Richtung geht (hier fehlt WebGPU ein Feature, das die zwei "einfacheren" Backends haben).

Mittlere Konfidenz (zwei Dialekte stimmen überein, einer weicht ab, kein erklärender Kommentar): `RetroScreenMaterial`s Film-Grain-Staub-Effekt (WGSL dunkelt flächig ab, GLSL2+100 nutzen ein randomisiertes Speckle), `WorldMaterial`s Triplanar-Blend-Kurve (`pow(x,4)` in WGSL/GLSL2 vs. eine lineare Subtraktions-Kurve in GLSL100).

**Außerdem gefunden:** ein verwaister, toter Duplikat-Shader-Baum unter `src/core/renderers/shaders/source/{web_gpu,web_gl1,web_gl2}/materials/*` plus ein veralteter, nie registrierter `terrain.frag.glsl`-Chunk — bestätigt nirgends importiert, enthält einen älteren Terrain-Blend-Algorithmus. Kein aktiver Bug, aber eine echte Falle für künftige Audits (leicht, versehentlich die falsche Datei zu "fixen").

---

## 3. Projekt-Gesundheit

- **Tests:** 45 Testdateien gegenüber 291 Nicht-Test-Dateien in `src/`. `src/audio/` und `src/tools/` (12 Dateien) haben **null** Testabdeckung. Überhaupt keine Coverage-Messung eingerichtet (kein `@vitest/coverage-*`, kein Coverage-Script) — Testqualität ist aktuell nicht quantifiziert.
- **CI:** Ein blockierender `verify`-Job (Typecheck → Lint → Test → Build) — solides Gate. Der `showcases-smoke-test`-Job ist explizit `continue-on-error: true`, weil headless WebGPU in CI unzuverlässig ist — das heißt, **der WebGPU-Renderpfad hat kein erzwungenes CI-Sicherheitsnetz**, genau die Art von Lücke, die den gestrigen 20-Texturen-Bind-Group-Bug so lange unentdeckt ließ.
- **Docs:** 14 Guides, alle in die VitePress-Sidebar eingebunden, generell substanziell (keine Stubs). Kein Guide für Audio oder für irgendein einzelnes Tool außer Forge.
- **Changelog:** 0.69.1 → 0.71.3 in 5 Tagen — hohe, fokussierte Kadenz, durchgängig auf Renderer-Parität ausgerichtet. Wirkt gesund, nicht verzettelt.
- **Showcases:** 25 durchnummerierte + `yad`, breite Feature-Abdeckung, uneinheitliche Klassen-Namensgebung (generisches `ShowcaseN` vs. thematische Namen). Kein Showcase stellt Audio in den Mittelpunkt — passt zur geringen Test-/Doku-Investition bei Audio insgesamt.
- **Dependencies:** nur 6 Runtime-Dependencies (wirklich minimal, passt zur erklärten Positionierung des Projekts), 29 aktuelle devDependencies.

---

## 4. Roadmap-Skizze (nahe Zukunft, priorisiert)

**P0 — Korrektheits-Bugs (klein, gut abgegrenzt, hohe Konfidenz)**
1. ✅ **ERLEDIGT (2026-07-28)** `TerrainMaterial` WebGL1: echtes Biome-Blending verdrahtet. `Terrain.frag.glsl100` portiert jetzt 1:1 den Höhen-/Steilheits-basierten Sand/Grass/Rock/Snow-Blend aus `Terrain.frag.glsl` (GLSL2) statt auf `u_diffuseMap` zurückzufallen. `u_sandMap`/`u_grassMap`/`u_rockMap`/`u_snowMap`/`u_thresholds` waren dank der GPU-Introspektion vom Vortag ohne jede Renderer-Änderung sofort nutzbar. Verifiziert: `tsc`/Lint/Tests/Build grün, Sweep über alle 25 Showcases unter WebGL1 fehlerfrei, Screenshot von Showcase 4 bestätigt echte Grass-/Rock-Texturen statt flachem Weiß.
2. ✅ **ERLEDIGT (2026-07-28)** `FluidSurfaceMaterial` GLSL2: echten Depth-Fade implementiert, 1:1 aus `FluidSurface.frag.wgsl` portiert (gleiches `texture()`-statt-`texelFetch`-Muster wie bei `OpenWater.frag.glsl`, plus `u_cameraNearFar` aus der globalen UBO). GLSL100 bekommt stattdessen — analog zu OpenWaters Fresnel-Ansatz — eine dokumentierte, bewusst vereinfachte Version ohne Depth-Sampling (WebGL1 hat keinen Depth-Capture-Pfad, und anders als bei OpenWater gibt es keinen sinnvollen View-abhängigen Ersatzwert für "Abstand zu Opaque-Geometrie"). Nebenbei aufgedeckt und gefixt: `FluidSurface.vert.glsl` hatte eine veraltete Handkopie des `GlobalUniforms`-UBO-Structs (fehlendes `u_cameraNearFar`, das an anderer Stelle schon ergänzt wurde) — das brach den Vertex/Fragment-Link erst, nachdem die Fragment-Seite jetzt `[LIGHT_DEFS]` für den Depth-Fade braucht. Gefixt durch Angleichen an die aktuelle, autoritative Struct-Definition. **Verwandtes, noch offenes Risiko gefunden:** `Liquid.vert.glsl` hat exakt dieselbe veraltete Handkopie — aktuell harmlos, weil `Liquid.frag.glsl` kein `[LIGHT_DEFS]` einbindet, aber eine tickende Zeitbombe derselben Art, falls sich das mal ändert.
3. ✅ **ERLEDIGT (2026-07-28), erledigte sich durch Punkt 2** `FluidSurfaceMaterial.frag.glsl100`: statt einer Guard-Ergänzung wurde das nie befüllte `u_specularMap`/`u_ambientMap`-Sampling beim Depth-Fade-Rewrite komplett entfernt (entspricht jetzt `FluidSurface.frag.wgsl`s Design, das diese Texturen ebenfalls nie nutzt) — die ungewollte Specular-Aufhellung ist damit gegenstandslos.
4. ✅ **ERLEDIGT (2026-07-28)** `TerrainMaterial.frag.wgsl`: fehlenden Specular-Term ergänzt (`spec * sRGBToLinear(obj.specColor.rgb)`, exakt das Muster aus `Phong.frag.wgsl`). Verifiziert über alle 25 Showcases unter WebGL1/WebGL2/WebGPU fehlerfrei, Screenshot von Showcase 4 unter WebGPU zeigt keine visuelle Regression (specColor ist weiß, Effekt dezent, wie erwartet).
5. ✅ **ERLEDIGT (2026-07-28)** Toten, verwaisten Shader-Baum gelöscht: `src/core/renderers/shaders/source/{web_gpu,web_gl1,web_gl2}/materials/*` (25 Dateien) + den nie registrierten `web_gl2/chunks/terrain.frag.glsl`-Chunk. Vor dem Löschen per Grep verifiziert, dass nichts in `src/**/*.ts` diese Pfade importiert — `CoreShaderChunks.ts`s Import-Liste wurde 1:1 gegen alle Dateien in `chunks/` abgeglichen, `terrain.frag.glsl` war der einzige Chunk ohne zugehörigen Import. `tsc`/Lint/Tests/Build bleiben grün nach dem Löschen.
6. ✅ **ERLEDIGT (2026-07-28)** `docs/guides/physics.md` korrigiert: Die veraltete "Box-vs-Box wird noch nicht aufgelöst"-Behauptung ersetzt durch eine Beschreibung, die den tatsächlichen `Collision.ts`-Code widerspiegelt (Sphere/Box/OBB in allen Kombinationen inkl. 15-Achsen-SAT für OBB-OBB, verifiziert direkt im Quellcode statt nur dem Agenten-Bericht zu vertrauen) — plus ein kurzer Hinweis auf die bisher undokumentierte Octree-Broadphase.

**P0 komplett abgeschlossen.**

**P1 — Risikoarme, grundlegende Engine-Features**
7. ✅ **ERLEDIGT (2026-07-28)** `Vector3D.lerp(v, t)`, `Quaternion.slerp(q, t)` (mit Shortest-Arc-Flip + numerisch stabilem Linear-Fallback bei nahezu identischen Rotationen) und `MathUtils.lerp(a, b, t)` ergänzt, plus neues `src/math/Easing.ts` (linear/smoothstep/easeIn·Out·InOut für Quad/Cubic/Sine). Alle mutierend + allokationsfrei, passend zum bestehenden Stil. 23 neue Tests, `tsc`/Lint/Tests/`build:lib` grün.
8. ✅ **ERLEDIGT (2026-07-28)** `AudioSystem`s prozedurale SFX-Generatoren (`startDrone`, `startFire`, `playFootstep`, `playShoot`, `playHurt`, `playTone` — ~250 der ~465 Zeilen) in eine neue Klasse `src/audio/SynthSFX.ts` ausgelagert. `AudioSystem` behält dieselben Methodennamen als dünne Delegations-Wrapper (`this._synthSFX.startDrone()` etc.) — kein Call-Site-Bruch, alle bestehenden Aufrufer (Showcases 21/22/23, `YadApp`, `YadLevelBuilder`) funktionieren unverändert. Verifiziert: `playFootstep`/`playShoot`/`playHurt` waren schon vorher nirgends aufgerufen (totes Demo-Code, jetzt zumindest isoliert statt die Kernklasse aufzublähen). `tsc`/Lint/Tests/Build grün, Showcases 21/22/23 headless ohne Konsolenfehler geladen.
9. ✅ **ERLEDIGT (2026-07-28)** `docs/guides/audio.md` geschrieben (Mixer/Buses, Laden+Abspielen global/räumlich, Listener-Sync, die neu extrahierten `SynthSFX`-Effekte, plus ein ehrlicher "Limitations"-Abschnitt) und in die VitePress-Sidebar direkt nach "Physics & RigidBodies" eingehängt. Docs-Build grün.

**P1 komplett abgeschlossen.**

**P2 — Test-/CI-Gesundheit**
10. Testabdeckung für `src/audio/` und `src/tools/` ergänzen.
11. `vitest --coverage` einrichten, damit Testqualität messbar wird.
12. Bewusst entscheiden, ob die nicht-blockierende WebGPU-CI-Lücke langfristig akzeptabel ist, oder in eine Verallgemeinerung des heutigen `sweep-renderer.mjs`-Headless-WebGPU-Ansatzes investieren, als echtes (weiterhin nicht-blockierendes, aber *sichtbares*) CI-Signal.

**P3 — Physik**
13. CCD — der eine Punkt, den jede frühere Architektur-Durchsicht als offen markiert hat, und jetzt der natürliche nächste Meilenstein, da Broadphase/Narrowphase/Substepping alle solide stehen.

**P4 — Feinschliff / DX**
14. Pro-Tool-Guides (MaterialStudio, Xtractor, Pixler, MapGenerator, GadgetInspector).
15. Konsistenz-Durchgang für die Showcase-Klassennamen.
