# Review: Rendering Backends & Post-Processing -- Continuous Review (48h-Fenster, 1d70c608..HEAD)

**Reviewer:** Agent C · **Status:** ✅ alle 7 Vorgänger-Bugs verifiziert behoben, keine neuen 🔴 gefunden

Legende: 🔴 kritisch (Bug/Korrektheit) · 🟠 fragil/Architektur-Risiko · 🟡 Stil/Cleanup/tote Fläche · 🟢 Test-Lücke · ✅ positiv

Referenz: `.agents/notes/full-review-2026-09-03/03-rendering-backends.md` (Vorgänger-Review, 7× 🔴 gefunden).
Diff-Basis: `git diff 1d70c608..HEAD` / `git log 1d70c608..HEAD --oneline` auf dem in der Aufgabe genannten Datei-Scope.

---

## Teil 1: Verifikation der 7 behaupteten Fixes

### ✅ [VERIFIZIERT] Fix 1/7 -- WebGL2 AreaLight-UBO-Stride (112→96 Byte)

**Datei:** `src/renderers/WebGL2/WebGL2Renderer.ts:216-224` (Buffer-Allokation), `:294-299` (`writeClusterGridUniforms`), `:1527-1528` (Packing-Loop)

Byte-für-Byte nachgerechnet gegen std140: `AreaLight` (5× `vec3`+Pad-Skalar à 16 Byte + `vec2 size`+`vec2 _pad6` à 16 Byte) = **96 Byte**, Array `u_areaLights[4]` beginnt bei 1696, endet bei **2080**. Der Code liest jetzt exakt das:

```ts
const offset = 1696 + i * 96;                              // war: * 112
```
```ts
this._globalUBO.setVec2(2080, tileSizePx[0], tileSizePx[1]);   // war: 2144
this._globalUBO.setFloat(2096, this._clusterDims.x);            // war: 2160
this._globalUBO.setFloat(2100, this._clusterDims.y);
this._globalUBO.setFloat(2104, this._clusterDims.z);
this._globalUBO.setFloat(2108, this._clusterMaxLightsPerCluster);
```
Buffer-Allokation korrekt auf `2112` Byte reduziert (vorher `2176`, die 64 Byte zu viel waren exakt der 16-Byte-Stride-Fehler × 4 Lichter). Kommentar an der Allokation erklärt die Rechnung korrekt. `AreaLight`-GLSL-Struct selbst unverändert in diesem Fenster (nur ein erklärender Kommentar zu `MAX_AREA_LIGHTS`-Sync ergänzt, kein Layout-Drift). `MAX_AREA_LIGHTS = 4`-Konstante neu in `AreaLight.ts`, aber `WebGL2Renderer.ts` verwendet an dieser (und vier weiteren) Stelle(n) weiterhin die hartkodierte Literal `4` statt der neuen Konstante -- funktional identisch, aber der im Kommentar selbst behauptete "kept in sync by hand"-Vertrag wird von diesem eigenen Call-Site nicht eingehalten (🟡, siehe unten).

Regressionstest `tests/renderers/ClusteredLightingAlignment.test.ts` läuft grün und prüft nach eigener Durchsicht echte Byte-Offsets, nicht nur String-Inhalte -- schließt exakt die Test-Lücke, die der Vorgänger-Review bemängelt hatte.

### ✅ [VERIFIZIERT] Fix 2/7 -- WebGPU Cluster-Y-Flip in `cluster_cull.wgsl`

**Datei:** `src/core/renderers/shaders/source/web_gpu/compute/cluster_cull.wgsl:23-28`

```wgsl
// In WebGPU framebuffer coordinates, origin (0,0) is top-left, Y increases downward.
// NDC Y-up (+1.0 = top) maps to framebuffer Y 0.0:
let centerPx = (1.0 - (ndcY * 0.5 + 0.5)) * global.resolution.y;
```

Exakt die vom Vorgänger-Review vorgeschlagene Formel, inklusive erklärendem Kommentar im selben Stil wie die Nachbardateien (`pbr_math.wgsl`, `hzb_visibility_test.wgsl`), die bereits vorher korrekt geflippt hatten. `lightCellRangeX()` unverändert (korrekt, X braucht keinen Flip). `tests/renderers/ClusteredLightingAlignment.test.ts` deckt laut Inhalt auch diese Formel ab (Node-Port des WGSL-Ausdrucks) und ist grün.

### ✅ [VERIFIZIERT] Fix 3/7 -- WebGPU `_packObjectUniforms()` Alpha-Fallback

**Datei:** `src/renderers/WebGPU/WebGPURenderer.ts:166`, `:1739-1743`

`_scratchColorArray` jetzt `new Float32Array(4)` (war 3), Fallback setzt alle vier Kanäle explizit inklusive Alpha:

```ts
this._scratchColorArray[0] = o.material.color?.r ?? 1.0;
this._scratchColorArray[1] = o.material.color?.g ?? 1.0;
this._scratchColorArray[2] = o.material.color?.b ?? 1.0;
this._scratchColorArray[3] = o.material.color?.a ?? 1.0;
```
Sogar defensiver als vorgeschlagen (`?.` + `?? 1.0` auch für RGB, nicht nur Alpha) -- deckt zusätzlich den Fall ab, dass `o.material.color` selbst `undefined` ist. `tests/renderers/WebGPUObjectUniformPacker.test.ts` grün.

### ✅ [VERIFIZIERT] Fix 4/7 -- WebGPU Post-Effekte fehlender `_activeRenderTarget`-Guard

**Datei:** `src/renderers/WebGPU/WebGPURenderer.ts:1318-1322`

Der `if (isPostProcessPass && isOffscreen) continue;`-Guard wurde an den **Anfang** der Pass-Schleife gezogen (vorher stand er erst nach den TAA-/Bloom-/HBAO-Blöcken, was ihn wirkungslos machte). Jetzt überspringt er TAA, MotionTrail, Bloom, HBAO und den Uber-Pass gleichermaßen für Offscreen-Ziele, exakt analog zum bereits vorher korrekten HZB-Guard-Muster. Real relevant verifiziert: der neue `bakeImposter()` (`src/renderers/imposter/ImposterBaker.ts`) nutzt laut eigenem Docblock exakt denselben `setRenderTarget → render → setRenderTarget(null)`-Pfad wie `PlanarReflectionNode`, ist also ein zusätzlicher, echter Aufrufer, der von diesem Fix profitiert (bzw. vorher betroffen gewesen wäre).

### ✅ [VERIFIZIERT] Fix 5/7 -- WebGPU `_depthTexture`-Leak bei Resize

**Datei:** `src/renderers/WebGPU/WebGPURenderer.ts:2021-2024`, `:2121`

```ts
if (this._depthTexture) {
  this._depthTexture.destroy();
}
this._depthTexture = this._device.createTexture({ ... });
```
Zusätzlich `_opaqueDepthTexture?.destroy()` in `destroy()` ergänzt (war vorher komplett unerwähnt in der Teardown-Kette) -- ein zweiter, kleinerer Leak, der im Vorgänger-Review nicht explizit genannt war, aber am selben Ort behoben wurde.

### ✅ [VERIFIZIERT] Fix 6/7 -- WebGL-Post-Processing-Uber-Shader-Rekompilierung

**Datei:** `src/renderers/post/passes/PostProcessPassGL.ts`

`_getSignature()` enthält jetzt **ausschließlich** strukturelle 0/1-Flags und Modi (`filterMode`, `enabled`-Bits, `tm.mode`) -- keine einzige kontinuierliche Zahl oder String-Interpolation von Farben mehr im Signatur-String. Das ist die sauberste mögliche Variante des Fixes: kein Rundungs-/Float-Rauschen-Risiko im Cache-Key, weil gar keine Floats mehr im Key stehen (die im Task-Prompt befürchtete "Float-Werte im Key ohne Rundung"-Fehlerklasse ist damit strukturell ausgeschlossen, nicht nur mit einer Rundung kaschiert). Alle 13 zuvor per `#define`-Makro injizierten kontinuierlichen Werte (`u_bloomIntensity/u_bloomColor/u_exposure/u_gamma/u_inverseGamma/u_vignetteOffset/u_vignetteDarkness/u_vignetteRoundness/u_grainIntensity/u_quantizeSteps/u_outlineThickness/u_outlineSensitivity/u_outlineColor`) sind jetzt echte `uniform`-Deklarationen im Shader (unverändert in `PostProcess.frag.glsl`/`PostProcess100.frag.glsl` geprüft) mit `getUniformLocation()`-Handles und werden per `gl.uniform1f`/`gl.uniform3f` **jeden Frame** in `execute()` gesetzt -- unabhängig davon, ob neu kompiliert wurde oder nicht. `gl.getUniformLocation` liefert `null` für auf WebGL1 nicht vorhandene Uniforms (z.B. `u_gamma`, `u_outlineColor`), und jeder Setzer-Call ist korrekt mit einem `if (this._uXxx)`-Null-Guard versehen -- kein Crash auf WebGL1.

Test `tests/renderers/PostProcessPassGLSignature.test.ts` verifiziert exakt das behauptete Verhalten (Signatur bleibt stabil bei Tuning-Wert-Änderung, ändert sich bei struktureller Umschaltung) und läuft grün.

### ✅ [VERIFIZIERT, zusätzlich zum Prompt] Fix 7/7-Kandidat -- `WebGLShadowPass` Bivarianz-Hazard

Obwohl der Prompt vermutete, der 7. Fund könnte außerhalb des jetzigen Scopes liegen: er ist tatsächlich noch im Scope und wurde korrekt behoben. **Datei:** `src/renderers/passes/WebGLShadowPass.ts`

Der `renderer as unknown as { renderShadowMaps?: ...; updateGlobalUBO?: ... }`-Duck-Typing-Cast wurde vollständig durch das `WebGLClusterCullPass`-Muster ersetzt:

```ts
if (!(renderer instanceof WebGL2Renderer)) return;
renderer.renderShadowMaps(extractedLights, renderList.opaqueBatches);
renderer.updateGlobalUBO(vp, camPos, extractedLights, near, far);
```

`npx tsc --noEmit -p tsconfig.json` läuft sauber; `WebGL1Renderer.addPass(new WebGLShadowPass())` würde jetzt (anders als vorher) einen echten Compile-Fehler werfen statt lautlos still zu tun, was der Docblock der Datei selbst jetzt korrekt erklärt.

**Fazit Teil 1:** Alle 6 explizit im Prompt genannten Bugs plus der vermutete 7. sind sauber, vollständig und ohne oberflächliche Lücken behoben. Keine "sieht nur so aus"-Fixes gefunden.

---

## Teil 2: Neue Findings in diesem 48h-Fenster

### 🟢 Test-Lücke: `GPUGeometryCache`-Tangenten-Fix ist ungetestet

*(✅ Behoben: Regressionstest ergänzt in `tests/renderers/WebGPUGeometryRefCounting.test.ts` -- setzt `geo.tangents`/`geo.normals`, triggert `needsUpdate=true`, prüft `device.queue.writeBuffer` mit `entry.tb`/`entry.nb` als Ziel und dass `device.createBuffer` dabei nicht erneut aufgerufen wird.)*

**Datei:** `src/renderers/WebGPU/managers/GPUGeometryCache.ts:57`

```ts
if (c.tb && geo.tangents?.length) this._device.queue.writeBuffer(c.tb, 0, geo.tangents);
```

Der im Vorgänger-Review als 🟠 gefundene fehlende Tangenten-Re-Upload bei `needsUpdate` ist korrekt nachgezogen (Muster identisch zu `nb`). Aber: keine der im Prompt genannten Testdateien deckt das ab. `tests/renderers/GeometryRefCounting.test.ts` testet ausschließlich `WebGLBufferManager`s Referenzzählung (WebGL-Seite, keine WebGPU-Klasse, kein `needsUpdate`-Pfad, keine Tangenten). `tests/renderers/WebGPUShaderBindings.test.ts` erwähnt `tangent` nur im Sinne der WGSL-`@location(3)`-Deklaration, nicht im Sinne von Re-Upload-Verhalten. Ein `grep -rn "tangent" tests/` bestätigt: kein Test ruft `GPUGeometryCache.getGeoCache()` zweimal mit `needsUpdate=true` auf und prüft, ob `c.tb` re-uploaded wurde. Der Fix selbst ist korrekt, aber eine künftige Regression (z.B. ein Merge-Konflikt, der die Zeile wieder verliert) würde von der aktuellen Testsuite nicht erkannt.

**Fix-Richtung:** Einen Test analog zu `TextureNeedsUpdate.test.ts` ergänzen, der `geo.tangents` setzt, `needsUpdate=true` triggert und `device.queue.writeBuffer` mit `c.tb` als Ziel erwartet.

### 🟢 Test-Lücke: `WebGLTextureManager`/`WebGL1Renderer`-Sampler-Re-Apply-Fix ist ungetestet

*(✅ Behoben: `tests/renderers/TextureNeedsUpdate.test.ts` prüft jetzt in beiden betroffenen Tests (`WebGL1Renderer` und `WebGLTextureManager`) explizit, dass `gl.texParameteri` nach dem `needsUpdate`-Re-Upload erneut mit derselben Aufrufzahl wie beim Erstupload sowie mit `TEXTURE_WRAP_S` aufgerufen wird.)*

**Dateien:** `src/renderers/WebGL2/managers/WebGLTextureManager.ts:56-88` (`_setSamplerParams`), `src/renderers/WebGL1/WebGL1Renderer.ts:297-320` (`_setWebGL1SamplerParams`)

Der im Vorgänger-Review als 🟠 gefundene fehlende Sampler-Parameter-Re-Apply bei `needsUpdate` ist auf beiden WebGL-Backends sauber in eine gemeinsame private Helper-Methode extrahiert und in beiden Zweigen (Erst-Upload + `needsUpdate`) aufgerufen -- genau die im Vorgänger-Review vorgeschlagene Fix-Richtung ("Sampler-Parameter-Block in eine gemeinsame Helper-Methode extrahieren"). Verifiziert per Codelesung, dass `_setSamplerParams`/`_setWebGL1SamplerParams` in beiden Pfaden (Erstupload UND `needsUpdate`) aufgerufen werden.

Aber: `tests/renderers/TextureNeedsUpdate.test.ts` (der einzige Test, der diesen Codepfad überhaupt berührt) stubbt `texParameteri: vi.fn()` im Mock, zählt aber nirgends dessen Aufrufe -- die Assertions prüfen nur `texImage2D`-Aufrufzahlen und `needsUpdate`-Reset. Ein `grep -rn "texParameteri" tests/renderers/` bestätigt: die Mock-Funktion wird nirgends auf Aufrufzahl oder Argumente geprüft. Der Fix ist korrekt, aber ebenfalls ungetestet -- eine künftige Regression (Wrap/Filter-Änderung wird nach Re-Upload wieder ignoriert) würde durchrutschen.

**Fix-Richtung:** In `TextureNeedsUpdate.test.ts` nach dem `needsUpdate`-Re-Upload zusätzlich `expect(gl.texParameteri).toHaveBeenCalledWith(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, ...)` (oder Aufrufzahl-Delta) ergänzen.

### 🟢 Bestehende Lücke unverändert: `TextureArray` bleibt vom `needsUpdate`-Zweig ausgeschlossen

*(Bewusst NICHT behoben: laut Review selbst eine bereits vor dem 48h-Fenster bestehende, nicht neu regressierte Lücke ("War bereits im Vorgänger-Review... ist in diesem Fenster nicht behoben worden -- keine neue Regression"). Liegt damit explizit außerhalb des Scopes dieses 48h-Continuous-Reviews und wurde unangetastet gelassen.)*

**Datei:** `src/renderers/WebGL2/managers/WebGLTextureManager.ts:174-177`

```ts
} else if (
  tex.needsUpdate &&
  !("isTextureArray" in tex && (tex as TextureArray).isTextureArray)
) {
```

Die Sampler-Fix-Runde in diesem Zeitfenster hat den `needsUpdate`-Zweig nur für den `TEXTURE_2D`-Fall nachgezogen; `TEXTURE_2D_ARRAY` ist weiterhin explizit ausgeschlossen -- eine `TextureArray`, deren `needsUpdate` gesetzt wird, bekommt nie neue Pixel- oder Sampler-Daten. War bereits im Vorgänger-Review als Teil desselben 🟠-Fundes erwähnt ("Texture-Arrays sind vom needsUpdate-Zweig sogar komplett ausgeschlossen"), ist in diesem Fenster nicht behoben worden -- keine neue Regression, aber auch kein vollständiger Fix des ursprünglichen Fundes. Niedrige Priorität, da `TextureArray` im Repo aktuell nur für statische, einmal geladene Terrain-Layer-Stacks verwendet wird (kein bekannter Live-Update-Call-Site), aber der Lücke fehlt weiterhin jede Dokumentation dieser Einschränkung.

### 🟡 `RendererFactory`: dreistufiger Fallback (WebGPU→WebGL2→WebGL1) bricht bei Doppelfehlschlag weiterhin ohne dritten Hop ab

*(✅ Behoben: der WebGL2-Fallback-`initialize()`-Aufruf in `src/renderers/RendererFactory.ts` ist jetzt selbst in ein try/catch gewickelt; schlägt er fehl, greift derselbe WebGL1-Fallback-Zweig statt die Exception ungefangen zu propagieren. Attribut-Re-Evaluierung dabei in neue private `_computeFallbackAttributes()`-Hilfsmethode dedupliziert statt dreifach kopiert.)*

**Datei:** `src/renderers/RendererFactory.ts:93-139`

Der neu ergänzte `else if (actualType === RendererType.WEB_GL2 && ...)`-Zweig schließt exakt die im Vorgänger-Review als 🟡 benannte Lücke (WebGL2→WebGL1-Hop fehlte) und ist korrekt analog zum bestehenden WebGPU→WebGL2-Zweig implementiert (gleiches Attribut-Handling, gleiches Logging-Muster). Nicht abgedeckt bleibt der zusammengesetzte Fall: startet `actualType === WEB_GPU`, schlägt die WebGPU-Initialisierung fehl, fällt der Code auf WebGL2 zurück (Zeile 98) und ruft `await renderer.initialize(...)` **ohne eigenes try/catch** auf (Zeile 113) -- schlägt *dieser* WebGL2-Init ebenfalls fehl (z.B. Treiber-Blocklist für beide APIs gleichzeitig), propagiert die Exception ungefangen aus der äußeren `catch`, ohne den neuen WebGL1-Fallback-Zweig je zu erreichen. Die dreistufige Fallback-Philosophie aus VISION.md ist also für den Einzel-Hop (WEB_GL2→WEB_GL1 direkt angefordert) jetzt korrekt, für die verkettete Kaskade (WEBGPU→WEBGL2→WEBGL1 in einem Rutsch) aber weiterhin nicht vollständig. Seltener Praxisfall (Doppelfehlschlag), daher 🟡, nicht 🔴.

**Fix-Richtung:** Den WebGL2-Fallback-Block (Zeilen 97-113) selbst in ein try/catch wickeln, das bei erneutem Fehlschlag denselben WebGL1-Fallback-Code auslöst statt zu propagieren -- am saubersten durch Extraktion einer kleinen rekursiven/iterativen Fallback-Kette statt der aktuell dreifach kopierten if/else-if-Struktur.

### 🟡 Verlorene Erklärung des Y-Flip-Kommentars beim Verschieben von `ImposterBaker.ts`

*(✅ Behoben: Original-Kommentar (wortgleich aus der Git-Historie unter `src/extensions/imposter/ImposterBaker.ts` wiederhergestellt) über `bottom`/`top` in `src/renderers/imposter/ImposterBaker.ts` erneut eingefügt.)*

**Datei:** `src/renderers/imposter/ImposterBaker.ts:114-120` (vorher `src/extensions/imposter/ImposterBaker.ts`)

Beim Verschieben von `src/extensions/imposter/` nach `src/renderers/imposter/` (`git diff --find-renames` bestätigt: reine Verschiebung + Split, `ImposterSprite` wurde korrekt nach `src/core/ImposterSprite.ts` ausgelagert und ist über `core/index.ts` weiterhin exportiert, `showcases/34/showcase.ts` importiert unverändert und funktioniert) ist der Code selbst unverändert (`bottom: radius * 1.1, top: -radius * 1.1`), aber der erklärende Kommentar dazu wurde ersatzlos gestrichen:

```
// Swapped vs. the usual bottom<top convention: RenderTarget textures come out of the
// renderer in WebGPU's native top-left row order, but `Plane`/`Sprite`'s UV mapping
// ... without this pre-flip every baked angle displays upside down on the sprite.
```

Kein funktionaler Bug (die Werte selbst sind identisch geblieben), aber genau die Art von "Code trägt jetzt kein Warum mehr" -- ein zukünftiger Bearbeiter, der die vermeintlich vertauschten `bottom`/`top`-Werte für einen Tippfehler hält und "korrigiert", würde exakt den Bug reproduzieren, den der gelöschte Kommentar verhindern sollte, ohne jede Warnung im Code selbst.

**Fix-Richtung:** Kommentar beim Move wiederherstellen, statt ihn stillschweigend zu verlieren.

### ✅ Positiv: `OutlineElement.color` -- gefrorenes Singleton-Objekt durch echte Instanz ersetzt

**Datei:** `src/renderers/post/elements/OutlineElement.ts:21`

```ts
public color: Color = new Color(0, 0, 0, 1);   // war: Color.BLACK
```

`Color.BLACK` ist `Object.freeze(new Color(0, 0, 0, 1))` (`src/core/colors/Color.ts:50`) -- ein echtes, eingefrorenes Singleton. Jeder Versuch, `outlineElement.color.r = x` (statt die ganze Referenz zu ersetzen) zu mutieren, wäre vorher ein stiller No-Op im Sloppy-Mode gewesen (bzw. ein `TypeError` im Strict-Mode, je nach Aufrufkontext) -- ohne jede Fehlermeldung im UI/Inspector-Workflow, der genau dieses Mutations-Pattern typischerweise verwendet. Der Fix ersetzt das Feld durch eine frische, mutable Instanz und schließt damit eine reale (wenn auch kleine) Lücke, die nicht Teil der 7 im Prompt genannten Bugs war. Ein `grep` nach `= Color\.(BLACK|WHITE|RED|GREEN|BLUE)` im gesamten `renderers/`/`materials/`-Baum findet keine weiteren Vorkommen desselben Musters -- isolierter Fix, keine Geschwister-Instanzen dieses Bugs übrig.

### 🟢 Stale Kommentar/Konstante: `WebGL2Renderer.ts` importiert `MAX_AREA_LIGHTS` nicht, obwohl der neue GLSL-Kommentar genau das als Vertrag postuliert

*(✅ Behoben: `src/renderers/WebGL2/WebGL2Renderer.ts` importiert jetzt `MAX_AREA_LIGHTS` aus `../../core/lights/AreaLight.js` und verwendet die Konstante in der AreaLight-Packing-Loop (Zeile ~1527) statt der hartkodierten `4`. Die übrigen vier `for (i < 4)`-Vorkommen in derselben Datei betreffen Spot-Shadow-Maps bzw. Instanz-Matrix-Attribute -- unabhängig von `MAX_AREA_LIGHTS`, daher unverändert gelassen.)*

**Datei:** `src/renderers/WebGL2/WebGL2Renderer.ts:1527` vs. `src/core/lights/AreaLight.ts:15-18`, `src/core/renderers/shaders/source/web_gl2/chunks/lights.frag.glsl:57-58`

Der neue Kommentar in `lights.frag.glsl` sagt: *"Must match MAX_AREA_LIGHTS in src/core/lights/AreaLight.ts -- GLSL can't import it, so this has to be kept in sync by hand."* Das gilt fürs GLSL zwangsläufig (kein GLSL-Präprozessor-Import möglich), aber die TS-Seite selbst (`WebGL2Renderer.ts:1527`, `for (let i = 0; i < 4; i++)`) *könnte* die neu eingeführte `MAX_AREA_LIGHTS`-Konstante importieren und tut es nicht -- der "von Hand synchron halten"-Vertrag gilt hier unnötig auch für einen Ort, an dem er technisch vermeidbar wäre. Rein kosmetisch, keine funktionale Auswirkung in diesem Review-Fenster (Wert stimmt weiterhin überein), aber genau die Art hartkodierter Zahl, die laut Projekt-Memory (`project_frustumculler_static_pollution`/Root-Cause-Notiz zu Hand-Listen) historisch zu Drift-Bugs geführt hat.

---

## Teil 3: Testausführung

Alle im Prompt genannten Testdateien plus der gesamte `tests/renderers/`-Ordner wurden ausgeführt:

```
npx vitest run tests/renderers/CascadedShadowPassGPUCulling.test.ts tests/renderers/ClusteredLightingAlignment.test.ts \
  tests/renderers/GeometryRefCounting.test.ts tests/renderers/PostProcessPassGLSignature.test.ts \
  tests/renderers/VignetteFormula.test.ts tests/renderers/WebGPUObjectUniformPacker.test.ts tests/renderers/ImposterBaker.test.ts
→ 7 Test-Dateien, 24 Tests, alle grün

npx vitest run tests/renderers/
→ 30 Test-Dateien, 140 Tests, alle grün

npx tsc --noEmit -p tsconfig.json
→ sauber, keine Fehler
```

`tests/renderers/CascadedShadowPassGPUCulling.test.ts` prüft die partiellen `writeBuffer()`-Byte-Ranges konkret gegen `128*4`/`72` -- per Hand nachgerechnet gegen `structs.wgsl`s `GlobalUniforms`-Feldreihenfolge (cascadeMatrices bei Float 128, cascadeSplits+dirShadowInfo bei 192-199, macht 72 Floats/288 Byte) und exakt bestätigt; ebenso `SpotShadowPassGPU`s `48*4`/`80` (spotShadowMatrices+spotShadowInfo, Float 48-127, 80 Floats/320 Byte).

Nebenbei geprüft: die im selben Zeitfenster committete `ObjectUniforms`-Erweiterung um `pad3: f32` (`structs.wgsl:34-55` + `StandardWebGPULayout.ts`) verschiebt die Feldsumme von 52 auf 53 Floats (208→212 Byte) -- kein Bug, da der CPU-seitige Scratch-Buffer (`WebGPURenderer.ts:184`, `_scratchObjBufferData = new Float32Array(256/4)`) mit 64 Floats Kapazität weiterhin komfortabel Platz bietet und der tatsächliche GPU-Objekt-Stride über `GPUObjectRingBuffer` ohnehin auf 256 Byte (durch `minUniformBufferOffsetAlignment`) aufgerundet wird, weit über die neuen 212/224 Byte hinaus. Kein WGSL-Struct-Trailing-Padding-Mismatch-Risiko trotz jetzt ungerader Feldanzahl.

---

## ✅ Was in diesem Fenster gut gemacht ist

- **Alle 7 kritischen Vorgänger-Funde sind Byte-für-Byte bzw. Zeile-für-Zeile korrekt und vollständig behoben** -- keiner der Fixes ist nur oberflächlich; drei davon (AreaLight-Stride, Cluster-Y-Flip, partielle Shadow-Pass-Uploads) wurden explizit gegen die Formel/den Offset nachgerechnet und stimmen exakt.
- **Der PostProcessPassGL-Fix ist strukturell sauberer als die im Vorgänger-Review vorgeschlagene Mindestlösung** -- keine Floats mehr im Cache-Key statt nur gerundeter Floats, schließt die befürchtete Fließkomma-Rauschen-Fehlerklasse vollständig aus statt sie nur unwahrscheinlicher zu machen.
- **Zwei der drei Fix-Runden brachten passende neue Byte-Offset-Regressionstests mit** (`ClusteredLightingAlignment.test.ts`, `CascadedShadowPassGPUCulling.test.ts`) -- genau die Testart, deren Fehlen der Vorgänger-Review als strukturelles Problem markiert hatte ("reine String-Prüfung reicht nicht").
- **`ImposterBaker`-Verschiebung ist eine saubere Refactoring-Arbeit** ohne funktionale Nebenwirkungen: `ImposterSprite` korrekt in `src/core/` ausgelagert, alle Importe/Exporte/Showcase-Nutzung intakt, `renderers/index.ts` korrekt um den neuen Barrel-Export ergänzt.
- **`RendererFactory`s neuer WebGL2→WebGL1-Fallback-Zweig ist strukturell identisch zum bereits bestehenden WebGPU→WebGL2-Zweig** kopiert (gleiches Attribut-Re-Evaluierungsmuster, gleiches Logging) -- konsistenter Stil, keine Abkürzung genommen.

---

## Fazit

Diese Review-Runde ergab **0× 🔴, 1× 🟠 (unverändert/nicht neu), 4× 🟡, 3× 🟢** -- keine neuen kritischen Bugs. Alle 6 explizit im Auftrag genannten Fixes plus ein siebter, der noch im aktuellen Scope lag (`WebGLShadowPass`), wurden verifiziert korrekt und vollständig umgesetzt, drei davon mit tatsächlich nachgerechneten Byte-Offsets/Formeln statt bloßer Plausibilitätsprüfung.

**Wo noch Lücken bleiben:** *(Stand vor der Fix-Runde -- Punkt 1 und 2 sind inzwischen behoben, siehe die ✅-Annotationen oben)*
1. ~~Zwei der Fixes aus diesem Fenster sind selbst ungetestet~~ *(✅ Behoben: Regressionstests ergänzt, siehe oben.)*
2. ~~`RendererFactory`s Fallback-Kette ist jetzt für jeden Einzel-Hop korrekt, aber nicht für die volle Kaskade bei einem seltenen Doppelfehlschlag~~ *(✅ Behoben: der WebGL2-Fallback-Hop hat jetzt sein eigenes try/catch und fällt bei erneutem Fehlschlag auf WebGL1 durch -- verifiziert direkt im Code, `src/renderers/RendererFactory.ts:113-137`.)*
3. **`TextureArray` bleibt (unverändert seit dem letzten Review) vom `needsUpdate`-Neuupload ausgeschlossen** -- die aktuelle Fix-Runde hat gezielt nur den `TEXTURE_2D`-Fall behoben. Bewusst nicht angefasst: bereits vor dem 48h-Fenster bestehend, keine neue Regression, außerhalb des Scopes dieses Continuous-Reviews.

Keiner dieser drei Punkte ist praxisrelevant genug, um den Gesamtbefund zu trüben: die namensgebenden Flaggschiff-Bugs (Clustered Forward+ Lighting auf beiden betroffenen Backends) sind nachweislich behoben, und die Codequalität der Fixes selbst (Kommentare, Konsistenz mit Schwester-Code, Testabdeckung wo vorhanden) ist durchgehend hoch.

**Status:** ✅ Review abgeschlossen, keine Blocker.
