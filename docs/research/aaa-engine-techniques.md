# Was können wir uns bei den "Großen" abschauen?

**Datum:** 2026-08-19 (Nebel/Schneesturm-Recherche ergänzt am 2026-08-20, siehe Abschnitt 6)
**Anlass:** Offene Frage des Maintainers — gibt es Features/Tricks aus Unreal Engine, Babylon.js,
three.js und Godot, die sich (im Sinne der Technik, nicht des Codes) auf eine kleine
Hybrid-WebGL1/WebGL2/WebGPU-Engine wie `small-world` übertragen lassen?

**Methode:** Fünf parallele Recherche-Durchläufe — vier zu externen Engines/Foren/Docs
(Clustered Lighting, Schatten-Tricks, Culling/LOD/Instancing, Post-Processing + Physik-„Feel"),
einer zur Bestandsaufnahme unserer eigenen Engine (damit Empfehlungen exakt auf reale Lücken
zeigen, nicht auf Vermutungen). Alle Techniken sind konzeptionell beschrieben, kein Code aus
den referenzierten Engines wurde kopiert.

---

## Kurzfassung: Priorisierte Liste

| # | Technik | Aufwand | Nutzen | Status bei uns |
|---|---|---|---|---|
| 1 | ACES-Tonemapping statt Reinhard/Linear | niedrig | hoch | ✅ **Bereits vorhanden** — `ToneMappingMode.DEFAULT` ist schon ACES_FILMIC auf allen 3 Backends |
| 2 | Normal-Offset Bias bei Schatten | niedrig | mittel-hoch | ✅ **Implementiert** (2026-08-19) — GLSL300 + WGSL, Dir- und Spotlicht, NdotL-skaliert |
| 3 | Fixed-Timestep Render-Interpolation | niedrig-mittel | hoch (Ruckeln weg) | ✅ **Implementiert** (2026-08-19) — `PhysicsSystem.applyRenderInterpolation()` |
| 4 | CPU-Licht-Auswahl (N nächste Lichter/Objekt) | mittel | hoch | 🟡 **Teilweise** (2026-08-19) — globales Limit 4→16 angehoben (alle 3 Backends); echte Pro-Objekt-Auswahl nach Distanz bleibt offen (siehe unten) |
| 5 | Clustered/Tiled Forward+ Lighting | groß | sehr hoch | ✅ **Implementiert (2026-08-20)** — WebGPU Compute-Clustering + WebGL2 CPU-Culling fertig, 16→64-Cap (WebGPU), WebGL1 bewusst ausgelassen; siehe `docs/adr/0007-...` |
| 6 | PCSS (Contact-Hardening Soft Shadows) | mittel | mittel-hoch | 🟡 **Implementiert für Directional Light** (2026-08-20) — Spotlicht bewusst ausgelassen, siehe Abschnitt 2 |
| 7 | CSM-Politur (Cascade-Blending, Texel-Snapping) | niedrig-mittel | mittel | ✅ **Implementiert** (2026-08-20) — beides umgesetzt, siehe Abschnitt 2 |
| 8 | GTAO (Ambient Occlusion) | mittel | mittel-hoch | 🟡 **Vereinfachtes HBAO implementiert** (2026-08-20) — *kein* echtes GTAO, siehe Abschnitt 4 |
| 9 | Vereinfachtes TAA (Jitter + History-Blend) | mittel | mittel | ✅ **Implementiert** (2026-08-20) — Halton(2,3)-Jitter + exponentielles History-Blend, siehe Abschnitt 5 |
| 10 | GPU-Instancing wirklich nutzen | niedrig (Audit) | hoch | ✅ **Audit abgeschlossen** (2026-08-20) — Disc Wars und Neon Labyrinth nutzen es bereits korrekt, kein Änderungsbedarf |
| 11 | Cheap "Game Feel": Camera Shake, Hit-Stop, Squash&Stretch | niedrig | hoch (spürbar) | ✅ **Implementiert** (2026-08-20) — alle drei umgesetzt, siehe Abschnitt 5 |
| 12 | LOD + Dithered Cross-Fade | mittel | mittel | Lücke, aber nicht dringend (keine Multi-LOD-Assets) |
| 13 | Froxel-Volumetric-Fog (echte Streuung) | mittel (direkt nach #5) | **hoch** | 🔍 **Recherchiert (2026-08-20)** — bestätigte Lücke, Stufe 0 → Stufe B, s. Abschnitt 6; nächstes großes Vorhaben nach #5 |
| 14 | Hierarchical-Z Occlusion Culling | groß | gering (bei uns) | niedrige Priorität — Korridor-Level profitieren kaum zusätzlich |
| 15 | Billboards/Imposter | mittel | gering (bei uns) | niedrige Priorität — kein Anwendungsfall aktuell |
| 16 | Schneesturm/Wetter-Partikel (Blizzard) | mittel | mittel | 🔍 **Recherchiert (2026-08-20)** — eigenständiges Partikel-VFX-Vorhaben, **keine** Fog-Infrastruktur-Abhängigkeit, s. Abschnitt 6 |

**Lesart:** #1–#4 sind die "low hanging fruit" — jeweils ein bis wenige Tage, hoher spürbarer
Gewinn. #5 ist die große, lohnende Baustelle, direkt gegen unser bekanntes 4-Licht-Limit.
**#13 (echter volumetrischer Nebel) ist der bestätigte, hochpriorisierte Nachfolgeschritt direkt
nach #5** — dieselbe Froxel-/Lichtlisten-Infrastruktur wird wiederverwendet, siehe Abschnitt 6.
Der Rest ist wertvoll, aber optional/sequenzierbar.

---

## 0. Bestandsaufnahme: Was haben wir wirklich schon?

Bevor irgendetwas empfohlen wird, wurde der aktuelle Code gegengeprüft (nicht geraten):

- **Licht:** Hartes Limit von **4 Punktlichtern + 4 Spotlichtern**, global (nicht pro Objekt),
  über fest dimensionierte Array-Uniforms `u_pointLights[4]` / `u_spotLights[4]`
  (`src/core/renderers/shaders/source/web_gl2/chunks/lights.frag.glsl`, gespiegelt in
  `structs.wgsl` für WebGPU). Die Schleife bricht bei `u_numPointLights` ab (kein
  Unconditional-Loop), aber es gibt **keinerlei Tiling/Clustering** — das Limit ist in
  Shader-Quelle und Uniform-Buffer-Layout eingebacken. `AreaLight` existiert als Klasse, ist
  aber nicht in die Licht-Schleife eingebunden.
- **Schatten:** Deutlich mehr vorhanden als vermutet — **Cascaded Shadow Maps** für
  Directional Light (`CascadedShadowPassGPU.ts`), **Spot-Light-Schattenkarten**
  (`SpotShadowPassGPU.ts`), **PCF** auf beiden Backends (WebGL2: manuelle 3×3-Schleife,
  WebGPU: `getShadowPCF(...)` in `lighting.wgsl`). Es fehlt: variable Penumbra/Contact-Hardening
  (PCSS) — nur fester 3×3-Kernel.
- **Culling/LOD/Instancing:** `FrustumCuller` (Octree-beschleunigt) ist echte
  Sichtbarkeits-Culling, keine reine Physik-Broadphase. `InstancedMesh` (echtes
  GPU-Instancing) **existiert bereits**. Es gibt **keine Occlusion Culling** und
  **kein LOD-System** (die einzigen "LOD"-Treffer sind Mip-Level-Auswahl für Env-Map-Roughness,
  kein geometrisches LOD).
- **Post-Processing:** Genau 5 Effekte: `TONE_MAPPING, VIGNETTE, GRAIN, BLOOM, QUANTIZE`.
  Kein SSAO/GTAO, kein TAA/FXAA/irgendeine Kantenglättung, kein Motion Blur, kein
  Depth-of-Field, keine Screen-Space-Reflections.
- **Physik/Render-Sync:** `PhysicsSystem.ts` hat einen sauberen Fixed-Timestep-Akkumulator
  (`fixedTimeStep`, `maxSubSteps`), aber **keine Render-Transform-Interpolation** — das Render
  snapt auf den zuletzt abgeschlossenen Physik-Step. Klassische Ruckel-Quelle bei
  Render-/Physik-Frequenz-Mismatch, und der übliche günstige Fix (Lerp über
  `accumulator/fixedTimeStep`) fehlt.

---

## 1. Clustered / Tiled Forward+ Lighting (gegen das 4+4-Limit)

**Kernidee:** Der Kamera-Frustum wird in ein 3D-Raster geteilt (XY in Screen-Space, Z in
View-Space-Tiefe, meist exponentiell/logarithmisch gestuft, damit kameranahe Scheiben dünn
sind). Ein Culling-Pass testet jedes Licht gegen jede Zelle (Sphäre-vs-AABB) und baut zwei
Puffer: ein Light-Grid (Offset+Count pro Zelle) und eine flache Index-Liste. Der
Fragment-Shader berechnet seine Zellkoordinate aus Screen-XY + Tiefe und iteriert nur über die
Lichter seiner eigenen Zelle — statt über alle Lichter der Szene.

**WebGL2 vs. WebGPU:**
- **WebGPU** (Compute verfügbar): "richtige" Variante — ein Compute-Pass baut AABBs, markiert
  aktive Zellen und füllt Grid/Index-Puffer, bevor der Forward-Pass läuft (so macht es u. a.
  three.js' `ClusteredLighting`/TSL-Node-System).
- **WebGL2** (kein Compute): Culling wandert auf die **CPU** (JS-seitige Sphäre/AABB-Tests pro
  Frame); Grid + Index-Liste werden als **Datentextur** hochgeladen (UBOs sind für große
  Licht-Index-Arrays zu klein). Babylon.js 9 macht exakt das — CPU-Culling + Textur-Upload auf
  WebGL2, Compute-Culling auf WebGPU, derselbe Fragment-Shader-Lookup-Code. WebGL1 hat dafür
  keinen realistischen Pfad (kein `texelFetch`/Integer-Texturen).

**Zahlen:** CPU-gecullter Clustered-Ansatz auf WebGL2 trägt locker hunderte Lichter;
Compute-gecullt (WebGPU) berichtet Babylon.js **1.000–2.000 dynamische Lichter bei 60 fps/1080p**
auf moderner Hardware. Aufwand: Basisversion einige Tage bis Wochen; eine hochoptimierte
Compute-Variante (Atomics, aktive-Zellen-Kompaktierung) ist ein deutlich größeres Projekt.

**Pragmatischer erster Schritt (vor der vollen Cluster-Infrastruktur):** CPU-seitige
**Pro-Objekt-Lichtauswahl** — pro Mesh und Frame die Distanz zu allen Szenenlichtern berechnen,
sortieren, nur die nächsten 8–16 als kleines Uniform-Array hochladen (`u_pointLights[4]` →
`u_pointLights[16]`, Schleifen-Grenze als Uniform statt hart codiert). Keine
Shader-Architektur-Änderung nötig außer einer dynamischen Schleifengrenze, und günstig genug
für Szenen mit bis zu ~200 Lichtern insgesamt. Volles Clustering lohnt sich erst, wenn dieser
Ansatz selbst zum Flaschenhals wird.

🟡 **Teilumsetzung (2026-08-19):** Das globale Limit wurde von 4 auf 16 Punkt- und Spotlichter
angehoben (JS-seitiger Push-Cap in `PointLight.ts`/`SpotLight.ts`, WebGL2-UBO-Layout auf
`u_pointLights[16]`/`u_spotLights[16]` vergrößert inkl. neu berechneter Byte-Offsets, WebGL1 auf
16-große Uniform-Arrays erweitert, WebGPU brauchte keine Änderung außer dem JS-Cap, da Storage-
Buffer und Schleife dort schon dynamisch/überdimensioniert waren). **Es ist weiterhin eine
globale Liste** — jedes Objekt sieht dieselben (bis zu) 16 Lichter, es gibt noch keine
Pro-Objekt-Distanzauswahl. Diese Verfeinerung (Distanz berechnen, sortieren, pro Draw-Call
unterschiedliche Teilmenge hochladen) bleibt offen — sie berührt drei unterschiedliche
Upload-Mechanismen (WebGL2-UBO-Subrange pro Objekt, WebGL1-Uniform-Re-Upload pro Objekt,
WebGPU-Storage-Indexierung pro Objekt) und ist substanziell größer als die reine
Limit-Erhöhung; praktisch der Übergang zu #5 (Clustered Lighting), nicht mehr "klein".

✅ **Implementiert (2026-08-20):** Genau dieser Übergang wurde jetzt gebaut — echtes
Froxel-Clustering per Compute-Shader auf WebGPU (`ClusterCullPassGPU`, fixed-capacity-per-Cluster
ohne Atomics, 16×16px-Tiles × 24 log-gestaffelte Z-Slices als Default,
`quality.clusteredLighting`-Config), globaler Cap 16→64 (`MAX_CLUSTERED_LIGHTS_PER_TYPE`). Jedes
Fragment iteriert jetzt nur noch über die Lichter seiner eigenen Zelle statt über alle
Szenenlichter. **WebGL2 bekommt das CPU-Culling+Datentextur-Gegenstück ebenfalls**
(`WebGLClusterCullPass`, `lightClusterCoverage()` in `src/math/ClusterGrid.ts` als geteilte
Formel mit der WebGPU-Seite, RG32UI/R32UI-Texturen als 2D-Ersatz für fehlende 1D-Texturen) —
bringt dort aber nur Performance, keine höhere Lichtzahl, siehe
`docs/adr/0007-clustered-lighting-webgl2-webgpu-only.md` für die vollständige Begründung (u. a.
warum WebGL2s Rohdaten-Array bewusst bei 16 bleibt, auch nachdem WebGPU auf 64 angehoben wurde).
WebGL1 bleibt unverändert, kein Clustering-Pfad.

**Engine-Vorbilder:** Godot Forward+ (Compute-Binning in 3D-Grid, Desktop-only — Mobile nutzt
bewusst den einfacheren Forward-Mobile-Pfad wegen Compute-Kosten), three.js
`ClusteredLighting`/`ClusteredLightsNode` (konfigurierbar: `tileSize`, `zSlices`, `maxLights`,
`maxLightsPerCluster`), Babylon.js 9.0 (neuester, Dual-Backend WebGPU+WebGL2 — das direkt
relevanteste Vorbild für unsere Hybrid-Engine), Unreal (Clustered *Forward* seit ~4.x, nach
Olsson et al. 2012).

**Quellen:** [Godot-Renderer-Docs](https://docs.godotengine.org/en/stable/tutorials/rendering/renderers.html) ·
[three.js ClusteredLighting](https://threejs.org/docs/pages/ClusteredLighting.html) ·
[Babylon.js 9.0 Announcement](https://blogs.windows.com/windowsdeveloper/2026/03/26/announcing-babylon-js-9-0/) ·
[Babylon.js Clustered Lighting Doc](https://doc.babylonjs.com/features/featuresDeepDive/lights/clusteredLighting/) ·
[A Primer on Efficient Rendering & Clustered Shading (aortiz.me)](http://www.aortiz.me/2018/12/21/CG.html) ·
[Practical Clustered Shading — Emil Persson](https://www.humus.name/Articles/PracticalClusteredShading.pdf)

---

## 2. Schatten über das vorhandene CSM+PCF hinaus

**PCSS (Contact-Hardening Soft Shadows):** 🟡 **Implementiert für Directional Light** (2026-08-20),
Spotlicht bewusst ausgelassen (siehe unten).

Umgesetzt als Drop-in-Upgrade auf der vorhandenen PCF-Infrastruktur, dreistufig:

1. *Blocker-Search:* 8 Taps in einem Ring (±2 Texel) um den projizierten Texel, über einen
   **zweiten, nicht-vergleichenden Tiefen-Read** derselben Shadow-Map — bei WebGL2 ein neuer
   `uniform sampler2D u_dirShadowMapRaw`, gebunden über einen dedizierten `WebGLSampler` mit
   `TEXTURE_COMPARE_MODE = NONE` auf einer eigenen Texture-Unit (14), weil dieser Modus in
   WebGL2 direkt auf dem Texturobjekt sitzt (nicht der Sampling-Aufruf) und die eigentliche
   Vergleichs-Textur ihn dauerhaft gesetzt hat; bei WebGPU komplett kostenlos via `textureLoad`
   direkt auf der bereits gebundenen `texture_depth_2d_array` (kein Sampler nötig, kein
   zusätzliches Bind-Group-Entry) — der erwartete Aufwands-Unterschied zwischen den Backends.
2. *Penumbra-Schätzung:* `occluderDepthDelta = currentDepth - avgBlockerDepth`, skaliert relativ
   zu `bias` (`pcfRadius = clamp(1.0 + occluderDepthDelta / bias, 1.0, 4.0)`) statt einer
   Weltraum-Umrechnung — `bias` ist bereits ein pro Kaskade kalibrierter Tiefen-Toleranzwert im
   selben normalisierten Tiefenraum, was einen erratenen Skalierungsfaktor (dessen
   Weltraum-Bedeutung je nach Kaskaden-Tiefenbereich variiert) unnötig macht.
3. *Variable PCF:* dieselbe 3×3-Schleife wie zuvor, aber mit `texelSize * pcfRadius` statt
   `texelSize` — Kontaktschatten bleiben scharf, weiter entfernte Bereiche weichen auf.

Nur die **primäre Kaskade** (`shadowA`) bekommt PCSS; die Kaskaden-Blend-Sample (`shadowB`,
siehe CSM-Politur oben) bleibt beim festen 3×3-PCF, um die Kosten in der Blend-Zone nicht zu
verdoppeln — eine bewusste, dokumentierte Vereinfachung. Alle Blocker-Search- und
PCF-Sample-UVs werden auf die eigene Atlas-Zelle geklemmt (WebGL2), damit ein breiterer
Suchradius nahe einer Zellgrenze nicht in eine andere Kaskade hineinblutet.

**Spotlicht-PCSS bewusst nicht umgesetzt:** hätte denselben Raw-Sampler-Aufwand nochmal für
`u_spotShadowMap[4]` erfordert (4 zusätzliche Texture-Units/Sampler-Bindungen bei WebGL2) für
einen Lichttyp, der in den aktuellen Showcases sichtbar seltener/kleinräumiger Schatten wirft
als das Directional Light — Verhältnis Aufwand zu sichtbarem Gewinn war hier schlechter.

**Verifiziert:** `tsc --noEmit`, `npm run lint:wgsl` (WGSL hat keinen GLSL-Äquivalent-Linter,
GLSL-Fehler zeigen sich nur zur Laufzeit im Treiber), volle Testsuite, Live-Rendering in
Showcase 1 (schattenwerfender Directional Light + Würfel) auf WebGL2 und WebGPU — sichtbar
weicher werdender Schattenrand ohne Artefakte, keine Konsolenfehler auf beiden Backends.

**Normal-Offset Bias:** ✅ **Implementiert** (2026-08-19). Statt Tiefenwerte entlang der
Lichtrichtung zurückzuschieben (klassisches Slope-Scaled-Bias, verursacht "Peter-Panning" bei
wachsendem Bias), wird die *Sample-Position* entlang der Oberflächen-Normale verschoben
(proportional zu `NdotL`), bevor sie in den Licht-Raum transformiert wird. Trennt die Behebung
von Shadow-Acne von der Tiefenwert-Manipulation — heute der De-facto-Standard (Unity, Unreal,
die meisten Engine-Tutorials). Umgesetzt für Directional- (Fragment-Shader) und Spotlicht
(GLSL: Vertex-Shader, da die Licht-Raum-Transformation dort passiert; WGSL: Fragment-Shader),
jeweils Standard- und PBR-Pfad, in GLSL300 und WGSL. **Bewusst ausgelassen: WebGL1** — dort
existiert aktuell überhaupt keine Shadow-Map-Implementierung (kein CSM, kein PCF), es gäbe
nichts zu biasen; Schatten für WebGL1 wären ein eigenes, größeres Feature.

*Diskutiert, nicht umgesetzt:* Eine Minimalvariante für WebGL1 wäre technisch machbar (eine
einzelne Directional-Shadow-Map ohne Kaskaden, `WEBGL_depth_texture`-Extension, manueller
1-/4-Tap-Vergleich statt Hardware-PCF, fester Bias statt Normal-Offset, kein Spotlicht-Schatten).
Der reale Nutzen ist aber fraglich: WebGL1 ist in dieser Engine der Fallback für
schwache/alte Geräte (`DeviceCaps`-Auto-Downgrade schaltet bei "LOW"-Tier ohnehin
`maxShadowResolution` runter bzw. Post-Processing ganz ab) — genau die Geräte, denen man
Schatten eher wegnehmen als hinzufügen würde. Auf Wunsch des Maintainers zurückgestellt.

**CSM-Politur:** ✅ **Implementiert** (2026-08-20). Beides umgesetzt:

- *(a) Cascade-Blending* — nahe der Fernkante einer Kaskade wird zusätzlich die nächste Kaskade
  abgetastet und über ein Blend-Band linear überblendet, statt eines harten
  Auflösungssprungs (three.js' `CSM` bietet das als `fade`-Flag). Blend-Band = 10 % der
  Fernkanten-Distanz der aktuellen Kaskade (`blendBand = splitFar * 0.1`), keine Abhängigkeit
  von der Nahkante nötig. Umgesetzt in allen vier Lighting-Chunks (`light_calc.frag.glsl`,
  `light_calc_pbr.frag.glsl`, `lighting.wgsl`, `lighting_pbr.wgsl`) — jeweils zwei vollständige
  PCF-Abtastungen (aktuelle + nächste Kaskade) und ein `mix()` über den Blend-Faktor. Bewusst
  ohne Hilfsfunktion/Schleife über ein lokales Array umgesetzt (stattdessen zwei explizite,
  leicht duplizierte Codeblöcke) — vermeidet jede Unsicherheit über dynamische
  Array-Indizierung in GLSL-ES-3.00-Schleifen auf älteren mobilen GPU-Treibern.
- *(b) Texel-Snapping* — `DirectionalLight.updateCascades()` rundet jetzt das Licht-Raum-Zentrum
  jeder Kaskade auf ein ganzzahliges Vielfaches der Texelgröße (`Math.floor(center / texelSize) *
  texelSize`), **vor** dem Setzen der Ortho-Grenzen, bei unveränderter Frustum-Größe (nur das
  Zentrum wird verschoben, nicht Breite/Höhe) — das verhindert das Sub-Texel-Wandern des
  Schatten-Rasters bei glatter Kamerabewegung (das klassische CSM-Shimmering). Die
  Texelgröße wird aus `shadowResolution / ceil(sqrt(numCascades))` abgeleitet (WebGL2 packt
  Kaskaden in ein `cols × cols`-Atlas-Raster, siehe `WebGL2Renderer.ts`); für WebGPU (volle
  Auflösung pro Array-Layer, kein Atlas) ist das eine bewusst konservative Näherung — gröber
  als nötig, nie feiner, also nie ein Snapping, das das Shimmering verfehlen würde.

**Vereinfachte Lehre aus Virtual Shadow Maps:** Der Kerntrick ist eine zweistufige Indirektion
(riesiger virtueller Adressraum, kleiner physischer Seiten-Pool, nur sichtbare+veraltete Seiten
werden neu gerendert). Volle Paging-Maschinerie ist für uns nicht realistisch, aber eine
"20%-Aufwand"-Version ist es: statische Kaskaden cachen und nur bei Änderung neu rendern
(Dirty-Rect-Invalidierung statt Nanite-artigem Per-Page-System), plus Update-Frequenz nach
Kamera-Distanz staffeln (nahe Kaskaden jeden Frame, ferne nur bei Bedarf).

**Quellen:** [PCSS (Real-Time Rendering Ch. 7.6)](https://assassin-plus.github.io/posts/Percentage-Closer-Soft-Shadows/) ·
[NVIDIA Soft Shadows Sample](http://gameworksdocs.nvidia.com/GraphicsSamples/SoftShadowsSample.htm) ·
[Sampling of Shadow Techniques — therealmjp](https://therealmjp.github.io/posts/shadow-maps/) ·
[Catlike Coding — Directional Shadows](https://catlikecoding.com/unity/tutorials/custom-srp/directional-shadows/) ·
[Cascaded Shadow Maps with Soft Shadows — Alex Tardif](https://alextardif.com/shadowmapping.html) ·
[three-csm](https://strandedkitty.github.io/three-csm/) ·
[Virtual Shadow Maps in Unreal Engine](https://dev.epicgames.com/documentation/en-us/unreal-engine/virtual-shadow-maps-in-unreal-engine) ·
[Virtual Shadow Maps in Fortnite Ch. 4](https://www.unrealengine.com/en-US/tech-blog/virtual-shadow-maps-in-fortnite-battle-royale-chapter-4)

---

## 3. Culling, LOD, Instancing

**Hierarchical-Z Occlusion Culling:** Depth-Buffer der Vorframes wird in eine Mip-Kette
reduziert (jeder Texel speichert die *fernste* Tiefe seiner Region); Bounding-Boxen werden per
Mip-Level-Textur-Fetch statt Per-Pixel-Test geprüft. Braucht Compute-fähige Mip-Reduktion —
realistisch nur für den WebGPU-Pfad, für WebGL1/2 unpraktisch (kein Compute, nur
Quasi-Indirect-Draw). **Einschätzung für uns:** niedrige Priorität — unsere Korridor-Level
(Maze/Dungeon) profitieren bereits stark von Frustum+Octree-Culling, echte Occlusion Culling
würde bei hunderten verdeckten Objekten lohnen, was für unsere Showcases untypisch ist.

**GPU-Instancing:** **Existiert bereits** als `InstancedMesh` (`src/core/InstancedMesh.ts`) —
ein geteilter Vertex-/Index-Buffer plus Pro-Instanz-Buffer (4×4-Matrix, ggf. Farbe), ein
Draw-Call für N Kopien.

✅ **Audit abgeschlossen (2026-08-20):** Sowohl `src/apps/disc-wars/core/LevelBuilder.ts` als
auch `src/apps/neon-labyrinth/core/LevelBuilder.ts` batchen Wände/Böden/Decken/Nähte bereits
korrekt über `InstancedMesh` (ein `addInstanced(...)`-Helper sammelt Matrizen pro Zellschleife
und erzeugt am Ende einen Draw-Call pro Geometrie-/Material-Kombination). Die einzige
Ausnahme ist Neon Labyrinths Frostglas-Wand — bewusst als Einzel-`Object3D` pro Zelle gebaut,
weil jedes Panel sein eigenes geklontes Material für die individuelle "Clarity Pulse"-Animation
braucht (kein reiner Transform-Unterschied, daher InstancedMesh-untauglich). Light Cycle Arena
hat 4 Umfassungswände als Einzel-`Object3D` — technisch InstancedMesh-fähig, aber bei nur 4
Instanzen kein sinnvoller Umbau. **Ergebnis: kein Code musste geändert werden**, die
Infrastruktur war schon korrekt angeschlossen.

**LOD + Dithered Cross-Fade:** An der Fade-Grenze werden kurz beide LOD-Stufen gerendert,
jedes Fragment vergleicht einen Bildschirmraum-Noise-/Bayer-Wert gegen eine über wenige Frames
ansteigende Schwelle und verwirft sich darunter (`discard`) — kein echtes Blending, keine
Sortierprobleme. Aufwand liegt weniger im Shader als im System drumherum (LOD-Auswahl,
Hysterese gegen Flackern). **Einschätzung:** nicht dringend, solange es keine
Multi-LOD-Assets gibt.

**Billboards/Imposter:** Für offene Welten/Wälder/Menschenmengen wertvoll (Unreal-Fortnite-
Bäume). Für unsere Maze-/Dungeon-/Fahrzeug-Showcases selten genug organische
Wiederholgeometrie in der Ferne, um den Baking-Aufwand zu rechtfertigen. **Einschätzung:**
niedrige Priorität, aktuell überspringen.

**API-Lehre von Godot:** `MultiMeshInstance3D` exponiert Instancing als eigenen, dedizierten
Node/Resource-Typ statt als Flag auf der normalen Mesh-API. Lehre: Instancing als eigenen,
klar benannten Typ mit expliziten Pro-Instanz-Settern anbieten (haben wir mit `InstancedMesh`
im Prinzip schon richtig gemacht).

**Quellen:** [Visibility and Occlusion Culling in Unreal Engine](https://dev.epicgames.com/documentation/en-us/unreal-engine/visibility-and-occlusion-culling-in-unreal-engine) ·
[Two-Pass HZB Occlusion Culling](https://medium.com/@Lucmomber/two-pass-hierarchical-z-buffer-occlusion-culling-93171c5a9808) ·
[Babylon.js Thin Instances](https://doc.babylonjs.com/features/featuresDeepDive/mesh/copies/thinInstances) ·
[three.js InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html) ·
[Unity LOD-Transitions](https://docs.unity3d.com/6000.2/Documentation/Manual/lod/lod-transitions-lod-group.html) ·
[Godot MultiMeshInstance3D](https://docs.godotengine.org/en/stable/tutorials/3d/using_multi_mesh_instance.html)

---

## 4. Post-Processing "Cheap AAA Tricks"

**SSAO vs. HBAO vs. GTAO:** Alle verdunkeln Kontakt-Ecken im Screen-Space, unterscheiden sich
in Genauigkeit/Kosten. Klassisches SSAO (Hemisphären-Sampling) ist billig, aber
artefaktanfällig (Banding, Halos). HBAO schreitet screen-space Strahlen ab, um den echten
Horizont-Winkel zu finden — robuster, etwas teurer. GTAO integriert gegen einen
kosinus-gewichteten Horizont, kalibriert gegen eine Ground-Truth-Referenz — der Grund, warum
es zum modernen Standard wurde (Godot 4, XeGTAO). Kosten: ~0,5–2,5 ms bei 1080p auf
aktueller Hardware — pro Qualitätseinheit sogar günstiger als HBAO+. Aufwand: braucht eine
Tiefe+Normal-Vorpass, einen Horizont-Such-Shader und einen Blur/Denoise-Pass — mittel, aber
hoher Gewinn, wenn ein Tiefen-/Normal-Puffer schon existiert.

🟡 **Teilumsetzung (2026-08-20) — ehrliche Einordnung: vereinfachtes HBAO, kein echtes GTAO.**
Umgesetzt wurde ein einzelner Full-Resolution-Screen-Space-Pass (`AOPassGL`/`AOPassGPU`,
`AO.frag.glsl`/`AO.frag.wgsl`), der:
1. View-Space-Position aus der bereits vorhandenen Opaque-Depth-Textur rekonstruiert (Tiefe
   linearisieren über `near`/`far`, dann über die Perspektiv-Matrix-Diagonalterme `A`/`B` zu
   View-Space-XY zurückrechnen — keine volle Inverse-Projektionsmatrix nötig).
2. Eine View-Space-Normale über Screen-Space-Ableitungen der rekonstruierten Position
   approximiert (`dFdx`/`dFdy` in GLSL, manuelle Differenzen in WGSL) — kein echter
   Normal-G-Buffer.
3. Pro 6 fester Richtungen einen einzelnen Max-Dot-Produkt-Sample über 4 Schritte nimmt und
   das Ergebnis über alle Richtungen mittelt.

**Einordnung: näher an HBAO (vereinfacht) als an GTAO.** `dot(Richtung-zum-Sample, Normale)`
ist mathematisch der Sinus des Horizont-Elevationswinkels relativ zur Tangentialebene — exakt
die Größe, nach der HBAO pro Richtung sucht. Pro Richtung (6 Stück) über 4 Schritte marschieren
und den größten gefundenen Wert nehmen ist strukturell echtes Horizont-Suchen, nur mit einem
einzigen Max-Sample statt kontinuierlichem Tracking und ohne die volle
Tangentenwinkel-Subtraktion, die HBAO für die genaue Teil-Verdeckung nutzt — ein
vereinfachtes HBAO, kein bloßes Hemisphären-SSAO. Was komplett fehlt, ist alles, was GTAO
*zu* GTAO macht: die kosinus-gewichtete Arc-Integrationsformel (arccos-basiert statt linearem
`dot()`-Proxy), Multi-Bounce-Näherung, Dünne-Objekte-Heuristik gegen Über-Verdunkelung und —
am wichtigsten — Temporal Filtering über Motion Vectors (bräuchte TAA/#9, das wir noch nicht
haben). Kein separater Blur/Denoise-Pass — Suche und (fehlendes) Denoise sind in einem Shader
kombiniert, ein bewusster Scope-Cut. Sichtbarer Nebeneffekt in der Live-Verifikation: an
Silhouetten-Kanten (Tiefensprung Objekt/Hintergrund) kann die Ableitungs-Normale entarten und
zu übertriebener Verdunkelung entlang der ganzen Kante führen — ein bekanntes, dokumentiertes
Artefakt reiner Tiefenableitungs-Normalen ohne echten G-Buffer, nicht spezifisch für unsere
Implementierung.

**Ansonsten:** Läuft als eigener Pass nach dem existierenden Opaque-Depth-Capture
(`copyToOpaqueDepthTexture`/`captureOpaqueDepth`), WebGL2 + WebGPU (WebGL1 hat keine
sample-fähige Tiefentextur). Musste einen echten pre-existierenden Bug fixen: die
Opaque-Depth-Capture lief bisher nur, wenn die Szene transparente Objekte hatte (für
Unterwasser-Refraktion gedacht) — für AO ohne jede Transparenz in der Szene wäre die
Tiefentextur nie befüllt worden. Jetzt läuft die Capture zusätzlich immer, wenn HBAO aktiv ist
(`WebGLMainPass.ts`, `MainRenderPass.ts`). Neuer Uniform `u_hbaoTexture`/`u_hbaoEnabled` im
Uber-Post-Process-Shader, multipliziert auf `hdr` vor dem Tonemapping. Standardmäßig
deaktiviert (`HbaoElement.enabled = false`), da Post-Processing insgesamt schon
standardmäßig aus ist. Live in Showcase 1 (WebGL2 + WebGPU) verifiziert: sichtbarer,
funktionierender Effekt bei hoher Intensität, keine Konsolenfehler, keine Abstürze.

**TAA:** ✅ **Implementiert** (2026-08-20), als die bewusst vereinfachte Variante, die hier
selbst schon als realistischer Mittelweg vorgeschlagen wurde: Sub-Pixel-Kamera-Jitter pro Frame
+ exponentielles History-Blend, **keine** Motion-Vektoren/Reprojektion.

- *Jitter:* `Camera.jitterX`/`jitterY`, gefüllt in `SmallWorld._loop()` über eine
  Halton(2,3)-Sequenz (16 Samples, zyklisch), umgerechnet in NDC-Texel-Einheiten relativ zur
  Canvas-Auflösung. Eingebacken direkt in `Camera.updateViewMatrix()`s
  `_viewProjMatrix` (Spalte 2, Zeilen 0/1 — die Standard-Stelle für Jitter-Injektion, da sie
  mit der View-Space-Tiefe skaliert statt Near/Far unterschiedlich zu verzerren). Bewusst
  **keine separate ungejitterte Matrix** für Culling/Schatten/HBAO — der Sub-Pixel-Versatz ist
  vernachlässigbar für deren Zwecke, spart aber die doppelte Matrix-Buchhaltung.
- *History-Blend:* generischer Pass (`HistoryBlendPassGL`/`HistoryBlendPassGPU`,
  `HistoryBlend.frag.glsl`/`HistoryBlend.frag.wgsl`) — Ping-Pong zwischen zwei
  Vollauflösungs-Texturen (kein Kopier-Schritt nötig), blendet `mix(current, history, feedback)`
  mit `feedback = 0.9` als TAA-Default. Läuft als erster Post-Processing-Schritt (vor
  Bloom/HBAO/Uber-Shader) — alles Nachgelagerte reagiert auf die zeitlich geglättete statt die
  rohe, gejitterte Pro-Frame-Farbe.
- *Verifiziert:* Live in Showcase 1 (rotierender Würfel, WebGL2 + WebGPU) — bei hohem
  `feedback` sichtbares, **erwartetes** Ghosting/Nachziehen an den bewegten Kanten des
  rotierenden Würfels, exakt der hier dokumentierte, akzeptierte Trade-off ohne
  Motion-Vektoren. Keine Konsolenfehler, keine visuelle Verdopplung/Korruption durch die
  Jitter-Matrix-Injektion.

Volles TAA bräuchte zusätzlich Motion-Vektoren (Extra-Render-Target, Extra-Shader-Output pro
Material) für echte Reprojektion statt eines statischen UV-Blends — deutlich größerer Aufwand,
bewusst nicht umgesetzt.

**Bonus, aus der TAA-Verifikation entstanden (2026-08-20): `MotionTrailElement`.** Beim
Live-Test fiel dem Maintainer auf, dass das Ghosting bei hohem `feedback` (0.92) richtig gut
aussieht — die Frage war dann, ob das "Bug oder Feature" ist. Antwort: strukturell dasselbe
Verfahren wie Haeberlis/Akeleys Accumulation-Buffer-Technik (SIGGRAPH 1990), nur für einen
bewusst sichtbaren statt einen unsichtbaren Effekt eingesetzt — also kein Mogeln, sondern ein
ehrlich benannter, eigenständiger Stil-Effekt. Umgesetzt als eigenes `MotionTrailElement`
(eigener Enum-Wert `MOTION_TRAIL`, eigene Config, standardmäßig aus), das dieselbe
`HistoryBlendPassGL`/`HistoryBlendPassGPU`-Infrastruktur wiederverwendet (eigene
Instanz/eigener History-Puffer, **kein** Kamera-Jitter), verkettet direkt nach TAA im
Post-Processing (beide könnten kombiniert werden, i. d. R. ist aber nur einer der beiden aktiv).
Dazu die Pass-Klassen/Shader ehrlich umbenannt: `TAAPassGL/GPU` → `HistoryBlendPassGL/GPU`,
`TAA.frag.glsl/wgsl` → `HistoryBlend.frag.glsl/wgsl` — sie sind kein TAA-spezifisches
Werkzeug mehr, sondern die gemeinsame Grundlage für beide Effekte. Live in Showcase 1 verifiziert
(WebGL2 + WebGPU, deutlich sichtbarer, sauberer Ghost-Trail-Effekt, keine Konsolenfehler).

**Tonemapping:** ✅ **Bereits vorhanden, keine Aktion nötig** (geprüft 2026-08-19). ACES wurde
Industriestandard, weil es HDR-Werte über eine wahrnehmungsoptimierte Kurve abbildet, die
Highlights sanft abrollt statt hart auf Weiß zu clippen (Reinhard/Linear brennen aus oder
waschen Farben aus). Überraschung beim Nachprüfen: `small-world` implementiert bereits den
echten Narkowicz-ACES-Fit identisch auf allen drei Backends (`PostProcess.frag.glsl`,
`PostProcess100.frag.glsl`, `PostProcess.frag.wgsl`), und `ToneMappingMode.DEFAULT` ist bereits
`ACES_FILMIC` (nicht Reinhard, wie ursprünglich vermutet). Der einzige tatsächliche Hebel: die
gesamte Post-Processing-Pipeline ist standardmäßig deaktiviert
(`PostProcessingGroup.enabled = false`) — das ist aber eine separate, größere Entscheidung
("Post-Processing per Default an?"), keine Tonemapping-Frage mehr.

**Froxel-Volumetric-Fog:** Baut ein kamera-ausgerichtetes 3D-Raster (Froxel), akkumuliert
Dichte/Streuung pro Zelle, raymarcht das dann als Post-Process. Überlappt stark mit Clustered
Lighting (gleiche Frustum-Slicing-Mathematik, gleiche Licht-zu-Zelle-Zuordnung) — nach
Clustered Lighting zu bauen ist deutlich günstiger als isoliert zuerst. 🔍 **Vertiefte
Quellenrecherche (2026-08-20), inkl. Schneesturm-Vergleich: siehe Abschnitt 6.**

**Quellen:** [XeGTAO README](https://github.com/GameTechDev/XeGTAO/blob/master/README.md) ·
[Ambient Occlusion: SSAO vs HBAO vs GTAO](https://superrendersfarm.com/article/ambient-occlusion-explained-ssao-hbao-gtao-2026) ·
[Temporal Anti-Aliasing – Step by Step](https://ziyadbarakat.wordpress.com/2020/07/28/temporal-anti-aliasing-step-by-step/) ·
[Filmic vs. ACES vs. AgX — Blender Artists](https://blenderartists.org/t/filmic-vs-aces-vs-agx-for-architectural-visualization/1459951) ·
[AgX Tonemapping — three.js forum](https://discourse.threejs.org/t/is-agx-tonemapping-implemented-correctly/60609) ·
[Flax Engine Volumetric Fog Docs](https://github.com/FlaxEngine/FlaxDocs/blob/c7ca0c976936f5203fc441816dcab68a7c4f31f9/manual/graphics/fog-effects/volumetric-fog.md/)

---

## 5. Physik/Animation "Game Feel"

**Fixed-Timestep Render-Interpolation:** ✅ **Implementiert** (2026-08-19). Standardtechnik
(Gaffer On Games, "Fix Your Timestep!", genutzt von Godot/Unity/Bevy) — die letzten zwei
Physik-Zustände behalten, `alpha = accumulator / fixedTimeStep` berechnen und Transforms fürs
Rendern dazwischen lerpen. Entkoppelt variable Render-FPS von der Physik-Taktrate, eliminiert
Ruckeln. Umgesetzt als `RigidBody.prevPosition`/`prevRotation` (Snapshot vor jedem Substep) +
`PhysicsSystem.interpolationAlpha`/`applyRenderInterpolation()` (blendet Transform + Weltmatrix
nur fürs Rendern, stellt den wahren Zustand danach sofort wieder her), aufgerufen in
`SmallWorld._loop()` nach `FrustumCuller.cull()` und vor `renderer.render()`. Rotation nutzt
kürzeste-Weg-Interpolation über die ±π-Wraparound-Grenze (`shortestAngleDelta`). Getestet in
`tests/physix/PhysicsSystem.test.ts` (Describe-Block "Render Interpolation").

**Blend-Trees / Crossfade:** Blend-Trees (parametergesteuertes Blenden mehrerer Clips, z. B.
Speed → Walk/Run) und Crossfade (kurzes Überblenden bei Zustandswechsel) sind Standard (Unity
Mecanim, Godot AnimationTree), mittlerer Aufwand falls ein Animations-Clip-System existiert.
Bei uns nicht umgesetzt — es gibt kein Clip-basiertes Animationssystem, das ein Blend-Tree
bräuchte.

**Camera-Shake, Hit-Stop, Squash-and-Stretch:** ✅ **Implementiert** (2026-08-20).

- *Camera-Shake:* `ShakeEffect.ts` existierte schon (linearer Decay + `Math.random()` pro Achse
  und Frame — sichtbar als Zittern statt Wobbeln). Umgebaut auf ein Trauma²-Envelope
  (`trauma = 1 - elapsed/duration`, `envelope = intensity * trauma²`) plus kontinuierlichem
  Simplex-Noise-Sampling pro Achse (`Noise.simplex2`, bereits vorhandener Wrapper um
  `simplex-noise`) statt weißem Rauschen — liest sich jetzt als weiches Wobbeln, das sauber
  ausklingt, statt eines abrupt endenden Zitterns. Jede Instanz bekommt einen eigenen
  Zufalls-Seed-Offset, damit gleichzeitige Shakes nicht identisch sampeln.
- *Hit-Stop:* Neu in `SmallWorld.ts` — `triggerHitStop(duration, timeScale = 0.05)` setzt einen
  internen Timer; `_loop()` skaliert damit die deltaTime für App-Update, Physik-Step und
  Szenen-Update (`gameplayDeltaTime`), während die Kamera (und damit Shake/Flash) weiterhin die
  reale deltaTime bekommt — das Bild "friert" kurz ein, aber die Kamera zittert währenddessen
  weiter, was den Treffer verkauft. Da die Engine kein Pro-Objekt-Zeitskalierungsfeld hat
  (`RigidBody` kennt kein `timeScale`), ist das architektonisch bewusst ein **globaler** Effekt,
  keine Pro-Entity-Selektion — für einen kurzen Trefferimpuls (50–120 ms) ist das der
  pragmatische, in der Praxis kaum wahrnehmbare Kompromiss.
- *Squash-and-Stretch:* Neues `SquashStretchBehavior` (`src/core/behaviors/`), im Stil der
  bestehenden `SpringLerpBehavior`/`OscillatorBehavior`. Speichert die Basis-Skalierung beim
  Anhängen, `trigger(intensity)` staucht sofort entlang Y und streckt X/Z (volumen-erhaltend
  angenähert), ein gedämpfter Feder-Oszillator (`stiffness`/`damping`) schwingt danach zurück
  zur Basis-Skalierung — inklusive leichtem Überschwingen, nicht nur einem linearen Zurückgleiten.
- *Verdrahtet in:* Neon Labyrinth (`src/apps/neon-labyrinth/App.ts`) an beiden bestehenden
  Impact-Momenten (Wisp-Treffer, Sturz-Reset) zusätzlich zum vorhandenen Kamera-Shake/Flash;
  die gespawnten Impact-Shards (`_spawnImpactTrace`) bekommen beim Erscheinen einen
  Squash-and-Stretch-Pop. Light Cycle Arena wurde bewusst **nicht** angefasst — dort existiert
  bereits ein eigenes, für einen anderen Zweck gebautes `_timeScale`-System (sanftes
  Herunterfahren nach Rundenende als Puzzle-Mechanik), das die Wirkung eines zusätzlichen
  Hit-Stops verwässert hätte.
- *Getestet:* `tests/core/cameras/effects/ShakeEffect.test.ts` (Trauma²-Envelope-Grenzen,
  Seed-Diversität, sauberes Finish), `tests/core/behaviors/SquashStretchBehavior.test.ts`
  (Basis-Skalierung, sofortiger Impuls, Feder-Rückkehr zur Basis).

**Quellen:** [Fix Your Timestep! — Gaffer On Games](https://gafferongames.com/post/fix_your_timestep/) ·
[Beginning Game Development: Blend Trees](https://medium.com/@lemapp09/beginning-game-development-blend-trees-315cd3e78d8c) ·
[Game feel on the web: squash, shake, and the art of juice](https://valdemird.com/blog/game-feel-on-the-web/)

---

## 6. Nebel, Lichtstreuung und Schneesturm (vertiefte Recherche, 2026-08-20)

**Anlass:** Konkrete Frage des Maintainers — haben wir Nebel schon implementiert, auf welcher
technologischen Stufe, und wie kämen "wabernde Nebelschwaden" (Nebel, der Licht
reflektiert/streut) sowie Schneesturm als vergleichbares Wetter-Volumen-Phänomen dorthin? Baut
auf #13 oben auf. **Methode:** sechs offizielle Quellen abgerufen und geprüft (Unreal Engine
5.8 Docs ×2, Unity HDRP 14.0 Docs, Godot-4-Docs, das offizielle Frostbite/SIGGRAPH-Papier von
Sébastien Hillaire, Unreal-4.27-Docs zu Schnee-Beispielen), plus eine Sekundärquelle (Company of
Heroes 2 Rendering-Tech-Slides) für den Blizzard-Praxisvergleich.

### 6.0 Bestandsaufnahme: Was haben wir wirklich schon?

Geprüft in `src/core/Fog.ts`, `src/enums/FogMode.ts`,
`src/core/materials/shaders/chunks/fog_calc.glsl` und
`src/core/renderers/shaders/source/web_gpu/chunks/fog_calc.wgsl`: klassischer **analytischer
Distanz-/Höhen-Nebel** — LINEAR/EXP/EXP2-Modus plus optionaler exponentieller Höhen-Falloff.
Die komplette Berechnung pro Fragment:

```
fogFactor = f(distanz, modus)             // LINEAR/EXP/EXP2
fogFactor = heightBlend(fogFactor, y)     // optionaler Höhen-Falloff
color     = mix(fogColor, color, fogFactor)
```

Identisch in allen drei Backends, keine Textur, kein Noise, keine Zeit-Uniform, keine
Lichtquellen-Referenz in der Formel selbst.

**Ehrliche Einordnung — das ist Stufe 0:** ein reiner Post-Lighting-Farbverschnitt, technisch
identisch zur Fixed-Function-Nebel-Generation der OpenGL-`glFog`/Quake-Ära der 1990er. Es gibt
**keine** Lichtstreuung/-reflexion (kein In-/Out-Scattering, keine God-Rays/Light-Shafts),
**keine** räumliche Dichtevariation (kein Noise/3D-Textur), **keine** Animation/Bewegung — der
Nebel "wabert" nicht, er ist ein statischer, gleichmäßiger Grauschleier. Explizit **nicht**, was
mit "wabernden Nebelschwaden, die Licht reflektieren" gemeint ist.

### 6.1 Was die großen Engines tatsächlich bauen

**Unreal Engine — Exponential Height Fog vs. Volumetric Fog:** Exponential Height Fog (Standard,
kein echtes Scattering) entspricht in der Formel fast exakt unserem Ansatz — Distanz +
Höhen-Falloff — plus ein Detail, das wir nicht haben: zwei Nebelfarben (Hemisphäre Richtung
Directional Light vs. Gegenseite) und eine **"Directional Inscattering"**-Näherung (ein Kegel um
die Lichtrichtung, der Scattering optisch *simuliert*, ohne es zu berechnen) — eine günstige
Attrappe, aber mehr als unser aktueller Stand. Aktiviert man **Volumetric Fog** auf derselben
Komponente, ändert sich die Architektur grundlegend: participating-media Dichte und Beleuchtung
werden an jedem Punkt im Kamera-Frustum über kamera-ausgerichtete, niedrig aufgelöste
3D-Volumentexturen (Froxel) berechnet, inklusive **Scattering Distribution** (0 = gleichmäßig,
nahe 1 = vorwiegend in Lichtrichtung → echte, seitlich sichtbare God-Rays) und **Volumetric
Scattering Intensity** pro Licht. Rauschtexturen für lokal begrenzten Nebel ("multiple spherical
fog particles with noise from textures") kommen laut Doku erst auf dieser volumetrischen Stufe
ins Spiel, nicht auf der einfachen Height-Fog-Stufe. Kosten laut Doku: ~1 ms (PS4, High) bis
~3 ms (GTX 970, Epic) Basiskosten; geschattete Punkt-/Spot-Lichter kosten ca. das Dreifache
gegenüber ungeschatteten.

**Unity HDRP — Local Volumetric Fog:** Oriented-Bounding-Box-Volumen, gefüllt über eine
3D-Textur-Maske (RGB=Farbe, Alpha=Dichte) oder ein Shader-Graph-Material, voxelisiert auf 64/128
Tiefenscheiben. **Scroll Speed** (pro Achse) und **Tiling** sind offizielle, dedizierte
Parameter, die die Maskentextur über Zeit verschieben — genau der Textur-Scroll-Trick für
wabernden/windgetriebenen Nebel, offiziell vorgesehen. Wichtige Einschränkung, explizit in der
Doku: *"Local Volumetric Fog doesn't support volumetric shadowing"* — **Single Scattering
Albedo** färbt Licht additiv ein, ist aber keine echte Streuungssimulation mit
Selbstabschattung. Einordnung: echtes 3D-Dichtefeld (mehr als unsere Stufe 0), aber bewusst
abgespeckte Zwischenstufe ohne volumetrische Schatten.

**Godot 4 — Volumetric Fog:** ebenfalls Froxel-Buffer-basiert (konfigurierbare Slice-Anzahl
entlang der Froxel-Tiefe). **Alle** Lichttypen interagieren mit dem Nebel, Schatten bleiben
**innerhalb** des Nebelvolumens sichtbar — anders als Unity also volle
Licht-Selbstabschattung im Medium. 3D-Noise-Texturen auf `FogVolume` erzeugen statische
Dichtemuster; für Animation verweist die Doku explizit auf ein **eigenes Custom-Fog-Shader**.
Kritische Einschränkung: *"Volumetric fog is only supported in the Forward+ renderer, not the
Mobile or Compatibility renderers"* — selbst Godot verweigert das auf seinem Low-End-Pfad, ganz
wie WebGL1 bei uns kein realistischer Zielpfad wäre.

**Frostbite (EA) — Physically Based and Unified Volumetric Rendering (Hillaire, SIGGRAPH 2015):**
das meistzitierte Referenz-Papier für modernen Spiele-Nebel. Kernarchitektur: Froxel-Textur
(Standard 8×8 Volumen-Tiles × 64 Tiefenscheiben), die **dieselbe pro-Tile-Lichtliste aus dem
Tiled-Deferred-Lighting-System wiederverwendet** — exakt die Infrastruktur-Überlappung mit
Clustered/Tiled Lighting (#5), hier aber von der Quelle selbst etabliert, nicht nur vermutet.
Physikalisches Materialmodell pro Froxel: Absorption/Streuung/Phasenfunktion/Emission,
Extinktion σₜ = σₛ+σₐ. Ein Sample pro Froxel integriert alle Lichtquellen; für korrekte
Selbstabschattung im Medium: volumetrische Schattenkarten (3-Level-Clipmap). Temporales
Jittering (Halton-Sequenz) gegen Aliasing bei Kamerabewegung — konzeptionell verwandt mit dem
TAA-Jitter aus #9, nur pro Froxel-Ray statt pro Pixel. Das ist die "volle" Stufe B —
Referenzarchitektur, an der sich Unreal und Godot sichtbar orientieren.

**Quellen:** [Exponential Height Fog in Unreal Engine (UE 5.8)](https://dev.epicgames.com/documentation/unreal-engine/exponential-height-fog-in-unreal-engine) ·
[Volumetric Fog in Unreal Engine (UE 5.8)](https://dev.epicgames.com/documentation/unreal-engine/volumetric-fog-in-unreal-engine) ·
[Local Volumetric Fog | Unity HDRP 14.0](https://docs.unity3d.com/Packages/com.unity.render-pipelines.high-definition@14.0/manual/Local-Volumetric-Fog.html) ·
[Volumetric fog and fog volumes — Godot Engine (latest)](https://docs.godotengine.org/en/latest/tutorials/3d/volumetric_fog.html) ·
[Physically-based & Unified Volumetric Rendering in Frostbite (Hillaire, SIGGRAPH 2015)](https://www.slideshare.net/slideshow/physically-based-and-unified-volumetric-rendering-in-frostbite/51840934) ·
[EA Frostbite News (offizielle Ankündigung)](https://www.ea.com/frostbite/news/physically-based-unified-volumetric-rendering-in-frostbite)

### 6.2 Zwei technologische Stufen — Zuordnung

- **Stufe 0 (wir, aktuell):** analytischer Distanz-/Höhen-Blend, kein Scattering, kein Noise.
  Entspricht Unreals Exponential Height Fog *ohne* Directional Inscattering.
- **Stufe A (billiger Trick, theoretisch — von keiner geprüften Engine so gebaut):** unseren
  bestehenden `fogFactor` mit einer scrollenden 2D/3D-Noise-Textur multiplizieren
  (`density *= noise(worldPos * scale + time * windDir)`), rein im Fragment-Shader, weiterhin
  nur ein Farb-Blend ohne Licht-Interaktion. Würde optisch wabernde Schwaden erzeugen, liefe
  günstig auf allen drei Backends inkl. WebGL1. **Ehrlicher Befund:** keine der vier geprüften
  Engines implementiert genau das als eigenständige Stufe — Rauschanimation taucht überall erst
  *auf* einer bereits volumetrischen (Stufe-B-)Basis auf. Stufe A ist damit unser eigener
  pragmatischer Zwischenschritt, kein branchenüblicher Pfad — schnell zu bauen, aber ein Abzweig,
  kein Etappenziel Richtung "richtig".
- **Stufe B (echte volumetrische Streuung):** Froxel-Dichteraster + Raymarching entlang des
  Sichtstrahls + Phasenfunktion gegen Lichtquellen, echte God-Rays/In-Scattering. Teilt die
  Frustum-Slicing- und Pro-Zelle-Lichtlisten-Infrastruktur mit Clustered Lighting (#5) — bei
  Frostbite keine Vermutung, sondern dokumentierte Architektur-Entscheidung. WebGPU über
  Compute (wie #5), WebGL2 über CPU-Culling + Datentextur (analog #5), WebGL1 kein realistischer
  Weg (Godot verweigert Volumetric Fog auf seinem Low-End-Renderer aus demselben Grund).
  Innerhalb Stufe B gibt es noch eine Abstufung: mit volumetrischer Selbstabschattung (Unreal,
  Godot, Frostbite) vs. ohne (Unity HDRP, günstiger aber sichtbar weniger korrekt an
  Objektkanten im Nebel).

**Für "wabernde Nebelschwaden mit Lichtreflexion" führt kein Weg an Stufe B vorbei** — keine der
vier großen Engines erreicht diesen visuellen Effekt auf Stufe 0 oder einem simplen
Noise-Aufsatz (Stufe A). Direkter, infrastruktur-teilender Pfad: Stufe B direkt nach #5 bauen,
wie in der Prioritätstabelle oben (#13) vermerkt — durch die Frostbite-Quelle jetzt bestätigt,
dass "zuerst Pro-Zelle-Lichtlisten, dann Nebel als Konsument derselben Listen" die
Standard-Vorgehensweise ist, keine Vermutung mehr.

### 6.3 Schneesturm — teilt das dieselbe Infrastruktur?

**Kurze Antwort: laut den gefundenen Quellen nein, nicht in der Praxis.** Zwei konkrete
Referenzen zu Blizzard-Rendering, beide **keine** Froxel-/Volumen-Ansätze:

- **Unreal Engine 4.27 "Snow Examples":** der Blizzard-Effekt ist laut Doku ein "GPU Sprite
  Particle System comprised of a massive amount of small sprites using a Lit Translucent
  Material" — ein Partikelsystem mit sehr vielen kamera-nahen Sprites, kein
  Dichte-Volumen/Raymarching. (Direkter Abruf lieferte HTTP 403; Zitat aus dem indexierten
  Such-Snippet der offiziellen Doku-URL, nicht per Volltext-Fetch gegengeprüft — Einschränkung
  hier vermerkt.)
- **Company of Heroes 2 Rendering-Tech-Slides:** Blizzard-VFX wurden explizit *nicht* über ein
  volumetrisches Nebelmodell gelöst, sondern über Partikel-Overdraw-Optimierung: Wetter-Partikel
  werden in halber Bildschirmauflösung in eine separate Textur gerendert und als Post-Process
  über das volle Bild kompositiert — ein reines Performance-Problem bei vielen überlappenden
  transparenten Sprites, gelöst durch Auflösungs-Trick, nicht Participating-Media-Mathematik.
  Reduzierte Worst-Case-Framerate-Einbrüche von ~30 % auf unter 4 %.

**Fazit:** die physikalische Verwandtschaft existiert (beides sind partizipierende Medien mit
Dichte und Phasenfunktion), aber die geprüften Engines behandeln Schneesturm praktisch als
**Partikel-VFX-Problem** (Sprite-Overdraw, Auflösungstricks), nicht als Fog-Problem. Das
widerlegt die ursprüngliche Annahme, Schneesturm ließe sich als Parametrisierung des
Froxel-Nebelsystems mitbauen — er bräuchte ein eigenes, partikelbasiertes System mit eigenen
Optimierungsfragen (Overdraw bei Kameranähe), das mit dem Nebel höchstens die Lichtfarbe/den
Kontrast teilt, nicht die Rendering-Pipeline. `InstancedMesh`/GPU-Sprites existieren bei uns
bereits (siehe Instancing-Audit #10) als Baustein für ein eigenständiges Vorhaben.

**Quellen:** [Snow Examples (Blizzard) — Unreal Engine 4.27 Docs](https://docs.unrealengine.com/4.27/en-US/Resources/Showcases/Effects/SnowExamples) ·
[Company of Heroes 2 Rendering Tech (Daniel Barrero)](https://www.slideshare.net/proyZ/daniel-barrero-coh2renderingtech)

---

## Nächste Schritte

**Stand 2026-08-20:** #1–#4, #6, #7, #9, #10, #11 sind umgesetzt (bzw. #10 als Audit
abgeschlossen), #8 als bewusst ehrlich eingeordnetes vereinfachtes HBAO (nicht GTAO). **#5
(Clustered/Tiled Forward+ Lighting) ist fertig, auf WebGPU (Compute) und WebGL2 (CPU-Culling)** —
siehe `docs/adr/0007-clustered-lighting-webgl2-webgpu-only.md`. **#13 (echter volumetrischer Nebel,
Stufe B, siehe Abschnitt 6) ist als hochpriorisierter Nachfolger direkt nach #5 eingeplant** —
der Maintainer hat Nebel explizit als wichtig markiert. #16 (Schneesturm) ist recherchiert, aber
als eigenständiges Partikel-VFX-Vorhaben ohne Fog-Abhängigkeit eingeordnet, kein unmittelbarer
nächster Schritt. #12, #14, #15 bleiben bewusst zurückgestellt (niedrige Priorität bzw. kein
aktueller Anwendungsfall).
