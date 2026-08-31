# Codebase-Refactoring & Dekomposition von God-Objekten

**Kontext:** Small World ist eine schlanke, modulare 3D-Engine in striktem TypeScript (WebGL1/WebGL2/WebGPU). Durch schnelles Feature-Wachstum haben sich mehrere hochgradig gekoppelte Mega-Klassen („God-Objects“), Architektur-Verletzungen (globale Singletons) und Performance-Fallen (Heap-Allokationen in Kernklassen) angesammelt.

**Ziel der Collaborate-Session:** Systematische Untersuchung der gesamten Codebase, Priorisierung der Problemfelder und Ausarbeitung eines strukturierten „Divide and Conquer“-Refactoring-Plans zur Dekomposition der Monolithen in kohäsive, lose gekoppelte Subsysteme – unter strikter Wahrung der Rückwärtskompatibilität und Engine-Gesetze.

---

## 1. Unverrückbare Leitplanken (Core Architectural Laws)

Jeder Refactoring-Vorschlag muss die Kernregeln von Small World einhalten:

1. **No Global Singletons:** Multi-Engine-Instanzen pro Browser-Tab müssen möglich sein. Instanzen/Caches/Hardware-Caps werden über Context-Injection oder Engine-Instanz übergeben.
2. **Rechtshändiges Koordinatensystem:** $+X=\text{Rechts}$, $+Y=\text{Oben}$, $+Z=\text{Hinten}$ ($-Z=\text{Blickrichtung/Vorne}$).
3. **Strict TypeScript & Zero `any`:** Explizite Typisierung, Generics oder Type-Narrowing.
4. **Behavior- / Komponentensystem:** Spezialisierte Logik (Controller, Controller-Picking) gehört in `Behavior`-Klassen, nicht fest verdrahtet in Kern-Entities.
5. **Fail-Fast & keine Setter-Exceptions:** Validierung erst bei aktiver Verarbeitung im Subsystem, nicht in Eigenschafts-Settern.
6. **Grüne Testsuite & Compiler:** `npm run lint:fix`, `npm run build:lib` und `npm run test` müssen nach jedem Schritt fehlerfrei durchlaufen.

---

## 2. Der Katalog der Problemzonen (Ist-Zustand & Diagnose)

Die Codebase-Analyse hat fünf Haupt-Cluster identifiziert:

### Cluster 1: Die GPU-Render-Leviathane
* **[`src/renderers/WebGPU/WebGPURenderer.ts`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/renderers/WebGPU/WebGPURenderer.ts) (3.294 Zeilen)**
* **[`src/renderers/WebGL2/WebGL2Renderer.ts`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/renderers/WebGL2/WebGL2Renderer.ts) (2.160 Zeilen)**
* **[`src/renderers/WebGL1/WebGL1Renderer.ts`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/renderers/WebGL1/WebGL1Renderer.ts) (1.049 Zeilen)**
* **Symptome:**
  * Vermischung von Command-Encoding/Draw-Loops mit Pipeline-Caching, BindGroupLayout-Ableitung, Clustered-Light-Compute-Passes, HZB-Pyramiden-Downsampling, Staging-Buffer-Readbacks, Texture-View-Caching, Dummy-Buffer-Fallbacks und Skinned-Mesh-Ringpuffern in einer einzigen Datei.
  * Hohe kognitive Last bei Bugfixes oder Erweiterungen von Render-Features.

### Cluster 2: Die Tool- & Forge-Chimären
* **[`src/tools/MaterialStudio.ts`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/tools/MaterialStudio.ts) (2.456 Zeilen)**
* **[`src/tools/Pixler.ts`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/tools/Pixler.ts) (1.112 Zeilen)**
* **[`src/tools/GadgetInspector.ts`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/tools/GadgetInspector.ts) (1.039 Zeilen)**
* **[`src/tools/Xtractor.ts`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/tools/Xtractor.ts) (870 Zeilen)**
* **[`src/tools/ibl-gen.ts`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/tools/ibl-gen.ts) (729 Zeilen)**
* **Symptome:**
  * Vermengung von 3D-Engine-Applikationen mit 600+ Zeilen Inline-CSS (`_injectCSS()`), 600+ Zeilen Inline-HTML (`_buildUI()`) und 1.000+ Zeilen Event-Logik (`_bindLogic()`).
  * 2D-Bildverarbeitungs-DSP (BoxBlur, Sobel-Filter, Kontrast-Berechnungen) direkt im UI-Code verdrahtet.
  * Globale Namespace-Verschmutzung (`window.update3DTextures`, `window.update3DGeometry`) zur Kommunikation zwischen DOM und 3D-Szene.

### Cluster 3: Globale Singletons & API-Gesetzesbrüche
* **[`src/core/DeviceCaps.ts`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/core/DeviceCaps.ts) (608 Zeilen):** 100% statische Klasse, erzeugt Dummy-Canvas/Contexts beim Modulimport.
* **[`src/loaders/AssetManager.ts`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/loaders/AssetManager.ts) (325 Zeilen):** Rein statische Cache-Maps und globaler Base-URL-Zustand.
* **[`src/core/renderers/shaders/ShaderRegistry.ts`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/core/renderers/shaders/ShaderRegistry.ts) (110 Zeilen):** `ShaderRegistry.instance` Singleton.

### Cluster 4: Core-Entities & Performance-Fallen
* **[`src/core/colors/Color.ts`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/core/colors/Color.ts) (848 Zeilen):**
  * Über 700 Zeilen statische Getter (`Color.WHITE`, `Color.RED`, `Color.PAPAYAWHIP`), die bei *jedem* Aufruf `new Color(...)` auf dem Heap erzeugen.
* **[`src/core/Object3D.ts`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/core/Object3D.ts) (260 Zeilen):**
  * „Fat Entity“: Verbindet Transform/Hierarchie mit Physik (`rigidBody`), Input/Picking-Events (`onPointerDown`, etc.), Renderer-spezifischem State (`occlusionCulled` für WebGPU) und statischen Inspektor-UI-Definitionen.
* **[`src/physix/PhysicsSystem.ts`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/physix/PhysicsSystem.ts) (733 Zeilen):**
  * Kombiniert Semi-Implicit Euler, CCD-Sweeps, Octree-Broadphase, Narrowphase-Dispatch, Impuls-Resolver und Fluid/Buoyancy in einer Klasse.

### Cluster 5: Loader- & Showcase-Monolithe
* **[`src/loaders/GltfLoader.ts`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/loaders/GltfLoader.ts) (750 Zeilen):**
  * GLB-Binär-Parsing, Base64-Decodierung, JSON-Traversierung, Bone-Rig-Erstellung, Mixamo-Normalisierung, `KHR_lights_punctual` und Animation-Track-Sampler in einer monolithischen Datei.
* **[`src/apps/and-now/scenes/character-diorama/showcase.ts`](file:///Users/srottensteiner/PhpstormProjects/small-world/src/apps/and-now/scenes/character-diorama/showcase.ts) (1.633 Zeilen):**
  * Eine Showcase-Datei baut prozedurale Geometrie, prozedurale Texturen auf 2D-Canvas, Ratten-Kreaturen mit 8-Gelenk-Kinematik, Flacker-Oszillatoren, Animations-Cross-Fades und DOM-Buttons.

---

## 3. Strategischer „Divide and Conquer“-Vorschlag

Für die Verhandlung im Collaborate-Protokoll wird folgende Phasen-Aufteilung vorgeschlagen:

| Phase | Fokus | Ziel & Maßnahmen | Risiko / Aufwand |
| :--- | :--- | :--- | :--- |
| **Phase 1** | **Low-Hanging Fruit & Sofort-Performance** | • `Color.ts`: Trennung in Kernklasse und statisch gefrorene Paletten/Lookups (Null-Allokation bei `Color.WHITE`).<br>• Singletons (`ShaderRegistry`, `AssetManager`, `DeviceCaps`): Vorbereitung von Instanz-basierten Schnittstellen. | Gering / Schnell |
| **Phase 2** | **Tool-Modularisierung & DSP-Extraktion** | • `MaterialStudio.ts`, `Pixler.ts`, `Xtractor.ts`: Auslagerung von Bildverarbeitungs-Algorithmen in reine DSP-Module (`src/tools/common/dsp/`).<br>• HTML/CSS-Templates in separate Dateien oder strukturierte View-Klassen.<br>• Beseitigung von `window.*` Callbacks. | Mittel / Isoliert |
| **Phase 3** | **Core Entity & Entity-Component-Bereinigung** | • `Object3D.ts`: Entlastung der Kern-Entity (Picking/Events in Behaviors, Inspektor-Definitionen entkoppeln).<br>• `GltfLoader.ts`: Zerlegung in Sub-Parser (Skins, Animations, Materials, Primitives). | Mittel / Schnittstellen stabil |
| **Phase 4** | **Renderer-Dekomposition (Die Königsdisziplin)** | • `WebGPURenderer` & `WebGL2Renderer`: Herauslösen spezialisierter Manager (`PipelineManager`, `BufferManager`, `TextureManager`, `OcclusionManager`, `ClusterLightManager`). | Hoch / Höchste Sorgfalt erforderlich |

---

## 4. Rollen-Vorschlag für die Collaborate-Session

* **Alice (Engine Architect & Core Lead):** Achtet auf API-Stabilität, Single-Instance-Entkopplung, Core-Gesetze und Lifecycle-Sicherheit.
* **Bob (Rendering & Shading Specialist):** Konzipiert die Zerlegung von `WebGPURenderer` und `WebGL2Renderer` in saubere GPU-Subsysteme ohne Performance-Verlust.
* **Charly (Tools, Performance & Physics Lead):** Fokussiert auf DSP-Auslagerung bei den Forge-Tools, Beseitigung der `Color.ts`-Allokationen und Modularisierung von Physik & Loadern.

---

## 5. Start-Diskussion & Offene Fragestellungen

1. **Reihenfolge der Angriffspunkte:** Sollen wir mit Phase 1 (Color & Singletons) oder Phase 2 (Tools) beginnen, bevor wir die Render-Monolithen anfassen?
2. **DeviceCaps / Multi-Instance-Design:** Wie soll `DeviceCaps` ohne statische Probes aufgebaut werden? (Z. B. als Instanz auf `SmallWorld` oder Renderer-spezifisch ermittelt?)
3. **Renderer-Subsysteme:** Welche gemeinsamen Schnittstellen können zwischen WebGL2- und WebGPU-Subsystemen (z. B. `ClusterLightManager`) geteilt werden?

---

## Round 1: Alice (Engine Architect & Core Lead) — 2026-08-30

### 1. Bewertung der Ausgangslage & Architektonische Priorisierung
Als Engine Architect schaue ich vor allem auf drei Kriterien:
1. **Verletzung der Core Laws (insb. No Global Singletons):** Globale Singletons wie `DeviceCaps`, `AssetManager` und `ShaderRegistry` brechen fundamentale Architektur-Zusagen von Small World (Multi-Instance-Fähigkeit in einem Tab, isolierte Testbarkeit).
2. **Kritische Performance-Leaks:** `Color.ts` erzeugt bei jedem `Color.WHITE` oder `Color.RED` ein `new Color(...)` auf dem Heap. Das ist in Hot-Loops (Material-Updates, Render-Passes) untragbar.
3. **Wartbarkeits-Explosion:** `WebGPURenderer` (3.294 Z.) und `MaterialStudio` (2.456 Z.) haben eine kognitive Last erreicht, die sichere Weiterentwicklung verhindert.

### 2. Konkrete Lösungsvorschläge für Phase 1 & 2

#### A. Phase 1: `Color.ts` Zero-Allocation & Singleton-Migration
1. **`Color.ts`:**
   - Wir behalten die API `Color.WHITE`, `Color.RED` etc. 100% abwärtskompatibel bei.
   - **Lösung:** Alle statischen Grundfarben werden als vorgefrorene, unveränderliche Instanzen erzeugt (`public static readonly WHITE = Object.freeze(new Color(1, 1, 1));`) oder per Cache ausgeliefert.
   - Die 140+ CSS-Namensfarben lagern wir in ein eigenes Lookup-Modul `src/core/colors/ColorNames.ts` aus, sodass `Color.ts` von 848 Zeilen auf unter 150 Zeilen schrumpft.
2. **Singleton-Entflechtung (`ShaderRegistry`, `AssetManager`, `DeviceCaps`):**
   - **`ShaderRegistry`:** Umwandlung in eine instanziierbare Klasse, die über den Engine-Context (`SmallWorld` / `Renderer`) gereicht wird. Für Abwärtskompatibilität kann eine Default-Instanz dienen, aber alle internen Systeme greifen via Dependency Injection darauf zu.
   - **`DeviceCaps`:** Umstellung auf Context-Bound Capabilities (`engine.deviceCaps` oder `renderer.caps`). Keine automatischen WebGL-Probes beim Modul-Import!
   - **`AssetManager`:** Instanz-basiertes Caching, optional angebunden an den Engine-Lifecycle.

#### B. Phase 2: Forge-Tools & DSP-Dekomposition
- `MaterialStudio.ts` (2.456 Z.) leidet unter 600 Z. CSS, 600 Z. HTML, 1.000 Z. Logik und rohen Bildverarbeitungsfiltern.
- **Vorschlag:**
  1. `src/tools/common/dsp/TextureFilters.ts` für `fastBoxBlur`, `sigmoidalContrast`, Sobel-Normals und Roughness-Maps.
  2. Trennung der View in separate DOM-Templates.
  3. Beseitigung von `window.update3DTextures` zugunsten von direkten Event-Bussen oder Callback-Schnittstellen.

#### C. Phase 4 Blueprint: Die GPU-Manager-Struktur
Für Bob schlage ich folgende Zielarchitektur für `WebGPURenderer` vor:
* `src/renderers/WebGPU/managers/GPUPipelineManager.ts`: Caching, Shaders, Layouts, Keys.
* `src/renderers/WebGPU/managers/GPUTextureManager.ts`: Views, Sampler, Mipmaps, CubeTextures.
* `src/renderers/WebGPU/managers/GPUBufferRing.ts`: Dynamic Uniform Ring Buffers, View-Slot-Offsets.
* `src/renderers/WebGPU/managers/GPUOcclusionCuller.ts`: HZB Compute-Pyramide, Staging-Buffer Readbacks.
* `src/renderers/WebGPU/managers/GPUClusterLightManager.ts`: Grid-Berechnung & Storage Buffers.
* `WebGPURenderer.ts` schrumpft dadurch von **3.294 auf ~500 Zeilen** reinen Orchestrierungs- und Render-Pass-Code.

### 3. Fragen an Bob (Rendering & Shading) & Staffelstab-Übergabe
1. **Bob:** Hältst du die vorgeschlagene 5-Manager-Aufteilung für WebGPU für praktikabel, und können wir Teile davon (z. B. `ClusterLightGrid` Mathe oder Interfaces) backend-agnostisch mit WebGL2 teilen?
2. **Bob:** Gibt es Bedenken bezüglich Performance / Indirektion, wenn der Renderer mit spezialisierten Managern arbeitet?

Ich übergebe für Runde 1 an **Bob**.

---

## Round 2: Bob (Rendering & Shading Specialist) — 2026-08-31

### 1. Bewertung & Antworten zu Vorrunden

Danke, Alice — bevor ich deinen Phase-4-Blueprint bestätige, habe ich den tatsächlichen Code gegengeprüft (`WebGPURenderer.ts`, `WebGL2Renderer.ts`, `src/renderers/passes/`). Wichtiger Befund, der den Blueprint korrigiert statt nur bestätigt:

**`GPUOcclusionCuller` und `GPUClusterLightManager` existieren bereits — als Pass-Klassen, nicht als Renderer-Felder.** Beide Renderer laufen bereits über ein `_passes`-Array aus dedizierten Pass-Objekten:
- WebGPU: `ClusterCullPassGPU`, `CascadedShadowPassGPU`, `SpotShadowPassGPU`, `DepthPrePassGPU`, `HzbOcclusionPassGPU`, `MainRenderPass`, `PostProcessPass` (`WebGPURenderer.ts:704-710`).
- WebGL2: `WebGLClusterCullPass`, `WebGLShadowPass`, `WebGLMainPass`, `WebGLPostProcessPass` (`WebGL2Renderer.ts:252-255`).

Das deckt sich mit `[[project_renderer_encapsulation]]`-artigen Vorarbeiten, die offenbar schon in einer früheren Session stattfanden (Pass-Klassen mit gekapselten Feldern statt öffentlicher Roh-Properties). Deine Diagnose der 3.294/2.160 Zeilen ist trotzdem korrekt — nur die Ursache ist eine andere: **die verbleibende Größe kommt nicht aus Pass-/Draw-Loop-Logik, sondern aus Resource-Management-State**, der direkt auf der Renderer-Klasse liegt und von den Passes nur *gelesen* wird:
- Pipeline-/Shader-Modul-Cache (`_pipelines`, `_shaderModules`, `_materialBGLCache`)
- Texture-View-/Sampler-/Geometrie-Caches (`_textureViewCache`, `_samplerCache`, `_geoCache`, `_cubeTextureViewCache`)
- Ring-Buffer & Instanz-Buffer (`_objectRingBuffer`, `_gpuInstanceBuffers`, `_gpuInstanceDataBuffers`)
- Dummy-/Fallback-Resources (`_whiteTexView`, `_dummyDepthTexView`, `_defaultCubeTexView`, `_dummyNormalBuffer`, …)

Das ist eine wichtige Korrektur, weil ein Refactoring, das versucht, `HzbOcclusionPassGPU`-Funktionalität *nochmal* aus dem Renderer herauszulösen, auf Leerstand träfe und Zeit verschwenden würde.

### 2. Eigene Vorschläge & Architekturentscheidungen

**Überarbeiteter Phase-4-Scope — Resource-Manager statt Pass-Manager:**

| Manager | Verantwortung | Quelle (WebGPU) |
| :--- | :--- | :--- |
| `GPUPipelineCache` | Render-/Compute-Pipeline-Erzeugung & -Caching, BindGroupLayout-Ableitung | `_pipelines`, `_materialBGLCache`, `_shaderModules` |
| `GPUTextureResourceCache` | Texture-View-Cache, Sampler-Cache, Cube-Textur-Refcounting, Mip-Gen-Pipeline | `_textureViewCache`, `_samplerCache`, `_cubeTextureViewCache`, `_texRefCounts` |
| `GPUFallbackResources` | Alle Dummy-/Default-Texturen & -Buffer (white/black/normal/BRDF/Schatten-Dummies) | `_whiteTexView`, `_dummyDepthTexView`, `_defaultCubeTexView`, `_dummyNormalBuffer`, `_dummyUvBuffer`, … |
| `GPUObjectRingBuffer` | Dynamic Uniform Ring Buffer + Slot-Mapping | `_objectRingBuffer`, `_objectRingBindGroup`, `_objectSlotMap` |
| `GPUGeometryCache` | Geometrie-Puffer-Cache + Instanz-Buffer | `_geoCache`, `_gpuInstanceBuffers`, `_gpuInstanceDataBuffers` |

Die bestehenden Pass-Klassen bleiben unangetastet — sie werden die Manager per Konstruktor-/Context-Parameter injiziert bekommen (gleiches Renderer-Context-Objekt, das ihnen heute schon Zugriff auf den Renderer selbst gibt), statt neue Verantwortung zu übernehmen. `WebGPURenderer.ts` schrumpft dadurch nicht auf ~500 Zeilen (das war für Pass-Extraktion kalkuliert, die schon erledigt ist), sondern realistisch auf **~1.200–1.500 Zeilen** reinen Setup-/Lifecycle-/Pass-Orchestrierungs-Code. Das ist trotzdem eine >50%ige Reduktion und ehrlicher als eine Zahl, die von nicht mehr existierender Arbeit ausgeht.

**Antwort auf Frage 1 (Bob: 5-Manager-Aufteilung praktikabel? Backend-agnostisches Teilen möglich?):**
Ja zur Manager-Aufteilung — s.o., mit der Korrektur. Zum Teilen: `ClusterCullPassGPU` (WebGPU) und `WebGLClusterCullPass` (WebGL2) sind bereits parallele, unabhängige Pass-Implementierungen mit identischer fachlicher Aufgabe (Cluster-Grid-Dimensionierung, Licht-zu-Cluster-Zuordnung). Die *reine Mathematik* (Grid-Dimensionen aus Kamera-Frustum + Cluster-Größe berechnen, Lichtradius-zu-Cluster-Overlap-Test) ist heute vermutlich in beiden Dateien dupliziert (analog zum bereits gelösten `[[project_wgsl_footprint_dedup]]`-Fall bei den Shadern). Vorschlag: `src/renderers/common/clusterGridMath.ts` als reines, backend-unabhängiges Modul (keine GPU-Handles, nur Zahlen/Vektoren rein/raus) — beide Pass-Klassen rufen es auf, behalten aber ihre eigene GPU-Buffer-/Textur-Befüllung. Kein gemeinsamer `ClusterLightManager` über beide Backends hinweg, das würde eine gemeinsame Abstraktion über GPUBuffer vs. WebGLTexture erzwingen, die mehr Indirektion kostet als sie spart.

**Antwort auf Frage 2 (Performance-Bedenken bei Manager-Indirektion?):**
Solange die Manager als einfache Klassen mit direkten Methodenaufrufen (kein Event-Bus, keine Promise-Chains) injiziert werden, ist der Overhead vernachlässigbar — V8/Chrome inlined das zuverlässig. Die einzige echte Gefahr: **Zugriff auf Renderer-internen State aus Pass-Klassen heraus muss über die bestehenden gekapselten Getter laufen** (siehe `[[project_renderer_encapsulation]]`), nicht über neue rohe public Felder auf den Managern — sonst wandert das God-Object-Problem nur eine Ebene tiefer.

### 3. Fragen an Charly / Status der Einigung

Noch kein `[CONSENSUS_PROPOSAL]` — Phase 1–3 sind noch nicht von mir bewertet, und Charlys Sicht auf Physik/Tools/Loader fehlt noch.

1. **Charly:** Deckt sich die Renderer-Erkenntnis (Pass-Extraktion bereits erledigt, verbleibende Größe = Resource-Management) mit einem ähnlichen Muster bei `PhysicsSystem.ts` (733 Z.) — ist dort schon etwas modular ausgelagert, das Alice/ich übersehen, oder ist die Kombination aus Euler/CCD/Broadphase/Narrowphase/Fluid tatsächlich noch vollständig in einer Klasse?
2. **Charly:** Zu Alices Phase-1-Vorschlag (`Color.ts` Zero-Allocation via `Object.freeze(new Color(...))`) — hast du Bedenken bezüglich Mutation-Schutz zur Laufzeit (jemand ruft `Color.WHITE.r = 0` auf)? Das würde alle Konsumenten der eingefrorenen Instanz gleichzeitig korrumpieren, da `Object.freeze` nur die Objekt-Struktur einfriert, nicht zwingend garantiert, dass niemand versucht zu schreiben (silently fails im Non-Strict-Mode, wirft im Strict Mode).
3. **Charly:** Stimmst du der überarbeiteten Phase-4-Tabelle oben zu, oder siehst du aus Performance-/Tooling-Sicht (z. B. GPU-Profiling-Hooks) Gründe, die Manager anders zu schneiden?

Ich übergebe für Runde 1 an **Charly**.

---

## Round 3: Charly (Tools, Performance & Physics Lead) — 2026-08-31

### 1. Bewertung & Antworten zu den Vorrunden (Alice & Bob)

#### Zu Bobs Frage 1 (Physik-Modularisierung & Ist-Zustand `PhysicsSystem.ts`):
Ich habe `src/physix/PhysicsSystem.ts` (733 Z.) und `Collision.ts` (569 Z.) im Detail analysiert.
* **Befund:** Im Gegensatz zum Renderer gibt es im Physik-Subsystem **noch keine Pass-/Subsystem-Klassen**.
* `PhysicsSystem.ts` macht buchstäblich alles in einer einzigen Datei:
  1. Semi-Implicit Euler Zeit-Integration (`update`/`_integrate`)
  2. Octree-Broadphase-Rebuild & Query (`_rebuildBroadphase`, `_queryCollidables`)
  3. Continuous Collision Detection (CCD Sweeps für Kugeln)
  4. Narrowphase-Kollisionserkennung & Manifold-Erzeugung
  5. Impuls- und Positionsauflösung (`_resolveDiscreteCollisions`)
  6. FluidVolume & Hydrostatischer Auftrieb (`_applyFluidForces`)
* **Lösung:** `PhysicsSystem.ts` lässt sich perfekt in 4 isolierte Module aufteilen:
  * `src/physix/solvers/EulerIntegrator.ts`: Reine Integrations-Mathe.
  * `src/physix/broadphase/PhysicsBroadphase.ts`: Kapselung des Octree-Broadphase-Caches.
  * `src/physix/ccd/SweptSphereCCD.ts`: Isolierte Continuous Collision Detection.
  * `src/physix/fluids/BuoyancySolver.ts`: Hydrostatischer Auftrieb & Dämpfung.
  * `PhysicsSystem.ts` schrumpft auf **~180 Zeilen** sauberen Orchestrierungscode.

#### Zu Bobs Frage 2 (`Color.ts` Zero-Allocation & Mutationsschutz):
* Bobs Sorge vor mutierenden Zugriffen (`Color.WHITE.r = 0`) ist absolut berechtigt!
* **Die typensichere Lösung:**
  ```typescript
  // In src/core/colors/Color.ts
  export class Color {
    // 1. Die Grundfarben als typensichere Readonly-Konstanten mit Object.freeze:
    public static readonly WHITE: Readonly<Color> = Object.freeze(new Color(1, 1, 1));
    public static readonly BLACK: Readonly<Color> = Object.freeze(new Color(0, 0, 0));
    public static readonly RED: Readonly<Color> = Object.freeze(new Color(1, 0, 0));
    // ...
    
    // 2. Explizite Clone-Methode für Fälle, in denen eine veränderliche Kopie benötigt wird:
    public clone(): Color {
      return new Color(this.r, this.g, this.b, this.a);
    }
  }
  ```
  * **Vorteil 1:** Der TS-Compiler verbietet `Color.WHITE.r = ...` sofort als Compile-Fehler (`Cannot assign to 'r' because it is a read-only property`).
  * **Vorteil 2:** Zur Laufzeit verhindert `Object.freeze` jede Mutation im Strict-Mode (wirft Exception) und fängt böswillige Mutationen ab.
  * **Vorteil 3:** Die 140+ CSS-Farben wandern nach `src/core/colors/ColorNames.ts` als Hex-Map oder Lazy-Lookup. `Color.ts` schrumpft von 848 auf ~120 Zeilen und erzeugt in Uniform-Packern **Null Heap-Allokationen**.

#### Zu Bobs Frage 3 (GPU-Manager-Aufteilung & Tooling-Sicht):
* Bobs überarbeitete 5-Manager-Tabelle (`GPUPipelineCache`, `GPUTextureResourceCache`, `GPUFallbackResources`, `GPUObjectRingBuffer`, `GPUGeometryCache`) ist exzellent geschnitten.
* **Zusatz-Feature für Tools (`GadgetInspector` / `Forge`):**
  Jeder Manager erhält eine einheitliche Methode `.getMemoryStats(): { bufferCount: number; memoryBytes: number; cacheHits: number; cacheMisses: number }`. Damit können wir im `GadgetInspector` live den VRAM-Verbrauch und Cache-Effizienz visualisieren!

---

### 2. Eigene Vorschläge: Tool-Modularisierung & DSP-Extraktion (Cluster 2)

`MaterialStudio.ts` (2.456 Z.), `Pixler.ts` (1.112 Z.) und `Xtractor.ts` (870 Z.) werden wie folgt entflechtet:

1. **Reines DSP-Paket (`src/tools/common/dsp/`):**
   * `TextureFilters.ts`: `fastBoxBlur()`, `sigmoidalContrast()`, `generateNormalMapFromHeight()`, `generateRoughnessMap()`.
   * `CanvasOperations.ts`: `bresenhamLine()`, `floodFill()`, `trimCanvas()`, `flipCanvas()`.
   * *Regel:* Reines TypeScript/Canvas 2D ohne UI- oder DOM-Abhängigkeiten. 100% per Vitest unit-testbar!
2. **Template-Extraktion:**
   * HTML & CSS wandern in dedizierte Template-Dateien oder Template-Strings in `src/tools/<ToolName>/ui/`.
3. **Beseitigung von `window.*`:**
   * `window.update3DTextures` und `window.update3DGeometry` werden durch eine typisierte Event-Bridge (`ToolBridge<T>`) auf `ForgeTool` ersetzt.

---

## 3. [CONSENSUS_PROPOSAL: v1.0]

Auf Basis der vollständigen Analyse aller drei Rollen (Alice, Bob, Charly) schlage ich folgenden verbindlichen Konsensplan vor:

### Phase 1: Sofort-Maßnahmen (Performance & Singletons)
1. **`Color.ts` Zero-Allocation:**
   * Grundfarben als `Readonly<Color> = Object.freeze(new Color(...))`.
   * CSS-Namensfarben auslagern nach `src/core/colors/ColorNames.ts`.
   * Implementierung von `color.clone()`.
2. **Singletons Schritt 1 (Vorbereitung):**
   * `ShaderRegistry` instanziierbar machen, Default-Fallback für Abwärtskompatibilität.
   * `AssetManager` Caches an Lifecycle-Instanz binden.
   * `DeviceCaps` Probes vom Modul-Import entkoppeln.

### Phase 2: Tool- & DSP-Modularisierung
1. **`src/tools/common/dsp/` aufbauen:**
   * `TextureFilters.ts` & `CanvasOperations.ts` extrahieren.
2. **Tools refaktorisieren:**
   * `MaterialStudio.ts` entflechten (DSP auslagern, UI-Templates trennen, `window`-Globals entfernen).
   * `Pixler.ts` & `Xtractor.ts` auf die neuen DSP-Module umstellen.

### Phase 3: Physik & Core-Entities
1. **`PhysicsSystem.ts` modularisieren:**
   * `EulerIntegrator.ts`, `PhysicsBroadphase.ts`, `SweptSphereCCD.ts`, `BuoyancySolver.ts`.
2. **`Object3D.ts` verschlanken:**
   * Picking-Handler (`onPointerDown` etc.) in ein dediziertes `PickingBehavior` auslagern oder über das Event-System kapseln.
   * HZB-spezifisches `occlusionCulled` über Renderer-WeakMaps statt Core-Entity-Felder verwalten.

### Phase 4: GPU-Resource-Manager (WebGPU & WebGL2)
1. **Gemeinsame Mathe:**
   * `src/renderers/common/clusterGridMath.ts` für backend-agnostische Cluster-Berechnung.
2. **WebGPU Resource-Manager:**
   * `GPUPipelineCache`, `GPUTextureResourceCache`, `GPUFallbackResources`, `GPUObjectRingBuffer`, `GPUGeometryCache`.
3. **WebGL2 Resource-Manager:**
   * `WebGLProgramCache`, `WebGLTextureManager`, `WebGLBufferManager`.

---

[CONSENSUS_AGREED: Charly]

Ich übergebe zur Bestätigung/Verfeinerung an **Alice**.

---

## Round 4: Alice (Engine Architect & Core Lead) — 2026-08-31

### 1. Bewertung & Antworten zu Vorrunden

Danke Bob und Charly für die fundierte Arbeit — beide Analysen sind sauber am echten Code verifiziert, das schätze ich. Bevor ich `[CONSENSUS_PROPOSAL: v1.0]` unterschreibe, habe ich als Architektin noch einmal die ursprüngliche Diagnose in Abschnitt 2 gegen den Code geprüft, speziell zu `DeviceCaps`, da das direkt meine Kernverantwortung (No-Global-Singletons) betrifft.

**Korrektur der ursprünglichen Diagnose:** Die Behauptung „`DeviceCaps` erzeugt Dummy-Canvas/Contexts **beim Modulimport**" (Abschnitt 2, Cluster 3) ist so nicht korrekt. `DeviceCaps.init()` wird **lazy** und **idempotent** (`if (this._isInitialized) return;`) explizit aus `RendererFactory.ts:36` und `SmallWorld.ts:245` aufgerufen — es gibt keinen Top-Level-Seiteneffekt im Modul selbst, auch alle Getter re-initialisieren nur bei Bedarf (`if (!this._isInitialized) this.init();`). Das ändert die Diagnose, nicht aber die Priorität: **Das eigentliche Problem ist nicht der Init-Zeitpunkt, sondern dass der State global-statisch ist.** Zwei `SmallWorld`-Instanzen in einem Tab (z. B. zwei Canvases mit unterschiedlichen GPUs/Kontexten) teilen sich heute zwangsläufig ein einziges `DeviceCaps`-Ergebnis — das ist die tatsächliche Verletzung von Core Law #1, nicht der Ladezeitpunkt.

Diese Präzisierung ist wichtig, weil eine Lösung, die nur den Init-*Zeitpunkt* verschiebt (was der aktuelle Code bereits tut), das Kernproblem gar nicht anfasst.

### 2. Eigene Vorschläge & Architekturentscheidungen — Konkretisierung Phase 1 & 3

Charlys `[CONSENSUS_PROPOSAL: v1.0]` ist inhaltlich exzellent, aber an zwei Stellen für einen "Actionable Implementation Plan" (Kriterium 3 der Konsens-Definition) noch zu vage. Ich schlage folgende Konkretisierungen vor und fasse sie unten in **v1.1** zusammen:

**A. Singleton-Migration (Phase 1) — konkreter Fahrplan statt "Vorbereitung":**
Eine bloße "Instanz-basierte Schnittstelle vorbereiten, Default-Fallback behalten" kann leicht dazu führen, dass der Default-Fallback nie verschwindet und Core Law #1 nur kosmetisch erfüllt wird. Konkret:
1. **`DeviceCaps`:** Wird zur instanziierbaren Klasse. `SmallWorld` erzeugt bei Konstruktion eine eigene Instanz (`engine.deviceCaps`), `RendererFactory`/Renderer erhalten sie injiziert statt selbst `DeviceCaps.init()` aufzurufen. Die bisherigen statischen Methoden bleiben als `@deprecated`-Wrapper um eine lazily erzeugte Default-Instanz bestehen (reiner Source-Compat-Shim, kein Architektur-Ersatz) — mit TODO-Kommentar und Zielversion für die Entfernung.
2. **`ShaderRegistry`:** Analog — `ShaderRegistry.instance` (aktuell `private static _instance`, echtes Singleton, `src/core/renderers/shaders/ShaderRegistry.ts:11-27`) wird zum `@deprecated`-Compat-Shim; produktiver Zugriff läuft über eine Instanz auf dem Renderer-Context.
3. **`AssetManager`:** Caches wandern auf eine Instanz, an den `SmallWorld`-Lifecycle gebunden (Cache wird bei `engine.dispose()` freigegeben — heute unmöglich, da rein statisch und nie freigebbar über Instanz-Grenzen hinweg).

**B. `Object3D`-Verschlankung (Phase 3) — Backward-Compat-Garantie:**
Charlys/Alices Vorschlag, Picking-Handler in eine `PickingBehavior` auszulagern, muss die öffentliche API von `Object3D` (`onPointerDown`, `onPointerUp`, `onPointerMove`, `rigidBody`, `occlusionCulled` — verifiziert in `Object3D.ts:36,74,82-87`) unverändert lassen, siehe `[[project_public_api_surface]]`. Konkret: Die öffentlichen Felder bleiben als Getter/Setter erhalten, die intern an eine (lazy erzeugte) `PickingBehavior`-Instanz delegieren. Kein Consumer-Code darf sich ändern müssen.

**[TEAM_QUESTION: Phasenreihenfolge Singleton-Refactor vor GPU-Resource-Managern?]**
An die ganze Runde: Phase 4 (Bobs GPU-Resource-Manager) und die Singleton-Migration aus Phase 1 hängen zusammen — beide führen einen Renderer-/Engine-Context ein, über den Abhängigkeiten injiziert werden. Wenn wir Phase 4 umsetzen, *bevor* Phase 1 den `DeviceCaps`/`ShaderRegistry`-Instanz-Context etabliert hat, bauen wir den Context zweimal (einmal für Resource-Manager, einmal später für Singletons) statt einmal sauber. **Sollten wir Phase 1 (Singleton-Instanzen + Context-Objekt-Design) und Phase 4 (GPU-Resource-Manager) tauschen bzw. mindestens den Context-Objekt-Entwurf aus Phase 1 vorziehen, damit Bobs Manager direkt darauf aufbauen?** Bitte explizit Stellung beziehen (Bob und Charly), das ist keine rhetorische Frage.

### 3. [CONSENSUS_PROPOSAL: v1.1] (ersetzt v1.0)

Übernimmt Charlys v1.0 vollständig, ergänzt um die Konkretisierungen A/B oben:

- **Phase 1** (Color.ts wie in v1.0 **plus** A.1–A.3 oben: konkrete `@deprecated`-Shim-Strategie mit Zielversion statt offener "Vorbereitung").
- **Phase 2** (Tool-/DSP-Modularisierung — unverändert zu v1.0).
- **Phase 3** (Physik-Split wie v1.0 **plus** B: `Object3D`-Backward-Compat-Garantie über Getter/Setter-Delegation).
- **Phase 4** (GPU-Resource-Manager wie v1.0 — **Reihenfolge zu Phase 1 siehe offene [TEAM_QUESTION] oben**, noch nicht final).

**Status der Einigung:** Noch kein Konsens — `v1.0`-Signatur von Charly gilt nicht automatisch für `v1.1` (Inhalt geändert), daher muss Charly `v1.1` separat bestätigen. Zusätzlich offen: Bobs Signatur zu `v1.1` und die Antwort von Bob **und** Charly auf die `[TEAM_QUESTION]` zur Phasenreihenfolge.

[AGREED: Alice] (zu v1.1, wie oben spezifiziert)

👉 **Kommando für den nächsten Agenten (Bob):**
```bash
/collaborate --invite Bob god-objects-refactoring.md
```

---

## Round 5: Bob (Rendering & Shading Specialist) — 2026-08-31

### 1. Bewertung & Antworten zu Vorrunden (inkl. offener Team-Fragen)

Alices `DeviceCaps`-Korrektur (lazy statt import-zeitig) deckt sich mit meiner eigenen Code-Prüfung aus Runde 1 — sie ändert nichts an meiner Phase-4-Tabelle, ergänzt aber die Diagnose sauber. Zu ihrem Punkt A (Singleton-Shims mit Zielversion) und B (`Object3D`-Backward-Compat): keine Einwände, beides betrifft nicht meinen Bereich, beides ist solide.

**Antwort auf `[TEAM_QUESTION: Phasenreihenfolge Singleton-Refactor vor GPU-Resource-Managern?]`:** Alices Vermutung ist nicht nur richtig, sondern ich kann sie mit konkreten Fundstellen belegen — das ist keine hypothetische Kopplung, sondern bereits heute akuter Code:

- `WebGPURenderer.ts` ruft `ShaderRegistry.instance.get(shaderId)` / `.assemble()` / `.getChunk()` direkt an **sechs** Stellen auf (Zeilen 970, 972, 1114, 1116, 1586, 1824, 1831, 2686) — exakt in der Pipeline-Erzeugungslogik, die laut meiner Runde-1-Tabelle in `GPUPipelineCache` wandern soll.
- `WebGPURenderer.ts:658` ruft `DeviceCaps.updateLimits(...)` auf, `WebGPURenderer.ts:1651/1655` liest `DeviceCaps.getLimit(...)` für Textur-Budget-Entscheidungen — das landet in `GPUTextureResourceCache`.
- `WebGL2Renderer.ts` zeigt exakt dasselbe Muster (`ShaderRegistry.instance.get/assemble` in der Programm-Kompilierung, `DeviceCaps.getLimit(WEBGL2_MAX_TEXTURE_IMAGE_UNITS)` an drei Stellen für Textur-Unit-Bindung).

**Konsequenz:** Würde ich Phase 4 heute umsetzen, würde ich diese `ShaderRegistry.instance`/`DeviceCaps.getLimit`-Aufrufe unverändert 1:1 in die neuen Manager-Klassen kopieren — die Manager wären dann von Tag eins an an genau die statischen Singletons gekoppelt, die Phase 1 eigentlich beseitigen soll. Danach müsste Phase 1 dieselben, gerade erst neu geschriebenen Dateien noch einmal anfassen, um die injizierte Instanz einzubauen. Doppelte Arbeit, unnötiges Risiko.

**Konkreter Vorschlag statt starrer Reihenfolge "Phase 1 vor Phase 4":** Wir brauchen nicht die *gesamte* Phase 1 zuerst (Color.ts & Co. können unabhängig laufen), sondern nur das gemeinsame Fundament — ein schlankes `RendererContext`-Interface (`{ deviceCaps: DeviceCaps; shaderRegistry: ShaderRegistry; assetManager: AssetManager }`), das als **neue Phase 0** vor Phase 1 und Phase 4 eingeschoben wird. Phase 1 füllt es mit den Instanz-Implementierungen (inkl. `@deprecated`-Shims), Phase 4 konsumiert es direkt beim Bau der Resource-Manager, statt gegen `ShaderRegistry.instance`/`DeviceCaps.<static>` zu programmieren. Beide Phasen können danach **parallel** laufen, statt seriell aufeinanderzuwarten.

### 2. Eigene Vorschläge & Architekturentscheidungen

**[CONSENSUS_PROPOSAL: v1.2]** (ersetzt v1.1, ergänzt nur die Phasennummerierung/-reihenfolge, Inhalt von v1.1 A/B unverändert übernommen):

- **Phase 0 (neu): Context-Objekt-Fundament**
  - `RendererContext`-Interface definieren (`deviceCaps`, `shaderRegistry`, `assetManager`), als Property auf `SmallWorld`/Renderer-Basisklasse verankert.
  - Keine Verhaltensänderung, nur das Interface + Wiring — kleine, risikoarme Vorstufe.
- **Phase 1** (wie v1.1: Color.ts + Singleton-Instanzen A.1–A.3), implementiert **gegen** das `RendererContext`-Interface aus Phase 0.
- **Phase 2** (Tool-/DSP-Modularisierung, unverändert).
- **Phase 3** (Physik-Split + `Object3D`-Backward-Compat B, unverändert).
- **Phase 4** (GPU-Resource-Manager), Konstruktor-Injection **über `RendererContext`** statt `ShaderRegistry.instance`/`DeviceCaps.<static>` direkt zu referenzieren — kann nach Phase 0 parallel zu Phase 1 starten.

### 3. Fragen an das Team / Status der Einigung

- **Gezielte Frage an Charly:** Deine `[CONSENSUS_AGREED: Charly]` galt v1.0. Bitte in deinem nächsten Zug explizit zu **v1.2** Stellung beziehen (inkl. der neuen Phase 0) — nicht automatisch übernehmen.
- **Status:** Kein Konsens erreicht. Offene Punkte: Charlys Signatur zu v1.2 aussteht, TEAM_QUESTION hiermit durch Bob beantwortet (Alice + Bob haben Stellung bezogen, Charlys explizite Stellungnahme zur Reihenfolge steht noch aus, auch wenn Charlys ursprüngliche Physik-Analyse davon unberührt bleibt).

[AGREED: Bob] (zu v1.2, wie oben spezifiziert)

👉 **Kommando für den nächsten Agenten (Charly):**
```bash
/collaborate --invite Charly god-objects-refactoring.md
```

---

## Round 6: Charly (Tools, Performance & Physics Lead) — 2026-08-31

### 1. Bewertung & Antworten zu Vorrunden (inkl. offener Team-Fragen)

Habe Bobs neue Phase 0 (`RendererContext`-Interface) und Alices Konkretisierungen A/B gegengeprüft — speziell, ob sie meine eigenen Baustellen (Physik-Split, Tool-/DSP-Extraktion, `Color.ts`) berühren. Kurzer Code-Check:

```
grep -n "AssetManager|DeviceCaps|ShaderRegistry" MaterialStudio.ts Pixler.ts Xtractor.ts PhysicsSystem.ts
→ keine Treffer
```

**Ergebnis:** Weder `PhysicsSystem.ts` noch die drei Forge-Tools referenzieren `DeviceCaps`, `ShaderRegistry` oder `AssetManager` irgendwo. Bobs Phase-0/Phase-4-Kopplung ist also ein reines Renderer-Problem — meine Phase-2- (Tools) und Phase-3-Physik-Arbeit hat **keine Abhängigkeit** zu `RendererContext` und kann komplett unabhängig und parallel zu Phase 0/1/4 laufen. Das bestätigt Bobs Parallelisierungs-Idee zusätzlich, statt sie zu verkomplizieren — es gibt keinen Grund, meine Phasen ebenfalls in die Reihenfolge-Diskussion hineinzuziehen.

Zu Alices B (`Object3D`-Backward-Compat via Getter/Setter-Delegation an `PickingBehavior`): keine Einwände, sauber spezifiziert.

### 2. Eigene Vorschläge & Architekturentscheidungen

Keine neuen inhaltlichen Ergänzungen — die Physik-/Tool-/Color-Teile aus meinem `v1.0`-Beitrag (Runde 3) sind unverändert in `v1.2` übernommen. Ich sehe den Plan als vollständig und umsetzungsreif an.

### 3. Fragen an das Team / Status der Einigung

- **Status:** Aus meiner Sicht ist `v1.2` konsensfähig. Ich unterschreibe hiermit explizit `v1.2` (nicht nur implizit über die unveränderte Übernahme meines `v1.0`-Anteils).
- Formal bleibt laut Konsens-Kriterium 1 (Abschnitt 6) noch offen: **Alice hat bislang nur `v1.1` explizit signiert, nicht das neue `v1.2`** (Bobs Phase-0-Ergänzung kam nach ihrer Signatur). Da Bobs Ergänzung Alices eigene Vorschläge (A/B) inhaltlich unverändert lässt und nur die Phasen-Reihenfolge/-Nummerierung betrifft, gehe ich von einer reinen Formalität aus — bitte trotzdem explizit im Dokument bestätigen, damit Kriterium 1 sauber erfüllt ist.

[AGREED: Charly] (zu v1.2, wie oben spezifiziert)

👉 **Kommando für den nächsten Agenten (Alice):**
```bash
/collaborate --invite Alice god-objects-refactoring.md
```

---

## Round 7: Alice (Engine Architect & Core Lead) — 2026-08-31

### 1. Bewertung & Antworten zu Vorrunden (inkl. offener Team-Fragen)

Charly hat zu Recht angemerkt, dass meine Signatur formal nur `v1.1` galt. Habe Bobs Phase-0-Ergänzung (`RendererContext`-Interface, Fundstellen-belegte Kopplung von `ShaderRegistry.instance`/`DeviceCaps.getLimit` an die geplanten Phase-4-Manager) und Charlys Unabhängigkeits-Check (Physik/Tools berühren `RendererContext` nicht) noch einmal geprüft: Beides ist technisch sauber und ändert nichts an meinen eigenen Vorschlägen A/B aus Runde 4 — Bobs Phase 0 ist eine reine, risikoarme Vorstufe, keine neue architektonische Richtung. Keine Einwände.

Ich habe das gesamte Dokument zusätzlich auf offene `[OBJECTION]`/`[VETO]`-Marker und unbeantwortete gezielte Fragen durchsucht — keine gefunden. Die `[TEAM_QUESTION]` zur Phasenreihenfolge ist durch Bob (Runde 5) beantwortet und durch Charly (Runde 6) bestätigt.

### 2. Eigene Vorschläge & Architekturentscheidungen

Keine weiteren Ergänzungen — `v1.2` ist inhaltlich vollständig und trägt jetzt konkrete Zieldateien/-klassen je Phase (Kriterium 3 aus Abschnitt 6 ist erfüllt).

### 3. Fragen an das Team / Status der Einigung

**Status: Konsens erreicht.** Prüfung der drei Kriterien aus Abschnitt 6:
1. **Unanimous Signature:** `[AGREED: Bob]` (Runde 5), `[AGREED: Charly]` (Runde 6), hiermit `[AGREED: Alice]` (diese Runde) — alle drei Rollen haben explizit **v1.2** signiert.
2. **Zero Lingering Vetoes:** Keine offenen `[OBJECTION]`/`[VETO]`-Marker im Dokument. Die einzige `[TEAM_QUESTION]` ist beantwortet.
3. **Actionable Implementation Plan:** `v1.2` benennt für jede Phase konkrete Zieldateien/-klassen (`RendererContext`, `ColorNames.ts`, `EulerIntegrator.ts`, `GPUPipelineCache` etc.) und eine begründete Reihenfolge/Parallelisierbarkeit.

**Alle drei Kriterien sind erfüllt — hiermit formal:**

[AGREED: Alice] (zu v1.2, final)

---

## ✅ [CONSENSUS_REACHED: v1.2] — 2026-08-31

Der verbindliche, von allen drei Rollen (Alice, Bob, Charly) unterschriebene Refactoring-Plan:

- **Phase 0 — Context-Objekt-Fundament:** `RendererContext`-Interface (`deviceCaps`, `shaderRegistry`, `assetManager`) auf `SmallWorld`/Renderer-Basisklasse.
- **Phase 1 — Sofort-Maßnahmen:** `Color.ts` Zero-Allocation (`Readonly<Color>` + `ColorNames.ts` + `clone()`); `DeviceCaps`/`ShaderRegistry`/`AssetManager` zu Instanzen über `RendererContext`, alte statische APIs als `@deprecated`-Shims mit Zielversion.
- **Phase 2 — Tool-/DSP-Modularisierung:** `src/tools/common/dsp/` (`TextureFilters.ts`, `CanvasOperations.ts`); `MaterialStudio.ts`/`Pixler.ts`/`Xtractor.ts` darauf umgestellt; `window.*`-Globals durch `ToolBridge<T>` ersetzt.
- **Phase 3 — Physik & Core-Entities:** `PhysicsSystem.ts` → `EulerIntegrator.ts`, `PhysicsBroadphase.ts`, `SweptSphereCCD.ts`, `BuoyancySolver.ts`; `Object3D`-Picking-API bleibt öffentlich unverändert, delegiert intern an `PickingBehavior`.
- **Phase 4 — GPU-Resource-Manager:** `clusterGridMath.ts` (backend-agnostisch); WebGPU: `GPUPipelineCache`, `GPUTextureResourceCache`, `GPUFallbackResources`, `GPUObjectRingBuffer`, `GPUGeometryCache`; WebGL2: `WebGLProgramCache`, `WebGLTextureManager`, `WebGLBufferManager` — alle über `RendererContext` injiziert, nicht gegen statische Singletons programmiert.

**Umsetzungsreihenfolge:** Phase 0 zuerst (klein, risikoarm) → danach Phase 1 und Phase 4 parallel (beide bauen auf `RendererContext` auf) → Phase 2 und Phase 3 unabhängig davon jederzeit parallel möglich (keine Abhängigkeit zu `RendererContext` nachgewiesen).

**Verbindlich für alle Core Architectural Laws (Abschnitt 1) geprüft**, insbesondere No-Global-Singletons (Phase 0/1) und Backward-Compatibility (`Object3D`-API in Phase 3, `@deprecated`-Shims in Phase 1).


