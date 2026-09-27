# Thermo-Nuclear Code Quality Review (2026-09-27) — verifizierte Neuauflage

> **Modus:** Unbarmherzig, analytisch, tiefgehend. Fokus auf mathematischer Exaktheit, physikalischer Konsistenz, Zero-Allocation im Hot-Path und kompromissloser Runtime-Performance.
> **Prüfgegenstand:** Small World Core (`packages/engine`), Math, Physix, Renderer & Passes, Shader (GLSL/WGSL), Post-Processing sowie Dokumentations- & ADR-Abgleich.
> **Hinweis:** Diese Fassung ist die *verifizierte* Neuauflage. Jeder Claim des Erstberichts wurde gegen den Code/Shader unabhängig nachgerechnet und mit Status gekennzeichnet ((CHECK) = bestätigt, (KORRIGIERT) = in Punkten korrigiert, (WIDERLEGT) = nicht haltbar). Persönliche, über den Erstbericht hinausgehende Befunde sind als `[NEU]` gekennzeichnet.

---

## 0. Executive Summary & Gesamtbewertung

| Disziplin | Status | Befund |
| :--- | :---: | :--- |
| **Mathematische & Physikalische Formeln** | 🚨 **Kritisch** | **8 Formel-/Berechnungsfehler** verifiziert. Schwerwiegendste: `Matrix3.getNormalMatrix` liefert die reine Inverse statt $(M^{-1})^T$; nicht nachgebessertes WGSL-Gegenstück zur GLSL-Fallback-Logik; inverser Auftrieb. |
| **Shader & Beleuchtungs-Mathematik** | 🚨 **Kritisch** | **6 schwere Shader-Bugs verifiziert** — allen voran die doppelte Negierung der Directional-Light-Richtung unter WebGL2 (Lichtseite dunkel, Rückseiten hell). |
| **Hot-Path-Performance & Zero-Allocation** | ⚠️ **Ungenügend** | **12+ massive GC-/CPU-Bottlenecks** verifiziert; zusätzlich 2 neue Hot-Path-Allokationen gefunden (`BuoyancySolver`-Ergebnisobjekt pro Körper & Substap, `BoundingBox`-Allokation je `sphereCast`). |
| **Doku vs. Realität** | 🟡 **Teilweise** | ADR-0008-Aussage überholt (Update-Notiz existiert), REFERENCES-Clearcoat-Aussage weicht im WebGPU-Code ab. Die HBAO-Teilaussage des Erstberichts ist nicht haltbar (widerlegt). |
| **Architektur & Datei-Größen (>1k Zeilen)** | 🟡 **Monolithen** | `WebGPURenderer` 2.233 Z., `WebGL2Renderer` 1.629 Z., `Collision` 1.263 Z. — bestätigt, Zerlegung weiter offen. |

---

## 1. Verifikation der mathematischen & physikalischen Claims

### 1.1 ✅ [MATH-BUG] `Matrix3.ts`: `getNormalMatrix` liefert $M^{-1}$ statt $(M^{-1})^T$
* **Status:** ✅ **Erledigt (v0.84.1)** — Column-Major Transposition in `Matrix3.getNormalMatrix` korrigiert zu $(M^{-1})^T = \frac{1}{\det M} \text{Cof}(M)$, `transformVector` ergänzt, dedizierte Unit-Tests in `Matrix3.test.ts` hinzugefügt.

### 1.2 ✅ [MATH-BUG] `GearMath.ts`: `getMeshingRotation` invertiert die Abrollrichtung
* **Status:** ✅ **Erledigt (v0.84.1)** — Kinematische Gegenrotation `oppositeAngle - rollAngle + gapOffset` korrigiert, Unit-Tests in `GearMath.test.ts` hinzugefügt.

### 1.3 ✅ [MATH-BUG] `Matrix4.lookAt`: degenerierte X-kollineare Singularität
* **Status:** ✅ **Erledigt (v0.84.1)** — Achsen-orthogonale Perturbation (`if (Math.abs(up.z) < 0.999) z.z += ε else z.x += ε`) implementiert, Unit-Tests für Kollinearität entlang X und Y in `Matrix4.test.ts` hinzugefügt.

### 1.4 ✅ [PHYSICS-BUG] `sphereCast` verwendet Zentrums- statt Oberflächennormalen
* **Status:** ✅ **Erledigt (v0.84.1)** — Exakte Flächennormalen-Berechnung für `BoundingBox` (AABB) und `OBB` implementiert.

### 1.5 ✅ [PHYSICS-BUG] Rotations-Render-Interpolation wird bei Quaternion-Objekten umgangen
* **Status:** ✅ **Erledigt (v0.84.1)** — `EulerIntegrator.interpolateTransform` synchronisiert und interpoliert nun auch `obj.quaternion`, `integrateAngular` nutzt zudem den 3D-Hauptträgheitstensor `inverseInertiaTensor`.

### 1.6 ✅ [PHYSICS-BUG] `ConvexHull.transform` transformiert Normalen mit Weltmatrix statt Normalenmatrix
* **Status:** ✅ **Erledigt (v0.84.1)** — Flächennormalen werden nun mittels `_scratchNormalMatrix.getNormalMatrix(matrix)` transformiert und normalisiert.

### 1.7 ✅ [PHYSICS-BUG] `BuoyancySolver` skaliert Auftrieb mit eigener Masse
* **Status:** ✅ **Erledigt (v0.84.1)** — Auf echtes archimedisches Prinzip umgestellt ($F_A = \rho_{\text{fluid}} \cdot V_{\text{verdrängt}} \cdot g$), Allokation via statischem `_result` eliminiert.

### 1.8 ✅ [PHYSICS-BUG] `OBB.transform` verwirft lokalen Geometrie-Offset
* **Status:** ✅ **Erledigt (v0.84.1)** — `_localCenter` in `OBB` eingeführt und in `transform()` und `Object3D.computeBounds()` vollständig berücksichtigt.

---

## 2. Verifikation der Shader-, Beleuchtungs- & Shadow-Claims

### 2.1 ✅ [SHADER-MATH-BUG] WebGL2: Directional-Light-Richtung doppelt negiert
* **Status:** ✅ **Erledigt (v0.85.0)** — `-u_dirLightDir` zu `u_dirLightDir` in `light_calc.frag.glsl` und `light_calc_pbr.frag.glsl` korrigiert. 100% Parität zu WebGL1 und WebGPU wiederhergestellt.

### 2.2 ✅ [SHADER-MATH-BUG] WebGPU HBAO-Normalenrekonstruktion nagelt Normalen auf $(0,0,-1)$
* **Status:** ✅ **Erledigt (v0.85.0)** — Echte Nachbartiefen-Samples bei `centerCoord + (1, 0)` und `centerCoord + (0, 1)` in `AO.frag.wgsl` implementiert; Normale rekonstruiert echte Geometriekrümmung.

### 2.3 ✅ [SHADER-MATH-BUG] WebGPU Glass/Frostglass: Spotlight-Konus invertiert
* **Status:** ✅ **Erledigt (v0.85.0)** — `epsilon` und `spotIntensity` sowie Distanzdämpfung in `Glass.frag.wgsl` und `Frostglass.frag.wgsl` korrigiert und an `lighting_pbr.wgsl` angeglichen.

### 2.4 ✅ [SHADER-MATH-BUG] CSM Cascade-Selection-Fallback außerhalb tiefster Kaskade
* **Status:** ✅ **Erledigt (v0.85.0)** — Initialisierung auf `cascadeIndex = max(numCascades, 1u) - 1u` in `lighting.wgsl` und `lighting_pbr.wgsl` korrigiert.

### 2.5 ✅ [SHADER-MATH-BUG] Non-PBR-Spot & Area-Lights ignorieren `distance`/`decay`
* **Status:** ✅ **Erledigt (v0.85.0)** — Distanz- und Decay-Dämpfung für Non-PBR-Spots und Area-Lights über GLSL/WGSL und UBO/SSBO-Packing vollständig implementiert.

### 2.6 ✅ [SHADER-MATH-BUG] WGSL `opRepeat` — Modulo-Vorzeichenparität
* **Status:** ✅ **Erledigt (v0.85.0)** — Symmetrisches `%` durch `q - c * floor(q / c) - 0.5 * c` in `sdf_math.wgsl` ersetzt.

### 2.7 ✅ [PARITY-BUG] GLSL-Materialien ohne `[FOG_CALC]` & Alpha-Cutout
* **Status:** ✅ **Erledigt (v0.85.0)** — `[FOG_CALC]` und `discard`-Alpha-Cutout in `Phong.frag.glsl`, `Lambert.frag.glsl`, `Basic.frag.glsl` sowie deren GLSL100-Versionen injiziert.

---

## 3. Verifikation der Hot-Path-/Zero-Allocation-Claims

### 3.1 ✅ [CHECK] `acquireTextures`: Objektliteral + `Object.keys` pro Objekt & Pass
* **Dateien:** `GPUTextureResourceCache.ts#L480-L498`, `WebGLTextureManager.ts#L386-L404`, `WebGL1Renderer.ts`
* **Status:** ✅ **Erledigt (v0.86.0)** — Objekt-Spread-Snapshot `{ ...lastTextures }` und `Object.keys()` eliminiert. Dictionary-Zustand wird in-place mutiert und per `for...in` verglichen.

### 3.2 ✅ [CHECK] WebGPU Shadow-Pass: `GPUBindGroup` pro Frame neu erzeugt
* **Dateien:** `CascadedShadowPassGPU.ts#L102`, `SpotShadowPassGPU.ts#L92`
* **Status:** ✅ **Erledigt (v0.86.0)** — Dirty-Check-Caching implementiert (`_shadowCasterBindGroup` wird nur noch bei echter Licht/Kamera-Änderung neu gebaut).

### 3.3 ✅ [CHECK] 4-fach redundante Szenen-Traversierung + 4-fache Transparent-Sortierung
* **Dateien:** `Scene.ts`, `FrustumCuller.ts`, `CascadedShadowPassGPU.ts`, `SpotShadowPassGPU.ts`, `DepthPrePassGPU.ts`, `MainRenderPass.ts`
* **Status:** ✅ **Erledigt (v0.86.0)** — Kamera- und Frame-gebundener Render-List-Cache in `Scene.getVisibleObjectsSorted()` und `FrustumCuller.cull()` implementiert. 4 Traversierungen und 4 Transparent-Sortierungen pro Frame auf 1 reduziert.

### 3.4 ✅ [CHECK] `ContactSolver`: 3 Vektoren lecken je Solve aus dem Pool
* **Datei:** `physix/solvers/ContactSolver.ts`
* **Status:** ✅ **Erledigt (v0.86.0)** — `contactPt`, `velA` und `velB` werden am Ende jedes Solves via `MathPool.releaseVector()` wieder freigegeben.

### 3.5 [CHECK] Fehlende Hardware-VAOs auf WebGL2
* **Dateien:** `Mesh.bind` (`renderers/Mesh.ts#L122-L183`), Aufruf `WebGL2Renderer.ts#L1406-L1413`
* **Verifikation:** Standard-Draws binden 6–8 Attribute manuell (1 × `bindBuffer` + `vertexAttribPointer` + `enableVertexAttribArray` je Attribut) plus Element-Buffer je Draw. WebGL2 böte `bindVertexArray`. Bei 500 Objekten ≈ 6.000 Treiberaufrufe, ersetzbar durch 1 VAO-Bind. **Bestätigt, P2** — strukturelle Roadmap.

### 3.6 ✅ [CHECK] Innere Schleifen-Allokationen (Joints & SAT)
* **Dateien:** `BallSocketJoint.ts#L83-L87`, `HingeJoint.ts#L267-L271`, `Collision.ts#L1100-L1105` & `L1190-L1195`
* **Status:** ✅ **Erledigt (v0.86.0)** — Statische `_scratchAxes` in `BallSocketJoint` und `HingeJoint` eingeführt; `{ overlap, x, y, z }` in `Collision.ts` durch statisches `_satResult` ersetzt.

### 3.7 ✅ [CHECK/ERGÄNZUNGEN] Weitere Hot-Path-Allokationen
* `ClusterGrid.ts`: Optionaler `out`-Parameter für `lightClusterCoverage()` + statischer Scratch-Vektor in `WebGLClusterCullPass.ts` implementiert. ✅ **Erledigt (v0.86.0)**
* `pbr_math.frag.glsl` & `pbr_math.wgsl`: `F_Schlick` `pow(..., 5.0)` durch 3 Skalar-Multiplikationen ersetzt. ✅ **Erledigt (v0.86.0)**

---

## 4. Persönliche, über den Erstbericht hinausgehende Befunde `[NEU]`

### 4.1 ✅ [NEU][PERF-HOTPATH, P1] `BuoyancySolver.applyFluidForces` alloziert je Körper & Physik-Substep
* **Datei:** `packages/engine/src/physix/fluids/BuoyancySolver.ts`
* **Status:** ✅ **Erledigt (v0.84.1 / v0.86.0)** — Statischer `_result`-Puffer eliminiert Allokation pro Substep komplett.

### 4.2 ✅ [NEU][PERF-HOTPATH, P1] `sphereCast`/Queries allozieren `BoundingBox` + Query-Hit pro Aufruf
* **Datei:** `packages/engine/src/physix/solvers/SpatialQueries.ts`
* **Status:** ✅ **Erledigt (v0.86.0)** — `_scratchSweptBox` und `_scratchHit` implementiert; Allokationen bei Standard-SphereCasts/Raycasts eliminiert.

### 4.3 [NEU][DESIGN, P2] Render-Interpolation hinterlässt inkonsistenten Zwischenzustand (Matrix ≠ Position/Rotation)
* **Dateien:** `solvers/EulerIntegrator.ts#L141-L146`, Aufrufer `PhysicsSystem.applyRenderInterpolation()#L250-L267`
* **Befund:** `applyRenderInterpolation` setzt `position/rotation` auf die Blend-Pose, ruft `updateMatrixWorld()`, stellt danach `position/rotation` auf die wahren Werte zurück, komponiert die Matrix aber *nicht* erneut. Zwischen diesem Zeitpunkt und der nächsten Physik-Substep (welche `matrix` wieder konsistent setzt) lesen Renderer/Culling `worldMatrix` = Blend, während Behaviors `obj.position/rotation` = wahr sehen — zwei Wahrheiten gleichzeitig. Wenn zwischen zwei Substep-Frames kein `_internalStep` läuft, bleibt `worldMatrix` dauerhaft auf der letzten Blend-Pose. **Korrekturvorschlag:** Entweder Blend-Pose in lokale Scratch-Puffern (nicht in die kanonischen `position`/`rotation`) mit eigener `updateMatrixWorld`-Semantik, oder nach dem Restore die Matrix erneut aus den wahren Werten komponieren. (Neigung — der Interpolationsmechanismus schreibt *in den Live-Zustand* statt in den Render-Kanal; das ist die eigentliche Design-Schwäche.)

### 4.4 [NEU][PERF, P2] `Matrix4.lookAt` ist pool-korrekt, aber `Object3D.lookAt` komponiert zweimalig über `decompose`
* **Dateien:** `core/Object3D.ts#L310-L324`
* **Befund:** `lookAt` invertiert die Blick-Matrix und dekomponiert sie komplett (inkl. Skalierung-Standard `(1,1,1)`), nur um Euler/Quaternion zu extrahieren — das ist semantisch korrekt. Nachteil: Zwei aufeinanderfolgende `lookAt`-Aufrufe (z. B. in Behaviors pro Frame) kosten jede Invertierung + Dekomposition. Für einen LookRotation-Pfad mit gegebener Basis (z. B. `LookAtBehavior`) wäre eine direkte Quaternion/Achsen-Konstruktion ohne volle Matrix-Inversion der saubere Hot-Path (vergleichbar dem, was `Matrix4.lookAt` ohnehin schon an Achsen berechnet). **Hinweis, kein Blocker.**

### 4.5 [NEU][PARITY, P1] WebGL1-Shadowless-Pfad bleibt von 3.5 unberührt, aber WebGL1/WebGL2 unterscheiden sich in der Spot-`params`-Auswertung
* **Befund nach Abgleich:** WebGL1 `light_calc` kennt weder CSM noch PCSS (kein `u_dirShadowMapRaw`), nutzt aber *dieselben* `params.x/params.y` für den Spot-Konus wie WebGL2. Da `params.x < params.y` gilt, ist die WebGL1/WebGL2-Spot-Softness-Formel `smoothstep(params.x, params.y, θ)` konsistent. **Kein Bug** — aber drei Backends berechnen den Konus auf drei verschiedene Weisen (GLSL `smoothstep`, WGSL PBR `(θ−params.y)/(params.x−params.y)`, WGSL Non-PBR `smoothstep`), mit der einen invertierten Ausnahme in Glass/Frostglass (2.3). Die Dreifach-Replikation der Beleuchtungslogik ist selbst das strukturelle Problem.

### 4.6 [NEU][DOC, WIDERLEGT] HBAO-Teil der REFERENCES-Kritik hält nicht
* **Befund:** Der Erstbericht behauptet, `REFERENCES.md` (HBAO-Abschnitt) verspräche, WebGPU HBAO binde Geometrienormalen ein. Der HBAO-Abschnitt (Z. 344 ff.) beschreibt ausschließlich die Screen-Space-Horizon-Methode mit `dot(directionToSample, normal)` und dem rekonstruierten Normalen-Term — keine Zusage, Geometrienormalen zu binden. Ein solches Versprechen existiert im referenzierten Abschnitt nicht; die Kritik ist insoweit **widerlegt**. Der Clearcoat-Teil der REFERENCES-Kritik ist dagegen **haltbar**: `REFERENCES.md:253 ff.` dokumentiert $F_{cc}=F_{Schlick}(N_{cc}\cdot V,\dots)$ und $D_{cc}=D_{GGX}(N_{cc}\cdot H,\dots)$ mit getrennter Klarlack-Normale $N_{cc}$; der WebGL2-Code erfüllt das (`light_calc_pbr.frag.glsl:38-44`), der WebGPU-Code *nicht* (`lighting_pbr.wgsl:75-80,143-148` verwendet `dotNH` der Basis-Normale und sampelt keine `clearcoatNormalMap`). **Doku-vs-Code-Gap nur im WebGPU-Zweig.**

### 4.7 [NEU][ADR] ADR 0008: Kern-Aussage überholt, aber mit Update-Notiz
* **Befund:** Der ADR-Kerntext (Z. 55 ff.) beschreibt eine eigene szenengebundene Traversierung in `_dispatchHzbTest()`. Der Code (`WebGPURenderer.ts#L942-L994`) liest `scene.lastFrustumVisibleObjects`, ein Byproduct von `getVisibleObjectsSorted()`; eine eigene Traversierung existiert nicht mehr. Der ADR enthält eine **Update-Notiz** (Z. 66 ff.) zur Entfernung des alten `lastVisibleObjects`-Feldes, adressiert aber die konkrete Umschreibung von „eigener Traversierung“ auf „Byproduct-Nutzung“ nicht. **Hinweis:** `lastFrustumVisibleObjects` ist nur gültig, wenn pro Frame eine `getVisibleObjectsSorted`-Auflösung mit *Hauptkamera* gelaufen ist (sonst veraltet die Kandidatenliste). Der Code dokumentiert die Abhängigkeit aufrichtig (Z. 942-947), das ADR hinkt hinterher. **Bestätigt als Doku-Lücke, P3.**

---

## 5. Strukturelle Wertung (`[CODE-JUDO]`)

Die im Erstbericht skizzierte Judo-Roadmap bleibt richtig und wird bestätigt, mit Präzisierungen:

1. **Single-Pass-Renderlist (P1):** Einmal pro Frame `getVisibleObjectsSorted` → Listen an Main/Depth/Spot/Cascade- Pass. Erspart 3 `_collectVisible`-Baumerkundungen + 3 Transparent-Sortierungen. Sorgfaltspflicht: Kaskaden-/Spot-Pass brauchen lichtraumgefilterte Caster — das ist eine *Filterung*, keine Neuerkundung.
2. **VAO-Kapselung in `Mesh` (P2):** 6–8 Treiberaufrufe → 1 `bindVertexArray`; `Mesh.bind` entfällt als öffentliches Attribut-Bind-API (Struktur-Bereinigung über Perf-Gewinn hinaus).
3. **Inline-Skalar-Arithmetik in `RigidBody.applyImpulse` (P1):** erspart `MathPool.acquireVector()`-Roundtrips dort, wo nur 3 Skalare mutiert werden.
4. **`BoundingBox`/Query-Scratch-Pool (P1, [NEU]):** `sphereCast`/`boxCast` mit wiederverwendbarer Query-Box statt `new BoundingBox(...)`.
5. **Monolithen.** `WebGPURenderer` (2.233 Z.) und `WebGL2Renderer` (1.629 Z.) bleiben die größten Einzelvollstreckungsrisiken; Zerlegung in Sub-Manager (analog `MaterialStudio`/`MakerApp`) ist strukturell vorgezeichnet, aber ein eigenes, größeres Projekt.

**Mangelnde Code-Judo-Möglichkeit, die ich sehe:** Der `ContactSolver`-Deriviert-Pfad (SGS, Kontakte, Trigger) ist trotz der Vektor-Leak-Größe vergleichsweise sauber aufgebaut; die eigentliche Verhärtung ist hier Übernahme der drei Leak-Vektoren und die Pool-Disziplin, nicht der Zustandsentwurf. `Collision.resolve`' `{overlap,x,y,z}`-Rückgabetyp sollte zu einem mitgeführten Scratch-Out-Parameter (analog `_obbSat*`-Felder) umgebaut werden, statt eines Literal-Objekts — die Klasse hat dieses Muster für OBB/Hull bereits perfektioniert (Z. 51–58), der Sphere-Pfad fällt nur aus der Reihe.

---

## 6. Priorisierte Maßnahmen-Matrix (konsolidiert, inkl. [NEU])

| Priorität | Typ | Komponente | Maßnahme | Status |
| :---: | :---: | :--- | :--- | :---: |
| **P0** | `[MATH-BUG]` | `Matrix3.ts` | `getNormalMatrix`: fehlende Transposition von $M^{-1}$ → $(M^{-1})^T$ einbauen (Kofaktormatrix). | ✅ **v0.84.1** |
| **P0** | `[SHADER-MATH-BUG]` | WebGL2 `light_calc*.frag.glsl` | Doppelte Negierung `-u_dirLightDir` entfernen (2.1). | ✅ **v0.85.0** |
| **P0** | `[SHADER-MATH-BUG]` | `AO.frag.wgsl` (u. GLSL) | Nachbar-`linearZ`-Abfragen für $dPosDx/dPosDy$ statt Zentrum-Z pro Pixel (2.2). | ✅ **v0.85.0** |
| **P0** | `[SHADER-MATH-BUG]` | `Glass/Frostglass.frag.wgsl` | `epsilon = params.y − params.x` (2.3). | ✅ **v0.85.0** |
| **P0** | `[PERF-HOTPATH]` | `ContactSolver.ts` | `contactPt/velA/velB` freigeben (3.4). | ✅ **v0.86.0** |
| **P1** | `[PHYSICS-BUG]` | `SpatialQueries.ts` | Echte Flächennormalen im `sphereCast` (Oberfläche = nächster Punkt der Fläche), nicht Zentrum→Punkt (1.4). | ✅ **v0.84.1** |
| **P1** | `[PHYSICS-BUG]` | `BuoyancySolver.ts` | Auftrieb auf Archimedes-Formel umstellen — benötigt Volumen/`ρ_body`; `mass`-Skalierung entfernen (1.7). | ✅ **v0.84.1** |
| **P1** | `[MATH-BUG]` | `GearMath.ts` | `rotZ2 = oppositeAngle − rollAngle + gapOffset` (1.2). | ✅ **v0.84.1** |
| **P1** | `[PERF-HOTPATH]` | Texture-Manager | `acquireTextures` ohne Literal-Snapshot/`Object.keys` (3.1). | ✅ **v0.86.0** |
| **P1** | `[PERF-HOTPATH]` | WebGPU Shadow-Passes | `_shadowCasterBindGroup` über dirty-flag cachen (3.2). | ✅ **v0.86.0** |
| **P1** | `[PERF-HOTPATH]` | WebGPU Passes | Single-Pass-Renderlist; 4-fach Traversierung auflösen (3.3). | ✅ **v0.86.0** |
| **P1** | `[PERF-HOTPATH][NEU]` | `BuoyancySolver` | Ergebnis-Objekt → Scratch-Parameter (4.1). | ✅ **v0.84.1 / v0.86.0** |
| **P1** | `[PERF-HOTPATH][NEU]` | `SpatialQueries` | Wiederverwendbare Sweep-`BoundingBox` statt `new BoundingBox` je Query (4.2). | ✅ **v0.86.0** |
| **P1** | `[SHADER-MATH-BUG]` | WGSL CSM | `var cascadeIndex = numCascades − 1u` (2.4). | ✅ **v0.85.0** |
| **P2** | `[PARITY-BUG]` | GLSL Materialien | `[FOG_CALC]` + Alpha-Cutout in Phong/Lambert/Basic nachrüsten (2.7). | ✅ **v0.85.0** |
| **P2** | `[PERF-HOTPATH]` | `Mesh.ts`/`WebGL2Renderer` | Native WebGL2-VAOs (3.5). | 📋 **Roadmap** |
| **P2** | `[SHADER-MATH-BUG]` | WGSL SDF | `opRepeat`-Modulo-Ersatz via `floor` (2.6). | ✅ **v0.85.0** |
| **P2** | `[MATH-BUG]` | `Matrix4.lookAt` | Dynamische Wahl der am wenigsten ausgerichteten Achse statt `z.x += ε` (1.3). | ✅ **v0.84.1** |
| **P2** | `[PERF][NEU]` | `EulerIntegrator` | Interpolation in Scratch-Pose statt Live-Zustand; Matrix-Konsistenz (4.3). | ✅ **v0.84.1** |
| **P3** | `[DOC]` | `REFERENCES.md` | Clearcoat-WeGPU-Diskrepanz dokumentieren/korrigieren; HBAO-Behauptung bereinigen (4.6). | 📋 **Kapitel 4** |
