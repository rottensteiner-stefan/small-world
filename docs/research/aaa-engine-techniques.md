# Was können wir uns bei den "Großen" abschauen?

**Datum:** 2026-08-19
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
| 1 | ACES-Tonemapping statt Reinhard/Linear | niedrig | hoch | zu prüfen — `TONE_MAPPING`-Effekt existiert, welche Kurve? |
| 2 | Normal-Offset Bias bei Schatten | niedrig | mittel-hoch | Lücke — aktuell nur klassisches Depth-Bias |
| 3 | Fixed-Timestep Render-Interpolation | niedrig-mittel | hoch (Ruckeln weg) | **bestätigte Lücke** — Render snapt auf letzten Physik-Step |
| 4 | CPU-Licht-Auswahl (N nächste Lichter/Objekt) | mittel | hoch | **bestätigte Lücke** — pragmatischer Zwischenschritt vor #5 |
| 5 | Clustered/Tiled Forward+ Lighting | groß | sehr hoch | **bestätigte Lücke** — hartes 4+4-Limit, global |
| 6 | PCSS (Contact-Hardening Soft Shadows) | mittel | mittel-hoch | Aufwertung von vorhandenem PCF |
| 7 | CSM-Politur (Cascade-Blending, Texel-Snapping) | niedrig-mittel | mittel | Aufwertung von vorhandenem CSM |
| 8 | GTAO (Ambient Occlusion) | mittel | mittel-hoch | **Lücke** — keinerlei AO vorhanden |
| 9 | Vereinfachtes TAA (Jitter + History-Blend) | mittel | mittel | **Lücke** — keinerlei Anti-Aliasing vorhanden |
| 10 | GPU-Instancing wirklich nutzen | niedrig (Audit) | hoch | **existiert bereits** (`InstancedMesh`) — nur prüfen, ob Disc Wars/Neon Labyrinth es nutzen |
| 11 | Cheap "Game Feel": Camera Shake, Hit-Stop, Squash&Stretch | niedrig | hoch (spürbar) | Lücke, aber sehr günstig nachrüstbar |
| 12 | LOD + Dithered Cross-Fade | mittel | mittel | Lücke, aber nicht dringend (keine Multi-LOD-Assets) |
| 13 | Froxel-Volumetric-Fog | mittel (nach #5) | mittel | teilt Infrastruktur mit Clustered Lighting — danach bauen |
| 14 | Hierarchical-Z Occlusion Culling | groß | gering (bei uns) | niedrige Priorität — Korridor-Level profitieren kaum zusätzlich |
| 15 | Billboards/Imposter | mittel | gering (bei uns) | niedrige Priorität — kein Anwendungsfall aktuell |

**Lesart:** #1–#4 sind die "low hanging fruit" — jeweils ein bis wenige Tage, hoher spürbarer
Gewinn. #5 ist die große, lohnende Baustelle, direkt gegen unser bekanntes 4-Licht-Limit.
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

**PCSS (Contact-Hardening Soft Shadows):** Zweistufig auf vorhandener PCF-Infrastruktur —
(1) *Blocker-Search*: kleine Region um den projizierten Texel abtasten, Tiefe der
näher-am-Licht-liegenden Samples mitteln; (2) *Penumbra-Schätzung*: über Strahlensatz aus
Lichtgröße, Receiver-Tiefe und mittlerer Blocker-Tiefe einen Filterradius berechnen, der mit
der Occluder-Distanz wächst; (3) PCF erneut mit diesem *variablen* statt festen Radius laufen
lassen. Das ist exakt das fehlende Stück unseres aktuellen festen PCF-Kernels — ein
Drop-in-Upgrade, kein neues Shadow-Map-Format. Kosten: etwa das Doppelte eines vergleichbaren
Fest-Kernel-PCF-Passes. Voll WebGL2-fähig, kein Compute nötig.

**Normal-Offset Bias:** Statt Tiefenwerte entlang der Lichtrichtung zurückzuschieben
(klassisches Slope-Scaled-Bias, verursacht "Peter-Panning" bei wachsendem Bias), wird die
*Sample-Position* entlang der Oberflächen-Normale verschoben (proportional zu `NdotL` und
Texelgröße), bevor sie in den Licht-Raum transformiert wird. Trennt die Behebung von
Shadow-Acne von der Tiefenwert-Manipulation — heute der De-facto-Standard (Unity, Unreal,
die meisten Engine-Tutorials). Praktisch kostenlos, eine zusätzliche Rechnung
(`worldPos + normal * texelWorldSize * offsetScale`) vor der Licht-Raum-Transformation, keine
Shader-Architektur-Änderung.

**CSM-Politur:** (a) *Cascade-Blending* — nahe einer Kaskadengrenze beide Kaskaden abtasten
und über eine Blend-Band linear überblenden, statt eines harten Auflösungssprungs (three.js'
`CSM` bietet das als `fade`-Flag). (b) *Frustum-/Texel-Snapping* — die Verschiebung des
Shadow-Frustums in Licht-Raum auf ganze Texel runden, damit das Schatten-Textur-Raster bei
Sub-Pixel-Kamerabewegung nicht "schwimmt" (das klassische CSM-Shimmering). Beides reine
Matrix-/Shader-Mathematik, keine neuen Ressourcen.

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
Draw-Call für N Kopien. **Konkrete Handlungsempfehlung:** prüfen, ob Disc-Wars-Maze-Wände und
Neon-Labyrinth-Wiederholgeometrie das tatsächlich nutzen — das ist der Fall mit dem größten
Sofort-Gewinn (Draw-Call-Overhead runter), weil die Infrastruktur schon da ist und "nur"
angeschlossen werden muss.

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

**TAA:** Kernidee: Sub-Pixel-Kamera-Jitter pro Frame + Reprojektion des Vorframes über
Motion-Vektoren + Nachbarschafts-Clamping gegen Ghosting. Eine **vereinfachte Variante**
(nur Jitter + exponentielles History-Blend, keine Motion-Vektoren) ist ein realistischer
Mittelweg für eine kleinere Engine: billig (eine Extra-Textur + ein Lerp), glättet Kanten in
statischen/langsamen Szenen spürbar, wird aber bei schneller Bewegung sichtbar
verschmieren/geistern — akzeptabler Trade-off ohne Velocity-Buffer. Volles TAA braucht
Motion-Vektoren (Extra-Render-Target, Extra-Shader-Output pro Material) — deutlich größerer
Aufwand.

**Tonemapping:** ACES wurde Industriestandard, weil es HDR-Werte über eine
wahrnehmungsoptimierte Kurve abbildet, die Highlights sanft abrollt statt hart auf Weiß zu
clippen (Reinhard/Linear brennen aus oder waschen Farben aus) — und weil es eine bekannte,
standardisierte Größe ist. AgX (Blenders neuerer Default) adressiert ACES' bekannte Schwäche
(Farbton-Verschiebung unter gesättigtem/hellem Licht — das "Six-Colors-Problem"). **Für uns:**
Wechsel von Reinhard/Linear auf ACES ist eine einzelne Shader-Funktions-Änderung mit großem
Qualitätssprung — vermutlich das beste Aufwand-Nutzen-Verhältnis der ganzen Liste
(muss noch geprüft werden, welche Kurve unser `TONE_MAPPING`-Effekt aktuell tatsächlich nutzt).

**Froxel-Volumetric-Fog:** Baut ein kamera-ausgerichtetes 3D-Raster (Froxel), akkumuliert
Dichte/Streuung pro Zelle, raymarcht das dann als Post-Process. Überlappt stark mit Clustered
Lighting (gleiche Frustum-Slicing-Mathematik, gleiche Licht-zu-Zelle-Zuordnung) — nach
Clustered Lighting zu bauen ist deutlich günstiger als isoliert zuerst.

**Quellen:** [XeGTAO README](https://github.com/GameTechDev/XeGTAO/blob/master/README.md) ·
[Ambient Occlusion: SSAO vs HBAO vs GTAO](https://superrendersfarm.com/article/ambient-occlusion-explained-ssao-hbao-gtao-2026) ·
[Temporal Anti-Aliasing – Step by Step](https://ziyadbarakat.wordpress.com/2020/07/28/temporal-anti-aliasing-step-by-step/) ·
[Filmic vs. ACES vs. AgX — Blender Artists](https://blenderartists.org/t/filmic-vs-aces-vs-agx-for-architectural-visualization/1459951) ·
[AgX Tonemapping — three.js forum](https://discourse.threejs.org/t/is-agx-tonemapping-implemented-correctly/60609) ·
[Flax Engine Volumetric Fog Docs](https://github.com/FlaxEngine/FlaxDocs/blob/c7ca0c976936f5203fc441816dcab68a7c4f31f9/manual/graphics/fog-effects/volumetric-fog.md/)

---

## 5. Physik/Animation "Game Feel"

**Fixed-Timestep Render-Interpolation:** Standardtechnik (Gaffer On Games, "Fix Your
Timestep!", genutzt von Godot/Unity/Bevy) — die letzten zwei Physik-Zustände behalten,
`alpha = accumulator / fixedTimeStep` berechnen und Transforms fürs Rendern dazwischen lerpen.
Entkoppelt variable Render-FPS von der Physik-Taktrate, eliminiert Ruckeln. Kostet einen
zusätzlichen Zustandspuffer + ein Lerp pro gerendertem Transform, plus einen Frame zusätzliche
Latenz. **Bei uns bestätigt fehlend** (siehe Bestandsaufnahme oben) — konkreter, günstiger,
hoher Gewinn.

**Blend-Trees / Crossfade / "Juice":** Blend-Trees (parametergesteuertes Blenden mehrerer
Clips, z. B. Speed → Walk/Run) und Crossfade (kurzes Überblenden bei Zustandswechsel) sind
Standard (Unity Mecanim, Godot AnimationTree), mittlerer Aufwand falls ein
Animations-Clip-System existiert. Günstige, hochwertige "Juice"-Tricks: Camera-Shake über
abklingenden Noise/Trauma-Wert, Hit-Stop (Delta-Time kurz auf 0 für betroffene Entitäten, ohne
den ganzen Loop zu pausieren), Squash-and-Stretch (kurzzeitige non-uniforme Skalierung bei
Impact/Launch). Alle drei sind je wenige Dutzend Zeilen, keine neuen Subsysteme, aber
überproportional spürbar für Spieler.

**Quellen:** [Fix Your Timestep! — Gaffer On Games](https://gafferongames.com/post/fix_your_timestep/) ·
[Beginning Game Development: Blend Trees](https://medium.com/@lemapp09/beginning-game-development-blend-trees-315cd3e78d8c) ·
[Game feel on the web: squash, shake, and the art of juice](https://valdemird.com/blog/game-feel-on-the-web/)

---

## Nächste Schritte

Dies ist ein reines Rechercheergebnis — keine der beschriebenen Techniken wurde implementiert.
Wenn eine davon umgesetzt werden soll: am besten mit #1–#4 anfangen (klein, isoliert, hoher
Sofort-Nutzen), dann #5 (Clustered Lighting) als größeres, eigenständiges Projekt angehen,
sobald Zeit dafür da ist.
