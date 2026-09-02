# Review: Rendering Backends & Post-Processing (`src/renderers/**` — WebGL1, WebGL2, WebGPU, passes, post; `src/core/renderers/shaders`)

**Reviewer:** Agent C · **Status:** ⚠️ mit kritischen Funden fertig

Legende: 🔴 kritisch (Bug/Korrektheit) · 🟠 fragil/Architektur-Risiko · 🟡 Stil/Cleanup/tote Fläche · 🟢 Test-Lücke · ✅ positiv

---

## `src/core/renderers/shaders/` — gemeinsame Shader-Infrastruktur

### 🟠 `UniformPacker`: MAT4-Alignment ist spec-widrig (64 statt 16 Byte), aktuell nur zufällig folgenlos

**Datei:** `src/core/renderers/shaders/UniformPacker.ts:121-138` (`_getTypeAlignment`)

```ts
case ShaderPropertyType.MAT4:
  return 16; // 64 bytes
```

Laut WGSL-Spec (`matCxR` → `align = AlignOf(vecR)`) und std140 ist die Basis-Ausrichtung einer `mat4x4f` **16 Byte** (= 4 Floats, genau wie `vec4f`), nicht 64 Byte. `_getTypeSize` gibt korrekt 16 Floats (64 Byte) für die *Größe* zurück — aber `_getTypeAlignment` verwechselt Größe und Ausrichtung und rundet jedes MAT4-Feld auf die nächste 64-Byte-Grenze auf statt auf 16 Byte.

**Warum das ein Problem ist:** Aktuell manifestiert sich das nirgends, weil in jedem einzigen registrierten `uniformLayout` im Repo (`StandardWebGPULayout`, `ShadertoyImporter`, `GLSLSandboxImporter`, `ComputeToysImporter`) das MAT4-Feld (`u_model`) zufällig immer das *erste* Feld ist (Offset 0 ist ohnehin für jede Ausrichtung kongruent). Sobald aber irgendwo ein `MAT4` NICHT als erstes Feld in einem Layout auftaucht (z.B. ein zukünftiges Per-Instance- oder Per-Bone-Uniform-Struct mit ein paar Skalaren vor einer Matrix), rechnet `packInto()` einen Offset aus, der 48 Byte zu weit hinten liegt gegenüber dem, was ein spec-treuer WGSL-Compiler (oder eine von Hand geschriebene `structs.wgsl`) tatsächlich erwartet — stiller Daten-Versatz zwischen CPU-Pack und GPU-Struct, kein Fehler, nur falsches Rendering.

**Verifiziert:** Wegwerf-Vitest-Test (`tests/_scratch_uniformpacker_mat4_align.test.ts`, danach gelöscht) mit Layout `["u_flag" (FLOAT), "u_mat" (MAT4)]`: `packInto()` platziert die Matrix bei Float-Offset **16**; spec-korrekt wäre Offset **4**. Test bestätigt den Bug reproduzierbar, dann entfernt.

**Fix-Richtung:** `_getTypeAlignment(MAT4)` auf `4` (16 Byte) korrigieren — das ist eine reine 1-Zeilen-Änderung, unabhängig von `_getTypeSize` (bleibt bei 16). Da aktuell kein Layout davon betroffen ist, ist der Fix ungefährlich nachrüstbar; ein Regressionstest wie der oben verwendete lohnt sich, um die Kombination "Skalar vor MAT4" dauerhaft abzudecken.

---

### 🟠 `ShaderRegistry`: Per-Instance-Registry fällt bei fehlendem Eintrag still auf den globalen Singleton zurück

**Datei:** `src/core/renderers/shaders/ShaderRegistry.ts:71-89` (`get()`) und `:110-117` (`getChunk()`)

```ts
if (!def && this !== ShaderRegistry._instance && ShaderRegistry._instance) {
  def = ShaderRegistry._instance.get(id);
}
```

`ShaderRegistry.instance` ist selbst schon korrekt mit `@deprecated ... Removal target: v1.0.0` markiert, und der Migrationspfad zu `RendererContext.shaderRegistry` (Per-`SmallWorld`-Instanz, siehe `src/interfaces/RendererContext.ts`) existiert bereits — das ist der richtige Weg gemäß AGENTS.md "No Global Singletons". Das Problem ist der stille Fallback: Jede *neue*, eigentlich isolierte Per-Instance-Registry (z.B. via `RendererContext`) fällt bei einem Cache-Miss transparent auf den weiterhin existierenden globalen Singleton zurück — nicht nur für die von `CoreShaderChunks` eh überall gleich geladenen Standard-Chunks, sondern für **jeden** Chunk/Shader, den irgendein Aufrufer per Alt-API direkt auf `ShaderRegistry.instance` registriert.

**Failure-Szenario:** Zwei `SmallWorld`-Instanzen auf derselben Seite (z.B. Showcase + eingebettetes `MaterialStudioApp`-Preview, wie in ADR 0008 für `FrustumCuller` bereits als reales Muster dokumentiert). Registriert Instanz A versehentlich (oder über einen noch nicht migrierten Alt-Codepfad) einen Custom-Chunk direkt auf `ShaderRegistry.instance`, bekommt Instanz B ihn automatisch mit, sobald B denselben Chunk-Namen selbst nicht lokal registriert hat — ganz ohne Fehler oder Warnung. Das widerspricht der Multi-Instanz-Garantie, die die Per-Instance-Registry eigentlich herstellen soll.

**Verifiziert:** Wegwerf-Vitest-Test (danach gelöscht): `ShaderRegistry.instance.registerChunk("LEAKY_CHUNK", "GLOBAL_VERSION", "glsl300")`, dann `new ShaderRegistry().getChunk("LEAKY_CHUNK", "glsl300")` → liefert `"GLOBAL_VERSION"` zurück, obwohl die neue Instanz nie etwas registriert hat. Bestätigt den Leak reproduzierbar.

**Fix-Richtung:** Den Fallback nur für den Übergangszeitraum explizit dokumentieren (aktuell nur implizit durch den `@deprecated`-Tag auf `.instance`, nicht auf dem Fallback-Verhalten selbst) oder — sauberer — den Fallback ganz entfernen, sobald genug Call-Sites auf `RendererContext.shaderRegistry` migriert sind; bis dahin zumindest ein `console.warn` beim Fallback-Treffer, damit Leaks sichtbar werden statt sich lautlos durchzuschleichen.

---

### ✅ Positiv: `StandardWebGPULayout` ↔ `structs.wgsl` `ObjectUniforms` ist Feld-für-Feld und Byte-für-Byte konsistent

Manuell Feld für Feld nachgerechnet (`StandardWebGPULayout.ts:8-51` gegen `structs.wgsl:34-55`): Reihenfolge und Typen stimmen exakt überein, und die aus `UniformPacker`s (korrekten) VEC2/VEC3/VEC4/FLOAT-Ausrichtungsregeln berechneten Byte-Offsets treffen exakt die Offsets, die ein spec-konformer WGSL-Compiler für `ObjectUniforms` erzeugen würde (0, 64, 80, 96, 104, 112, ... bis 208 Byte Gesamtgröße). Trotz der oben gefundenen MAT4-Alignment-Lücke in `UniformPacker` ist dieses konkrete, produktiv genutzte Layout also korrekt — weil `u_model` zufällig an Position 0 steht. Keine der drei Backends (WebGL1/2/WebGPU) driftet hier auseinander; die GPU-Introspection-getriebene Konsolidierung, die an anderer Stelle im Projekt bereits stattgefunden hat, zahlt sich hier sichtbar aus.

---

## `src/renderers/WebGL2/WebGL2Renderer.ts` — `GlobalUniforms`-UBO

### ✅ [ERLEDIGT] `updateGlobalUBO()`/`writeClusterGridUniforms()`: falscher `AreaLight`-Array-Stride verschiebt Cluster-Grid-Uniforms komplett aus dem tatsächlichen std140-Layout — WebGL2 Clustered Lighting liest immer Null
*(Behoben 2026-09-03: `GlobalUniforms` UBO-Größe auf 2112 Bytes korrigiert; `AreaLight` Loop-Stride auf std140-konforme 96 Bytes angepasst; `writeClusterGridUniforms` schreibt `u_tileSizePx` an Offset 2080 und `u_clusterDims` an Offset 2096; Unit-Tests in `tests/renderers/ClusteredLightingAlignment.test.ts`.)*

**Dateien:**
- `src/renderers/WebGL2/WebGL2Renderer.ts:1522-1541` (`updateGlobalUBO()`, AreaLight-Packing-Loop)
- `src/renderers/WebGL2/WebGL2Renderer.ts:294-299` (`writeClusterGridUniforms()`)
- `src/renderers/WebGL2/WebGL2Renderer.ts:220` (Buffer-Allokation, `2176` Byte)
- `src/core/renderers/shaders/source/web_gl2/chunks/lights.frag.glsl:20-64` (`GlobalUniforms`-Blockdeklaration)

Die GLSL-Seite deklariert:

```glsl
struct AreaLight {
    vec3 pos;    float _pad;
    vec3 color;  float _pad2;
    vec3 right;  float _pad3;
    vec3 up;     float _pad4;
    vec3 normal; float _pad5;
    vec2 size;   vec2 _pad6;
};
...
AreaLight u_areaLights[4];
vec2 u_tileSizePx;
vec4 u_clusterDims;
```

Nach std140 (jede `vec3`+direkt folgendem Skalar packt in denselben 16-Byte-Slot, exakt die Regel aus dem `coding-guide`-Skill) ist `AreaLight` **96 Byte** groß (5×16 für die `vec3`+Pad-Paare + 16 für `vec2 size`+`vec2 _pad6`), und das Array `u_areaLights[4]` beginnt bei Offset 1696 und endet bei **2080**. Direkt danach müsste `u_tileSizePx` bei **2080** und `u_clusterDims` bei **2096** liegen.

Der CPU-seitige Packer verwendet aber Stride **112** statt 96:

```ts
// WebGL2Renderer.ts:1522-1523
for (let i = 0; i < 4; i++) {
  const offset = 1696 + i * 112;   // <- sollte 1696 + i * 96 sein
  ...
}
```

und schreibt die Cluster-Grid-Metadaten entsprechend 64 Byte zu weit hinten:

```ts
// WebGL2Renderer.ts:295-299
this._globalUBO.setVec2(2144, tileSizePx[0], tileSizePx[1]);   // GLSL erwartet: 2080
this._globalUBO.setFloat(2160, this._clusterDims.x);            // GLSL erwartet: 2096
this._globalUBO.setFloat(2164, this._clusterDims.y);
this._globalUBO.setFloat(2168, this._clusterDims.z);
this._globalUBO.setFloat(2172, this._clusterMaxLightsPerCluster);
```

**Warum das ein Problem ist:** Die Bytes 2080-2111 (wo der kompilierte Shader `u_tileSizePx`/`u_clusterDims` tatsächlich liest) werden vom CPU-Packer **nie beschrieben** — sie bleiben auf dem Initialwert der zugrunde liegenden `ArrayBuffer`-Allokation (0) stehen, weil `WebGL2UniformBuffer`'s `_data` immer komplett hochgeladen wird (`update()` lädt den ganzen Puffer), aber nie jemand an Offset 2080/2096 schreibt. Der Fragment-Shader liest also für `u_clusterDims` durchgehend `(0,0,0,0)` und für `u_tileSizePx` `(0,0)` — unabhängig davon, welche echten Grid-Dimensionen `WebGLClusterCullPass` berechnet. In `computeClusterCellIndex()` (`lights.frag.glsl:95-104`) heißt das: `dims = ivec3(0,0,0)`, `cellX = min(gl_FragCoord.x / 0.0, -1)` → Division durch Null/undefiniertes Verhalten, `dims.z` als Log-Divisor ebenfalls 0. Das betrifft **jeden** Frame auf WebGL2, unabhängig davon, ob überhaupt `AreaLight`s in der Szene existieren (das Array ist im UBO immer in voller Größe reserviert) — es ist rein eine Frage der festen Blockgröße, nicht der tatsächlichen Lichtanzahl. Zusätzlich sind `AreaLight`-Instanzen mit Index 1-3 (bei aktiver Nutzung von mehr als einem `AreaLight`) an der falschen Stelle im Puffer, sodass sie mit falschen (verschobenen) Daten aus dem Nachbar-Slot gerendert würden.

Kurz: Clustered Forward+ Lighting (ADR 0007) ist auf dem WebGL2-Pfad durch diesen einen Stride-Fehler strukturell nie funktionsfähig — die Werte, die die Lichtzuordnung pro Fragment steuern, kommen nie an.

**Verifiziert:** Reines std140-Alignment ist spec-definiert und unabhängig von Laufzeitverhalten nachrechenbar; per Wegwerf-Node-Skript (`.agents/scratches/std140_check.mjs`, nach Verifikation gelöscht) die komplette `GlobalUniforms`-Struktur Feld für Feld nach std140-Regeln durchgerechnet:
```
u_pointLights[16]  computed=160   TS=160   ✅ match
u_spotLights[16]   computed=672   TS=672   ✅ match
u_areaLights[4]    computed=1696  TS=1696  ✅ match (Start)
u_tileSizePx       computed=2080  TS=2144  ❌ 64 Byte Differenz
u_clusterDims      computed=2096  TS=2160  ❌ 64 Byte Differenz
Gesamtgröße        computed=2112  TS=2176  ❌ 64 Byte zu groß alloziert
```
Point- und Spot-Light-Layout sind korrekt (Stride 32 bzw. 64 stimmt); nur der `AreaLight`-Stride (96 statt tatsächlich verwendeter 112) und alles danach ist betroffen. Der einzige existierende Test zu diesem Uniform-Block (`tests/renderers/WebGL2ClusterBindings.test.ts`) prüft nur GLSL-Quelltext-Inhalte (String-`toContain`), nie tatsächliche Byte-Offsets — der Bug ist für dieses Test-Setup unsichtbar.

**Fix-Richtung:** Stride in der AreaLight-Packing-Schleife von `112` auf `96` korrigieren und `writeClusterGridUniforms()` auf `2080`/`2096`/... verschieben (bzw. beide Werte aus einer einzigen, geteilten Konstante ableiten statt doppelt von Hand zu pflegen — genau das Muster, das im Projekt an anderer Stelle schon zu ähnlichen Bugs geführt hat, siehe `[[project_frustumculler_static_pollution]]`/Root-Cause-Notiz zu Hand-gepflegten Uniform-Listen). Ein Regressionstest, der die tatsächlichen `WebGLActiveInfo`/`UNIFORM_OFFSET`-Werte eines echten (ggf. headless) WebGL2-Kontexts gegen die hartkodierten TS-Offsets vergleicht, würde diese Klasse von Bug systematisch abfangen — die reine String-Prüfung in `WebGL2ClusterBindings.test.ts` reicht dafür nicht aus.

---

## `src/core/renderers/shaders/source/web_gpu/compute/cluster_cull.wgsl` — Clustered Lighting (WebGPU)

### ✅ [ERLEDIGT] `lightCellRangeY()` benutzt die falsche NDC→Pixel-Y-Konvention — Punkt-/Spot-Lichter landen in vertikal gespiegelten Cluster-Zeilen
*(Behoben 2026-09-03: `lightCellRangeY` in `cluster_cull.wgsl` mappt NDC Y-up auf WebGPU Top-Left Origin `(1.0 - (ndcY * 0.5 + 0.5)) * resolution.y`; Unit-Tests in `tests/renderers/ClusteredLightingAlignment.test.ts`.)*

**Datei:** `src/core/renderers/shaders/source/web_gpu/compute/cluster_cull.wgsl:23-27`

```wgsl
fn lightCellRangeY(ndcY: f32, ndcRadius: f32) -> vec2f {
    let centerPx = (ndcY * 0.5 + 0.5) * global.resolution.y;
    let radiusPx = ndcRadius * 0.5 * global.resolution.y;
    return vec2f(centerPx - radiusPx, centerPx + radiusPx) / global.tileSizePx.y;
}
```

Diese Funktion berechnet aus der NDC-Y-Koordinate eines Lichts (Clip-Space, `+1` = oben, spec-identisch zwischen WebGL und WebGPU) eine Pixel-Y-Koordinate für den Cluster-Grid-Zeilenindex. Die Formel `(ndcY*0.5+0.5)*resolution.y` ordnet NDC-Y `+1` (oben) den Wert `resolution.y` (den größten Pixelwert) zu — das ist die **OpenGL/WebGL-Fensterkoordinaten-Konvention** (Ursprung unten links, Y wächst nach oben, "oben im Bild" = großer Y-Wert).

Aber WebGPUs `@builtin(position)` im Fragment-Shader (verwendet z.B. in `lighting.wgsl:56-57`/`lighting_pbr.wgsl:75-76` als `i.pos.y` für exakt denselben Cluster-Zeilenindex) folgt der **entgegengesetzten** Konvention: Ursprung oben links, Y wächst nach unten — "oben im Bild" = Pixel-Y **0**. Das ist in der WebGPU-Spec explizit festgelegt (Abschnitt "Coordinate Systems": *"Framebuffer coordinates address the pixels in the framebuffer... The top-left corner is at (0.0, 0.0). x increases to the right. y increases down."*, geprüft per WebFetch gegen die offizielle W3C-Spec-Seite, nicht nur aus dem Gedächtnis rekonstruiert). NDC `+1` (oben) muss auf WebGPU also auf Framebuffer-Y **0** abgebildet werden, nicht auf `resolution.y`.

**Der Code selbst kennt diese Regel bereits — nur eben nicht hier:** `pbr_math.wgsl:32-34`/`:63-65` (`getShadowPCF`/`getShadowPCSS`) konvertieren dieselbe NDC-Y-Achse für die Schatten-Textur-UV korrekt geflippt: `let uv = vec2f(ndc.x * 0.5 + 0.5, 0.5 - ndc.y * 0.5)` — und `hzb_visibility_test.wgsl:80` genauso: `let uv = vec2f(ndc.x * 0.5 + 0.5, 1.0 - (ndc.y * 0.5 + 0.5)); // NDC Y-up -> texture V-down`. Beide Nachbar-Dateien flippen Y explizit mit Kommentar, weil eine Textur (wie ein Framebuffer) Ursprung oben-links hat. `lightCellRangeY()` braucht exakt denselben Flip — hat ihn aber nicht, obwohl `lightCoverage()` (`:44-59`) den Rückgabewert direkt gegen `gid.y`/`cellF.y` vergleicht, also gegen dieselbe Pixel/Zeilen-Konvention wie die Fragment-Seite.

**Verifiziert, nicht nur eine Spec-Fußnote:**
1. WebFetch gegen `https://www.w3.org/TR/webgpu/#coordinate-systems` bestätigt: NDC-Y `+1` → Framebuffer-Y `0` (Top-Left-Origin, Y wächst abwärts) — Gegenteil von OpenGL/WebGL2.
2. `Matrix4.ZO_CORRECTION` (`src/math/Matrix4.ts:594-598`) korrigiert nachweislich nur die Z-Range (`[-1,1]→[0,1]`), keinen Y-Flip — es gibt im ganzen Repo keine kompensierende Y-Flip-Matrix oder einen geflippten Viewport für WebGPU (grep nach `flipY`/`Y_FLIP`/negativem Viewport-Height in `WebGPURenderer.ts`: keine Treffer).
3. Cross-File-Vergleich: `hzb_visibility_test.wgsl` und `pbr_math.wgsl` (beide im selben Shader-Modul-Verbund) flippen Y korrekt und sogar mit erklärendem Kommentar ("NDC Y-up -> texture V-down") — nur `cluster_cull.wgsl` tut es nicht, obwohl es dieselbe Transformation braucht (NDC → Framebuffer-Pixel-Zeile, exakt das, was der geflippten Textur-V-Koordinate entspricht).
4. Die WebGL2-Parallele (`ClusterGrid.ts:145-148`, `centerPxY = (ndcY*0.5+0.5)*screenHeight`) benutzt dieselbe unkorrigierte Formel — dort aber **korrekt**, weil `gl_FragCoord.y` in WebGL2/OpenGL tatsächlich Ursprung unten-links hat (bestätigt durch `computeClusterCellIndex()` in `lights.frag.glsl:97-98`, das direkt `gl_FragCoord.y` ohne Flip verwendet). Das ist der Grund, warum Fork B's Cross-Check dieselbe Formel auf beiden Seiten fand und sie für "identisch und korrekt" hielt (siehe Positiv-Eintrag unten) — die Formel *ist* Zeile-für-Zeile identisch zwischen WebGL2-CPU-Pfad und WebGPU-Compute-Shader, aber genau diese 1:1-Kopie ist der Fehler: die beiden Backends brauchen an dieser einen Stelle unterschiedliche Formeln, weil ihre Fragment-Koordinatensysteme sich in Y unterscheiden, WebGL1/2 aber nicht.

**Failure-Szenario:** Auf WebGPU wird jedes Punkt-/Spot-Licht beim Schreiben des Cluster-Grids (Compute-Pass) in eine Y-Zeile einsortiert, die am horizontalen Bildschirm-Mittelpunkt gespiegelt ist relativ zu der Zeile, die der Fragment-Shader beim Lookup tatsächlich abfragt (`i.pos.y / tileSizePx.y`). Ein Licht in der oberen Bildschirmhälfte landet im Cluster-Grid in einer Zeile, die beim Lookup nur von Pixeln in der UNTEREN Bildschirmhälfte erreicht wird — das Licht beleuchtet (bei mehr als einer Zeile Unterschied zur Bildmitte) sichtbar die falsche Bildschirmhälfte, oder gar keine Geometrie, wenn dort in der gespiegelten Zeile nichts Passendes steht. Betrifft ausschließlich WebGPU (WebGL2 ist korrekt, siehe Punkt 4). Warum dieser sehr auffällige Fehler nicht längst aufgefallen ist: automatisierte visuelle Verifikation von WebGPU-Showcases ist eine bereits bekannte, akzeptierte Lücke (Headless-Chrome kann WebGPU nicht zuverlässig rendern) — ein Bug dieser Art hätte also nur durch manuelle Sichtprüfung in einem echten Browser auffallen können.

**Fix-Richtung:** `lightCellRangeY()` analog zu den Nachbardateien flippen: `let centerPx = (1.0 - (ndcY * 0.5 + 0.5)) * global.resolution.y;` (bzw. äquivalent `(0.5 - ndcY * 0.5) * global.resolution.y`). `lightCellRangeX()` braucht keinen Fix (X-Achse ist zwischen beiden Konventionen identisch orientiert). Ein Regressionstest, der eine Lichtposition mit bekannter NDC-Y in `lightCoverage()` einspeist und den zurückgegebenen Zeilenbereich gegen den erwarteten, unteren/oberen Bildschirmbereich prüft, würde diese Klasse Bug künftig abfangen — aktuell testet nichts im Repo diese Funktion isoliert (reiner WGSL-Code, nicht ohne Weiteres vitest-fähig, ein kleiner JS-Port der Formel für einen Unit-Test wäre eine Option).

---

## `src/renderers/passes/` — Cluster-Culling / HZB / Shadow / Depth-PrePass / Main-Passes

*(Review von ClusterCullPassGPU/WebGLClusterCullPass, HzbOcclusionPassGPU, DepthPrePassGPU, CascadedShadowPassGPU/SpotShadowPassGPU/WebGLShadowPass, MainRenderPass/WebGLMainPass sowie der zugehörigen Compute-WGSL-Chunks.)*

### 🟠 `WebGLShadowPass` regressiert den in `WebGLClusterCullPass` bereits gefixten Bivarianz-Hazard

**Datei:** `src/renderers/passes/WebGLShadowPass.ts:22-34`

```ts
const r = renderer as unknown as {
  renderShadowMaps?: (lights: LightDataInterface, opaqueBatches: RenderBatch[]) => void;
  updateGlobalUBO?: (vp: Float32Array, camPos: Vector3D, lights: LightDataInterface, near?: number, far?: number) => void;
};
if (r.renderShadowMaps) { r.renderShadowMaps(extractedLights, renderList.opaqueBatches); }
if (r.updateGlobalUBO) { r.updateGlobalUBO(vp, camPos, extractedLights, near, far); }
```

`renderShadowMaps`/`updateGlobalUBO` existieren ausschließlich auf `WebGL2Renderer` (kein Treffer in `AbstractWebGLRenderer.ts` oder `WebGL1Renderer.ts`). Die Nachbar-Datei `WebGLClusterCullPass.ts:26-30` benennt exakt dieses Muster als vorher behobenen Bug: *"this pass is typed against the shared `AbstractWebGLRenderer` interface... unlike the previous `execute(renderer: WebGL2Renderer, ...)` signature, which TypeScript's method-parameter bivariance let slide silently"* — und behebt es dort sauber mit `if (!(renderer instanceof WebGL2Renderer)) return;` + typisiertem Zugriff. `WebGLShadowPass` daneben tut das nicht — es verwendet einen `as unknown as {...}`-Cast mit optionalen Methoden, faktisch ein `any`-Äquivalent (AGENTS.md: "NO `any`"), das den bereits erkannten Hazard nur kaschiert statt ihn zu schließen.

**Failure-Szenario:** `WebGL1Renderer.addPass(new WebGLShadowPass())` compiliert momentan anstandslos (kein TS-Fehler) und würde zur Laufzeit lautlos gar nichts tun (beide `if`-Blöcke werden übersprungen, da `r.renderShadowMaps`/`r.updateGlobalUBO` `undefined` sind) — keine Exception, keine Warnung, einfach keine Schatten und kein UBO-Update. Aktuell wird die Pass nur in `WebGL2Renderer.ts:231` instanziiert, ist also praktisch nicht getroffen — aber genau dieses "aktuell nicht getroffen" war exakt die Ausgangslage, die den `WebGLClusterCullPass`-Fix motiviert hat.

**Verifiziert:** Wegwerf-Datei angelegt, die `WebGL1Renderer.addPass(new WebGLShadowPass())` aufruft, dann `npx tsc --noEmit -p tsconfig.json` — kein Compile-Fehler, bestätigt die Bivarianz-Lücke. Datei danach wieder gelöscht.

**Fix-Richtung:** `WebGLShadowPass` auf dasselbe Muster wie `WebGLClusterCullPass` umstellen (`instanceof WebGL2Renderer`-Guard + typisierter Zugriff), oder `renderShadowMaps`/`updateGlobalUBO` als optionale Methoden direkt im `AbstractWebGLRenderer`-Interface deklarieren, falls sie als Cross-Backend-Contract gedacht sind.

---

### 🟡 `GlobalUniforms`-Buffer wird bis zu 3× pro Frame per `writeBuffer` hochgeladen (WebGPU)

**Dateien:** `WebGPURenderer.ts:1957` (Default-Upload in `_updateGlobalBuffers()`) plus je ein weiterer `writeBuffer` auf denselben Puffer in `CascadedShadowPassGPU.ts:219` und `SpotShadowPassGPU.ts:214` (Schatten-Overlay-Daten nachgetragen).

Kein Korrektheitsproblem (deterministische Reihenfolge, jeder Call überschreibt nur bereits geschriebene Bytes an denselben Offsets), aber bei aktiven Directional- und Spot-Schatten werden pro Frame bis zu drei komplette 848-Byte-Uploads desselben Puffers an die GPU geschickt statt die Overlay-Werte vor einem einzigen Upload zusammenzuführen. Bei dieser Puffergröße vernachlässigbar, aber inkonsistent mit dem sonst gelebten "ein Upload pro Frame"-Prinzip (z.B. Cluster-Buffer laufen nur bei Resize neu).

---

### ✅ Positiv: Clustered-Lighting-Coverage-Formel ist Zeile-für-Zeile identisch zwischen WebGL2-CPU-Pfad und WebGPU-Compute-Shader (mit einer Einschränkung, siehe oben)

ADR 0007 behauptet explizit, dass `lightClusterCoverage()` (`src/math/ClusterGrid.ts:117-161`, CPU/WebGL2) und `lightCoverage()` (`cluster_cull.wgsl:44-59`, WebGPU) dieselbe Formel verwenden. Zeile für Zeile nachgerechnet: NDC-Radius-Umrechnung, Pixel-Range-X/Y-Berechnung und Z-Slice-Logik sind tatsächlich identisch aufgebaut (siehe auch `worldRadiusToNdcRadius()` in `screen_footprint.wgsl:9-11`, von beiden Backends über dieselbe geteilte Formel referenziert). Das ist genau der Grund, warum die 1:1-Kopie an der Y-Achse zum oben dokumentierten Bug führt: die Formel wurde korrekt für WebGL2 geschrieben und unverändert für WebGPU übernommen, ohne den einen Punkt zu berücksichtigen, an dem sich die beiden Fragment-Koordinatensysteme unterscheiden (Y-Orientierung). X-Achse, Z-Slice-Logik und die gesamte Radius-Mathematik sind davon nicht betroffen und real konsistent.

### ✅ Positiv: HZB Max-Depth-Pyramide + Occlusion-Test-Vergleichsrichtung ist korrekt

`hzb_downsample_max.wgsl` reduziert mit `max()` (nicht bilinearem Mittel) — speichert pro Mip die *fernste* Tiefe im 2×2-Footprint. `hzb_visibility_test.wgsl:84` vergleicht `results[i] = select(0u, 1u, nearDepth <= farthestInFootprint)` — bei Standard-Tiefenkonvention (0=near, 1=far, bestätigt durch `ZO_CORRECTION` + `depthCompare: "less-equal"` in `DepthPrePassGPU`) korrekt: sichtbar, wenn der nächste Punkt der Bounding-Sphere nicht tiefer liegt als der am weitesten entfernte Tiefenwert im überdeckten Footprint. Diese Vergleichsrichtung wird in vielen Hi-Z-Implementierungen vertauscht; hier ist sie nachweislich richtig, ebenso die konservativ aufgerundete Mip-Auswahl (`ceil(log2(footprintPx))`).

### ✅ Positiv: Pass-Reihenfolge in `WebGPURenderer.ts` korrekt und wie dokumentiert

`ClusterCullPassGPU → CascadedShadowPassGPU → SpotShadowPassGPU → DepthPrePassGPU → [HzbOcclusionPassGPU] → MainRenderPass` (Zeilen 477-484) deckt sich exakt mit den Docblock-Behauptungen in `HzbOcclusionPassGPU`/`DepthPrePassGPU`. Kein Stale-Shadow-Flag-Risiko beim dynamischen Ein-/Ausschalten von `castShadow` auf einem Licht (aktiv gegengecheckt: `_updateGlobalBuffers()` initialisiert `castShadow=0` als Default vor jedem möglichen Overlay-Schreiben durch die Shadow-Passes).

---

## `src/renderers/WebGPU/WebGPURenderer.ts` + `WebGPU/managers/` — Kernrenderer

### ✅ [ERLEDIGT] `_packObjectUniforms()`-Fallback verliert Alpha, wenn `u_color` in der Manifest fehlt
*(Behoben 2026-09-03: `_scratchColorArray` in `WebGPURenderer.ts` auf 4 Floats allokiert; Fallback setzt `[3] = o.material.color?.a ?? 1.0`; Unit-Tests in `tests/renderers/WebGPUObjectUniformPacker.test.ts`.)*

**Datei:** `src/renderers/WebGPU/WebGPURenderer.ts:166` (`_scratchColorArray = new Float32Array(3)`) und `:1742-1747`

```ts
if (values["u_color"] === undefined && o.material) {
  this._scratchColorArray[0] = o.material.color.r;
  this._scratchColorArray[1] = o.material.color.g;
  this._scratchColorArray[2] = o.material.color.b;
  values["u_color"] = this._scratchColorArray;
}
```

`_scratchColorArray` hat nur 3 Floats (RGB), aber `UniformPacker.packInto()` behandelt `COLOR` als 4-Komponenten-Typ und kopiert per `data.set(val, offset)` — `Float32Array.prototype.set()` kopiert nur die 3 vorhandenen Quell-Floats, das 4. Element (Alpha) bleibt auf `packInto()`s eigenem `data.fill(0)`-Ausgangswert stehen: **0**. Jedes WGSL-Material, das `obj.color.a` als Alpha-Multiplikator liest (z.B. `Standard.frag.wgsl:12`), bekommt `finalAlpha = 0` — das Objekt wird bei Alpha-Blending vollständig unsichtbar.

**Erreichbarkeit geprüft:** Für die eingebauten Standard-Materialien ist der Fallback tot (`AbstractMaterial._createBaseManifest()` setzt `u_color` immer explizit als echtes vec4). Aber `CustomShaderMaterial.getRenderManifest()` startet mit `properties: {}` und setzt `u_color` nur, wenn der Nutzer `setProperty("u_color", ...)` explizit aufruft, während `blending` automatisch aus `transparent` gesetzt wird — ein Nutzer mit `CustomShaderMaterial`, `transparent = true`, ohne manuelles `u_color`, bekommt reproduzierbar ein komplett unsichtbares Objekt auf WebGPU, obwohl der Code sichtbar genau diesen Fallback-Fall abfangen wollte.

**Verifiziert:** Code-Lesung + grep (`_scratchColorArray`-Deklaration, `UniformPacker`s `data.set()`-Pfad, Gegenprobe an `AbstractMaterial`/`CustomShaderMaterial`); `TypedArray.set()`-Verhalten mit kürzerem Quellarray ist spezifiziert, kein Live-Rendering nötig.

**Fix-Richtung:** `_scratchColorArray` auf 4 Floats vergrößern und `[3] = o.material.color.a ?? 1.0` explizit setzen, bevor es in `values["u_color"]` geschrieben wird.

---

### ✅ [ERLEDIGT] TAA/MotionTrail/Bloom/HBAO laufen ungeguardet auch für Offscreen-Render-Targets — kontaminieren die persistente TAA-History
*(Behoben 2026-09-03: `if (isPostProcessPass && isOffscreen) continue;` an den Anfang der Pass-Schleife in `WebGPURenderer.ts` gezogen, wodurch TAA, MotionTrail, Bloom, HBAO und Uber-Pass bei Offscreen-Targets übersprungen werden und die persistente History sauber bleibt.)*

**Datei:** `src/renderers/WebGPU/WebGPURenderer.ts:1321-1400` (Pass-Schleife in `render()`)

Die TAA-/MotionTrail-/Bloom-/HBAO-Blöcke in der Pass-Schleife haben — anders als die strukturell identische HZB-Pass — keinen `_activeRenderTarget`-Guard. `_buildHzbPyramid()`/`_dispatchHzbTest()` (Zeilen 859, 937) beginnen beide mit `if (this._activeRenderTarget) return;`, exakt nach ADR 0008 ("Occlusion culling only runs for the main canvas pass"). Für die vier genannten Post-Effekte fehlt dieser Guard komplett; nur die finale Composite-Pass wird für `isOffscreen` übersprungen (spät in der Schleife).

**Warum das ein echter Bug ist, nicht nur Verschwendung:** `PlanarReflectionNode.ts` und `DynamicReflectionProbe.ts` rufen pro Frame denselben `setRenderTarget(target)` + `render(...)`-Pfad wie der Hauptcanvas auf. `_hdrTexture`/`_hdrTextureView` sind renderer-weite Singleton-Felder (nicht pro Render-Target). Während eines Offscreen-Aufrufs zeigt `_hdrTextureView` weiterhin auf den stehengebliebenen HDR-Buffer des Hauptcanvas; ist TAA aktiv, blendet `HistoryBlendPassGPU.execute(ce, this._hdrTextureView, ...)` diesen falschen/veralteten Inhalt in seine **persistente** History-Textur. Der spätere Hauptcanvas-Aufruf im selben Frame berechnet `_taaResolvedView` zwar korrekt neu, aber die interne History-Textur bleibt kontaminiert — das nächste Frame blendet die echte Aufnahme gegen diese verunreinigte History, sichtbares Ghosting/Flackern unabhängig vom dokumentierten Motion-Vector-Trade-off. Zusätzlich rein als Performance-Kosten: Bloom/HBAO werden pro Offscreen-Aufruf komplett neu berechnet und dann verworfen (Ergebnis wird nie konsumiert).

**Verifiziert:** Codevergleich Guard-vorhanden (HZB) vs. fehlend (TAA/Bloom/HBAO) an strukturell identischer Stelle; grep bestätigt, dass `PlanarReflectionNode.ts`/`DynamicReflectionProbe.ts` denselben `renderer.render()`-Entry-Point nutzen; `_hdrTexture` als Singleton-Feld verifiziert (nicht pro Render-Target).

**Fix-Richtung:** Denselben `!this._activeRenderTarget`-Guard wie bei HZB vor die TAA-/MotionTrail-/Bloom-/HBAO-Blöcke ziehen.

---

### ✅ [ERLEDIGT] `setSize()` leakt die Haupt-Tiefentextur bei jedem Resize
*(Behoben 2026-09-03: `if (this._depthTexture) this._depthTexture.destroy();` in `setSize()` hinzugefügt und `_opaqueDepthTexture?.destroy()` in `destroy()` ergänzt.)*

**Datei:** `src/renderers/WebGPU/WebGPURenderer.ts:2020-2033`

Jeder Aufruf von `setSize()` erzeugt eine neue `_depthTexture` **ohne die vorherige zu `destroy()`en** — im Gegensatz zu den beiden Schwester-Texturen in derselben Methode (`_hzbTexture`/`_hdrTexture`), die beide korrekt vor der Neuzuweisung zerstört werden (Zeilen 2036, 2054). `grep -n "_depthTexture"` zeigt nur eine einzige `destroy()`-Stelle im gesamten File (Teardown, Zeile 2119). Bei häufigen Resize-Events (Fenster-Drag, `ResizeObserver` an einem größenverstellbaren Panel in Maker/Forge) bläht das den VRAM einer Session merklich auf.

**Verifiziert:** grep nach `_depthTexture`-Vorkommen und `.destroy()`-Aufrufen; Vergleich mit dem korrekten Handling der Nachbar-Texturen in derselben Funktion.

**Fix-Richtung:** `if (this._depthTexture) this._depthTexture.destroy();` vor der Neuzuweisung ergänzen, analog zu `_hzbTexture`/`_hdrTexture`.

---

### 🟠 `GPUGeometryCache`: `needsUpdate`-Pfad aktualisiert Tangenten nicht mit — WebGL1/2 tun es

**Datei:** `src/renderers/WebGPU/managers/GPUGeometryCache.ts:54-60`

```ts
if (c && geo.needsUpdate) {
  this._device.queue.writeBuffer(c.vb, 0, geo.vertices);
  if (c.nb && geo.normals) this._device.queue.writeBuffer(c.nb, 0, geo.normals);
  geo.needsUpdate = false;
  ...
}
```

Nur `vb`/`nb` werden re-uploaded, `c.tb` (Tangenten) fehlt. Das Interface-Docblock (`src/interfaces/GeometryData.ts:23-27`) verspricht ausdrücklich "vertex/normal/**tangent**"-Re-Upload bei `needsUpdate`; der WebGL-Pfad (`Mesh.update()`) hält dieses Versprechen (aktualisiert auch `tanbo`). Jede Geometrie, die ihre Tangenten in-place neu berechnet (Terrain-Sculpting, dynamische Wasseroberflächen) und `needsUpdate = true` setzt, bekommt auf WebGPU dauerhaft die Tangenten vom allerersten Upload — sichtbar falsche Normal-Map-Ausleuchtung, ohne Fehler oder Warnung.

**Verifiziert:** Direkter Codevergleich `GPUGeometryCache.getGeoCache` vs. `Mesh.update`, plus Interface-Docblock als Vertragsreferenz.

**Fix-Richtung:** `if (c.tb && geo.tangents) this._device.queue.writeBuffer(c.tb, 0, geo.tangents);` ergänzen, analog zu `nb`.

---

### 🟡 Stale Kommentar: "Max 4 lights" bei den WebGPU-Scratch-Arrays

**Datei:** `src/renderers/WebGPU/WebGPURenderer.ts:181-183` — `_scratchPointLightData`/`_scratchSpotLightData`/`_scratchAreaLightData` sind mit `// Max 4 lights` kommentiert, obwohl `_updateGlobalBuffers()` die Arrays dynamisch auf die tatsächliche Lichtzahl reallokiert und die zugehörigen GPU-Buffer längst auf 64 Lichter (ADR 0004/0007) dimensioniert sind. Kommentar stammt erkennbar aus der Zeit vor der Cap-Erhöhung 4→16→64 und ist irreführend. Fix: Kommentar auf "initial capacity, grows dynamically" korrigieren.

---

### ✅ Positiv (WebGPU-Kern)

- **Bind-Group- und Pipeline-Caching ist konsequent und korrekt gemacht.** `_getMaterialBindGroup()` vergleicht aufgelöste Ressourcen-Referenzen gegen den letzten Cache-Eintrag und erstellt nur bei tatsächlicher Änderung eine neue `GPUBindGroup`. `GPUPipelineCache` cached Pipelines/Shader-Module/Material-BGLs über einen zusammengesetzten Key und führt Refcounting durch.
- **`GPUObjectRingBuffer`** ist ein sauberes Muster: eine `hasDynamicOffset`-Bind-Group statt Buffer+BindGroup pro Objekt, Per-Frame-Dedup für denselben Shadow-Caster über 4 CSM-Kaskaden, korrekt ausgeschlossene Sprites, dokumentiertes Wachstumsmodell (nur zu Frame-Beginn, mit Headroom).
- **`mapAsync()`/HZB-Readback-Pattern ist exakt nach ADR 0008 umgesetzt** — pollt `buffer.mapState === "mapped"` statt sich auf das Promise zu verlassen.
- **Device-Init ist ungewöhnlich sorgfältig:** fordert `maxBufferSize` explizit vom Adapter an (sonst stille 256-MB-Spec-Untergrenze) und trennt `webgpuMaxSampledTexturesPerStage` bewusst von der gemeinsamen `maxTextureImageUnits`.
- **`RendererFactory` erfüllt das "Zero-Cost-Fallback"-Versprechen aus VISION.md doppelt** — bei statischer Feature-Erkennung (WebGPU→WebGL2→WebGL1) und zur Laufzeit, falls `initialize()` selbst fehlschlägt.
- **Refcounting bei Geometrie/Texturen/Pipelines konsistent zu Ende gedacht** — `GPUGeometryCache`, `GPUTextureResourceCache`, `GPUPipelineCache` teilen dasselbe Acquire/Release-Muster über `WeakMap<Object3D, ...>`.

---

## `src/renderers/post/` + `src/renderers/passes/PostProcessPass.ts`/`WebGLPostProcessPass.ts` — Post-Processing

### 🔴 WebGL-Uber-Shader kompiliert bei jeder Slider-Änderung neu — WebGPU löst das exakt gegenteilig

**Datei:** `src/renderers/post/passes/PostProcessPassGL.ts:31-71` (`_getSignature`) + `:248-252` (`execute`)

`_getSignature()` nimmt kontinuierliche Tuning-Werte (Exposure, Vignette-Offset/Darkness/Roundness, Grain-Intensity, Bloom-Color, Quantize-Steps, …) direkt mit in den Signatur-String auf. `execute()` vergleicht diese Signatur gegen `_compiledSignature` und ruft bei jeder Abweichung `_build()` auf, das unconditional `compileShader`/`linkProgram` ausführt — kein Cache, der ein bereits kompiliertes Programm für eine wiederkehrende Signatur wiederverwendet. Jede Slider-Bewegung im Inspector/Material Studio erzwingt also einen vollen Shader-Rebuild auf jedem Frame, in dem sich der Wert ändert.

Das steht im direkten Widerspruch zur WebGPU-Implementierung (`src/renderers/passes/PostProcessPass.ts:56-71`), deren eigener Kommentar exakt dieses Problem als gelöst benennt: *"Continuous tuning values ... live in the per-frame DynUniforms buffer instead ... tuning them must never rebuild."* Auf WebGPU lösen nur strukturelle enabled/mode-Flags einen Pipeline-Rebuild aus; alle Zahlenwerte gehen per `queue.writeBuffer` in den Uniform-Buffer. Für WebGL1/2 wurde diese Trennung (structural const vs. per-frame uniform) nie nachgezogen, obwohl die nötigen `uniform`-Deklarationen im Fragment-Shader bereits existieren (aktuell per `#define`-Makro statt als echtes Uniform injiziert).

**Verifiziert:** Code-Lesung `_getSignature`/`_build`/`execute` in `PostProcessPassGL.ts` (keine Fallunterscheidung struktureller vs. kontinuierlicher Parameter, keine Programm-Cache-Map); Gegenprobe in `PostProcessPass.ts` (WebGPU) zeigt die fehlende Unterscheidung.

**Fix-Richtung:** Die bereits vorhandenen `uniform`-Deklarationen als echte Uniforms belassen statt sie in `_build()` durch `#define`-Makros zu ersetzen; nur die tatsächlich strukturellen Flags weiter als Compile-Time-Konstante behandeln, analog zum WebGPU-Pfad.

---

### 🔴 Vignette-Formel divergiert zwischen WebGL1 und WebGL2/WebGPU — sichtbar unterschiedliches Ergebnis bei identischen Parametern

**Dateien:** `PostProcess.frag.glsl:210-223` (WebGL2) / `PostProcess.frag.wgsl:211-223` (WebGPU) vs. `PostProcess100.frag.glsl:75-81` (WebGL1)

WebGL2/WebGPU: `darkness` wirkt ausschließlich als Blend-Intensität am Ende (`mix`); die smoothstep-Kante (`innerRadius = offset*0.5`) hängt nur von `offset` ab. WebGL1: `v_edge0 = u_vignetteOffset - u_vignetteDarkness` benutzt `darkness` zusätzlich für die Kantenposition, UND nochmal für den finalen Mix. Bei Default-Werten (`offset=0.8`, `darkness=0.5`) ergibt sich zufällig eine ähnliche Kante, aber z.B. bei `darkness=1.0` kann `v_edge0` sogar negativ werden (`0.8-1.0=-0.2`), was die Übergangsbreite des `smoothstep` massiv verzerrt. Ein Nutzer, der eine Szene auf WebGL2 gestaltet und dieselbe `PostProcessingGroup`-Config auf einem WebGL1-Fallback-Gerät lädt, bekommt eine sichtbar andere Vignette-Form — ein Bruch des in VISION.md versprochenen "Zero-Cost Fallback ohne Lock-in". Kein ADR/Kommentar dokumentiert diese Abweichung als beabsichtigt (im Gegensatz zu HBAO/TAA, die ihre WebGL1-Einschränkung explizit dokumentieren).

**Verifiziert:** Direkter Formelvergleich der drei Shader-Dateien.

**Fix-Richtung:** WebGL1-Formel angleichen: `v_edge0 = u_vignetteOffset * 0.5` statt `u_vignetteOffset - u_vignetteDarkness`.

---

### 🟡 WebGL1 verliert Outline, HBAO und Vignette-`roundness` lautlos — nicht dokumentiert wie bei HBAO/TAA

**Datei:** `PostProcess100.frag.glsl` (keine `u_outlineEnabled`/`u_hbaoEnabled`/`u_vignetteRoundness`) vs. `OutlineElement.ts`/`VignetteElement.ts` (kein Hinweis auf Backend-Einschränkung im Klassenkommentar, anders als `HbaoElement`/`TaaElement`, die ihre WebGL1-Ausnahme explizit im JSDoc dokumentieren). Ein Nutzer, der Outline in Maker/Inspector aktiviert und auf einem WebGL1-Fallback-Gerät testet, sieht ohne jede Warnung keinen Effekt. Fix: kurzer Doku-Hinweis analog zu `HbaoElement`/`TaaElement`.

---

### ✅ Positiv (Post-Processing)

- **Bloom-Kernel (Kawase Dual-Filter) ist über alle drei Backends exakt identisch** — Downsample-/Upsample-Gewichte korrekt normalisiert, Karis-Prefilter Zeile für Zeile übernommen. Verifiziert per Diff der drei Shader-Varianten.
- **Post-Processing-Reihenfolge ist in WGSL und GLSL300 wortwörtlich identisch verdrahtet**: Bloom → HBAO → Tonemapping → Vignette → Grain → Filter-Color-Grading → Quantize → Outline — die in CONTEXT.md fixierte Reihenfolge wird korrekt eingehalten, kein Backend weicht ab.
- **HistoryBlendPass (TAA + MotionTrail) behandelt das "leere History im ersten Frame"-Problem sauber** über einen expliziten `_hasHistory`-Flag statt stillschweigend mit Garbage zu blenden — identisch in GL und GPU.
- **TAA und MotionTrail nutzen nachweislich getrennte `HistoryBlendPass`-Instanzen** mit eigenem Ping-Pong-State — keine versehentliche Kollision trotz gemeinsamer Pass-Klasse.
- **HBAO-Algorithmus ist zwischen WebGL2 und WebGPU nahezu 1:1 identisch** (nur die Normalen-Rekonstruktion unterscheidet sich technisch bedingt: `dFdx/dFdy` vs. explizite Finite-Differenzen), Radius-Semantik konsistent.

---

## `src/renderers/{AbstractRenderer,AbstractWebGLRenderer,Mesh,RenderPass,RendererFactory}.ts`, `WebGL1/`, `WebGL2/` — Renderer-Kern

*(Der 🔴 AreaLight-Stride-Bug oben in `WebGL2Renderer.ts` stammt aus diesem Teilbereich der Review.)*

### 🟠 `WebGLTextureManager`/`WebGL1Renderer`: Wrap/Filter-Änderungen werden nach Erstupload nie erneut angewendet

**Dateien:** `src/renderers/WebGL2/managers/WebGLTextureManager.ts:183-202` (`needsUpdate`-Zweig), `src/renderers/WebGL1/WebGL1Renderer.ts:338-355` (identisches Muster)

Der Erst-Upload einer Textur setzt `texParameteri` für `MIN_FILTER`/`MAG_FILTER`/`WRAP_S`/`WRAP_T` aus `tex.magFilter`/`minFilter`/`addressModeU`/`addressModeV`. Der Re-Upload-Zweig bei `tex.needsUpdate` ruft aber nur `texImage2D`+`generateMipmap` — kein einziges `texParameteri` erneut, auf beiden WebGL-Backends identisch. `Texture`s vier Sampler-Felder (`src/core/textures/Texture.ts:35-41`) sind einfache öffentliche Felder ohne Setter-Seiteneffekt — ein Aufrufer, der z.B. `texture.addressModeU` zur Laufzeit ändert und `needsUpdate=true` setzt, bekommt nie eine aktualisierte Sampler-Konfiguration auf der GPU, nur ggf. neue Pixeldaten. Texture-Arrays sind vom `needsUpdate`-Zweig sogar komplett ausgeschlossen (nie re-uploadbar).

**Verifiziert:** Codevergleich Erst-Upload- vs. `needsUpdate`-Zweig auf beiden Backends; `Texture.ts`-Felddeklaration als reine Public-Properties bestätigt.

**Fix-Richtung:** Sampler-Parameter-Block in eine gemeinsame Helper-Methode extrahieren, in beiden Zweigen auf beiden Backends aufrufen; alternativ echte Setter mit eigenem `samplerNeedsUpdate`-Flag.

---

### 🟡 Kommentar-Drift: `SpotLight.params`-Feldkommentar stimmt nicht mit tatsächlicher Nutzung überein

**Datei:** `src/core/renderers/shaders/source/web_gl2/chunks/lights.frag.glsl:17` — Kommentar sagt `// intensity, inner, outer, range`, tatsächlich (verifiziert gegen `light_calc.frag.glsl`/`light_calc_pbr.frag.glsl` und `WebGL2Renderer.ts:1514-1517`) ist es `cosOuter, cosInner, maxDistance, decay`. Werte selbst konsistent (kein funktionaler Bug), nur der Kommentar ist irreführend. Fix: Kommentar korrigieren.

### 🟡 `RendererFactory`: Fallback-Kette deckt nur WebGPU→WebGL2, nicht WebGL2→WebGL1 ab

**Datei:** `src/renderers/RendererFactory.ts:64-71`, `:93-118` — der `catch`-Block um `renderer.initialize()` fällt nur zurück, wenn `actualType === WEB_GPU`. Schlägt ein explizit angefordertes `WEB_GL2` trotz positiver `DeviceCaps`-Erkennung zur Laufzeit fehl (Treiber-Blocklist, Kontext-Limit), gibt es keinen Rückfall auf WebGL1 — die dreistufige Fallback-Philosophie aus VISION.md ist nur für den obersten Hop implementiert. Geringe Praxisrelevanz (Doppel-Fehlschlag selten), daher 🟡. Fix: denselben Catch-Mechanismus auch für den WEB_GL2→WEB_GL1-Hop.

### 🟢 Test-Lücke: kein Byte-Offset-Test für `GlobalUniforms`-UBO

`tests/renderers/WebGL2ClusterBindings.test.ts` prüft nur GLSL-Quelltext per String-`toContain`, nie echte `UNIFORM_OFFSET`-Werte gegen die hartkodierten TS-Offsets — genau diese Lücke hat den AreaLight-Stride-Bug oben unsichtbar gemacht. Ein Test gegen `gl.getActiveUniforms`/`UNIFORM_OFFSET` eines echten WebGL2-Kontexts würde diese Fehlerklasse systematisch abfangen.

---

### ✅ Positiv (WebGL-Kern)

- **`WebGLProgramCache.getProgram()` nutzt echte GPU-Introspection** (`ACTIVE_UNIFORMS`/`getActiveUniform`) statt einer von Hand gepflegten Uniform-Namensliste, inkl. sauberer Kollisionsvermeidung zwischen dynamisch zugewiesenen Sampler-Units und den reservierten Einheiten 8-18 für Schatten-/Cluster-Texturen.
- **`WebGL2FrameBuffer`/`WebGL2CubeFrameBuffer`**: sauberes Resize, kein Leak, vollständiges `destroy()`.
- **Konsistentes Referenzzählungs-Muster** (`refCount`, `WeakMap<Object3D, ...>`) über Programme/Meshes/Texturen hinweg.
- **Point-/Spot-Light-UBO-Layout korrekt** (32/64 Byte Stride, std140-konform) — nur der AreaLight-Stride danach ist falsch.
- **Batch-Granularität vermeidet unnötige State-Changes**: Schatten-Map-Bindings, Cluster-Grid-Sampler und Programmwechsel passieren einmal pro Shader/Manifest-Batch, nicht pro Objekt.
- **Keine WebGL1/WebGL2-Lichtberechnungs-Divergenz gefunden** — `light_calc*.frag.glsl` inhaltlich verglichen, funktional äquivalent zwischen beiden Backends.

---

## ✅ Was gut gemacht ist

Über alle Teilbereiche hinweg, nicht nur pro Abschnitt wiederholt:

- **Die GPU-Introspection-Migration zahlt sich sichtbar aus.** `WebGLProgramCache` (echte `ACTIVE_UNIFORMS`-Introspection statt Handliste) und `GPUPipelineCache`/`GPUGeometryCache`/`GPUTextureResourceCache` (konsistentes Refcounting über `WeakMap<Object3D, ...>`) sind an keiner Stelle mehr die Quelle der "hand-maintained uniform/sampler list"-Bugklasse, die laut Memory früher Root-Cause vieler WebGL1/WebGL2-Bugs war. Die verbleibenden kritischen Funde dieser Review (AreaLight-Stride, Cluster-Y-Flip) liegen bewusst *außerhalb* dieser Introspection-Schicht — in handgeschriebenen UBO-Offset-Konstanten bzw. handgeschriebener NDC-Pixel-Mathematik, die die Introspection strukturell nicht abdecken kann.
- **Bind-Group-/Pipeline-/Programm-Caching ist auf allen drei Backends durchdacht und korrekt Change-Detection-basiert**, nicht "neu bauen und hoffen" — WebGPU vergleicht aufgelöste Ressourcen-Referenzen vor jedem Bind-Group-Rebuild, WebGL cached Programme über introspektierte Signaturen.
- **Die dokumentierten ADR-Entscheidungen (0002/0004/0006/0007/0008) stimmen tatsächlich mit dem Code überein** — bei jeder Gegenprobe (HZB-Vergleichsrichtung, `mapAsync`-Polling-Pattern, PCSS-Backend-Aufteilung, Pass-Reihenfolge, Point/Spot-Cap) war die Doku akkurat, nicht aspirational.
- **WebGPU-Ring-Buffer- und Device-Init-Sorgfalt** (`GPUObjectRingBuffer`, explizite `maxBufferSize`-Anforderung) zeigen tiefes Verständnis konkreter, vorher aufgetretener Spec-Fallstricke, nicht nur Lehrbuch-WebGPU.
- **Bloom-Kernel und Post-Order sind über alle drei Sprachen (WGSL/GLSL300/GLSL100) tatsächlich Byte-für-Byte/Zeile-für-Zeile identisch** — bei einer Engine mit drei parallel gepflegten Shader-Dialekten keine Selbstverständlichkeit.

---

## Fazit

Diese Review-Runde hat **7× 🔴, 5× 🟠, 5× 🟡, 1× 🟢** ergeben — deutlich mehr kritische Funde als in den bisherigen Runden dieses Projekts üblich, weil der Scope diesmal gezielt in die am wenigsten introspektions-geschützten Ecken vorgedrungen ist: handgepflegte UBO-Byte-Offsets (WebGL2) und handgeschriebene NDC-zu-Pixel-Koordinatenmathematik (WebGPU-Compute). Beides sind exakt die Stellen, an denen die sonst im Projekt erfolgreiche "GPU-Introspection statt Handliste"-Strategie strukturell nicht greifen kann, weil hier keine GPU-Introspection-API existiert, die die Korrektheit automatisch erzwingen würde.

**Top-3-Priorität:**

1. **Clustered Forward+ Lighting (ADR 0007) ist auf beiden Backends, die es unterstützen, aktuell nicht korrekt** — auf WebGL2 strukturell tot (AreaLight-Stride-Bug lässt `u_clusterDims`/`u_tileSizePx` immer Null lesen, jede Cluster-Zuordnung bricht), auf WebGPU räumlich falsch (Y-Achse des Cluster-Grids ist gegenüber dem Fragment-Lookup gespiegelt, Lichter landen in der falschen Bildschirmhälfte). Das ist das namensgebende Flaggschiff-Feature aus CONTEXT.md/ADR 0007 — beide Bugs sollten vor jeder weiteren Feature-Arbeit an Clustered Lighting behoben und mit einem echten Byte-Offset-/Zeilen-Regressionstest abgesichert werden (die bestehenden Tests prüfen nur String-Inhalte bzw. gar nichts an dieser Stelle).
2. **WebGPU-Post-Effekte (TAA/MotionTrail/Bloom/HBAO) fehlt der `_activeRenderTarget`-Guard**, den die strukturell identische HZB-Pass bereits hat — Reflection-Probes/Planar-Reflections kontaminieren dadurch die persistente TAA-History mit fremdem Bildinhalt (Ghosting, das nichts mit dem akzeptierten Motion-Vector-Trade-off zu tun hat) und verschwenden volle Bloom/HBAO-Durchläufe. Kleiner, klar lokalisierter Fix (denselben Guard kopieren), hohe Wirkung.
3. **WebGL-Post-Processing rebuildet den kompletten Uber-Shader bei jeder Slider-Bewegung** (Exposure, Vignette, Grain, Bloom-Color, Quantize, Outline), während der WebGPU-Pfad genau dieses Problem bereits explizit gelöst hat (`DynUniforms`-Buffer statt Shader-Rebuild). Direkter Verstoß gegen das im WebGPU-Code selbst dokumentierte Prinzip "tuning them must never rebuild" — bei interaktiver Nutzung in Maker/Material Studio ein spürbares Frame-Hitch-Risiko auf jedem WebGL-Fallback-Gerät.

Daneben zwei schnell zu behebende, isolierte aber echte Bugs mit hohem Impact/Aufwand-Verhältnis: der Alpha-Verlust in `_packObjectUniforms()`s Farb-Fallback (macht `CustomShaderMaterial`-Objekte unsichtbar) und der `_depthTexture`-Leak bei jedem WebGPU-Resize.

Die Architektur selbst — Bind-Group-/Pipeline-Caching, Ring-Buffer-Design, Introspection-basierte Programm-Caches, ADR-Doku-Treue — ist durchweg solide und war in keinem einzigen Fall die Ursache der gefundenen Bugs; alle 🔴-Funde sitzen in konkreten, lokal begrenzten Berechnungen (ein Stride, eine Formel, ein fehlender Guard, ein fehlender vierter Float), nicht in strukturellen Entwurfsfehlern.

**Status:** ⚠️ mit kritischen Funden fertig
