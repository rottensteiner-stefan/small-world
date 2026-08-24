# Codebase Review — 2026-08-22

Untersucht: die gesamte Engine-Codebasis unter `src/` (331 TypeScript-Dateien, ~47.300 LOC),
nicht nur ein einzelner Diff. Ziel: Korrektheits-Bugs sowie Clean-Code-/Runtime-Performance-Probleme
projektweit aufdecken. Methode: dimensionsweise Analyse (Renderer/GPU, Physik/Szenengraph, Loader),
jeder Fund anschließend von unabhängigen Fork-Agenten adversarial gegen den Live-Quellcode verifiziert.
Kein hier gelistetes Finding wurde bei der Verifikation widerlegt.

Stand: 2026-08-22.

## Kritisch — Crash / Datenkorruption

> **Status 2026-08-22:** Findings #1–#9 sind gefixt (siehe Commit-Historie). #10 ist noch offen.

### 1. ✅ `WebGL2Renderer.ts:1875` — HDR-Framebuffer ignoriert fehlende Extension
Der Rückgabewert von `getExtension("EXT_color_buffer_float")` wird verworfen; das
Post-Processing-Setup baut unbedingt einen RGBA16F/HALF_FLOAT-Framebuffer, statt wie
`WebGL1Renderer.ts:830-833` auf `UNSIGNED_BYTE` zurückzufallen.

**Szenario:** Auf WebGL2-Geräten/Treibern ohne `EXT_color_buffer_float` (manche Mobile-GPUs, auch
die im Repo selbst genutzte SwiftShader-CI) wirft `new WebGL2FrameBuffer(...)` beim Aktivieren
jedes Post-Processing-Effekts (Bloom/HBAO/TAA) `"Framebuffer is incomplete"` und reißt das gesamte
Renderer-Setup ab.

**Fix:** Extension-Check ausgewertet; ohne Support fällt der HDR-Framebuffer auf
`RGBA8`/`UNSIGNED_BYTE` zurück statt auf `RGBA16F`/`HALF_FLOAT` zu bestehen.

### 2. ✅ `src/renderers/passes/SpotShadowPassGPU.ts:81` — Spot-Shadow-Loop ohne Cap
Die WebGPU-Spot-Shadow-Schleife iteriert über `lights.sLights.length` ohne Obergrenze, obwohl das
Shadow-Atlas fix auf 4 Array-Layer angelegt ist. WebGL2 deckelt die äquivalente Schleife explizit
bei 4.

**Szenario:** Bei 5+ schattenwerfenden Spotlights fordert `createView({baseArrayLayer: j})` Layer 4
einer nur 4 Layer großen Textur an — ein ungültiger WebGPU-Call, der zusätzlich den für
Directional-Light-Kaskaden reservierten Uniform-Bereich korrumpiert.

**Fix:** Beide betroffenen Schleifen (Render-Loop und Uniform-Schreib-Loop) auf
`Math.min(lights.sLights.length, 4)` gedeckelt, konsistent mit dem bestehenden
`u_spotShadowMap[4]`-Cap in `WebGL2Renderer.ts:1270`.

### 3. ✅ `src/renderers/post/passes/BloomPassGPU.ts:24` — Fixe mipLevelCount bricht kleine Targets
GPU-Bloom fordert immer `mipLevelCount: 5` an, unabhängig von der Render-Target-Größe. `BloomPassGL`
stoppt die Mip-Chain dagegen dynamisch, sobald ein Level unter 2px schrumpfen würde.

**Szenario:** Bei einem kleinen Render-Target (z. B. `bloomW=8`, das nur 4 gültige Mip-Level
erlaubt) ruft `device.createTexture` mit ungültigem `mipLevelCount` 5 auf; nachfolgende
`createView({baseMipLevel: i})` für das außerhalb liegende Level schlägt die Validierung fehl und
bricht Bloom unter WebGPU bei niedrigen Auflösungen.

**Fix:** `_mipCount` wird pro Resize dynamisch auf
`Math.min(5, 1 + Math.floor(Math.log2(Math.max(bloomW, bloomH))))` berechnet — den von WebGPU
tatsächlich erlaubten Höchstwert für `mipLevelCount`, statt fix 5. Mirrors `BloomPassGL`s
dynamischer Mip-Chain-Länge.

### 4. ✅ `src/loaders/ObjLoader.ts:171` — Negative (relative) OBJ-Indizes nicht aufgelöst
Negative, relative OBJ-Vertex-Indizes (Teil der Spezifikation, häufig von Blender exportiert)
werden nicht zu `tempV.length + vRaw` aufgelöst, sondern scheitern an der `vIdx < 0`-Prüfung.

**Szenario:** Das Laden jeder OBJ-Datei mit relativen Face-Indizes (z. B.
`f -3/-3/-3 -2/-2/-2 -1/-1/-1`) kollabiert jedes betroffene Dreieck auf `(0,0,0)`, nur begleitet von
einer `console.warn`.

**Fix:** Negativer `vRaw` wird jetzt zu `tempV.length + vRaw * 3` aufgelöst (relativ zum zuletzt
geparsten Vertex), zusätzlich wird `vRaw === 0` explizit als ungültig behandelt.

### 5. ⬜ `src/loaders/ObjLoader.ts:195` — Fehlender Normal-Platzhalter verschiebt Normalen-Array
Fehlt bei einem OBJ-Face-Vertex ein gültiger `vn`-Index, wird kein Platzhalter `(0,0,0)` gepusht,
anders als beim UV-Zweig direkt darüber, der immer `(0,0)` pusht.

**Szenario:** Eine OBJ-Datei, bei der innerhalb einer Materialgruppe manche Face-Vertices ein
gültiges `vn` haben und andere nicht, lässt `outNormals` kürzer als `outVertices` werden — alle
folgenden Normalen verschieben sich um einen Slot. Da `outNormals.length > 0`, greift
`ModelGeometry`s Recompute-Fallback nie; falsch zugeordnete Normalen führen zu stillschweigend
falscher Beleuchtung.

## Silent-Failure-Bugs — am gefährlichsten, weil unbemerkt

### 6. ✅ `src/physix/RigidBody.ts:8` — `mass`-Neuzuweisung wird von der Simulation ignoriert
`mass` und `inertia` sind öffentliche, mutable Felder, während `inverseMass`/`inverseInertia`
`readonly` sind und nur einmal im Konstruktor berechnet werden.

**Szenario:** `rigidBody.mass = 5` nach der Konstruktion kompiliert und läuft anstandslos, aber
jede Kraft-/Impuls-Berechnung in `PhysicsSystem` nutzt weiterhin die im Konstruktor eingefrorene
`inverseMass` — die simulierte Masse ändert sich nie. Ein stiller, schwer zu diagnostizierender Bug.

**Fix:** `mass`/`inertia` sind jetzt Getter/Setter über private Felder `_mass`/`_inertia`; der Setter
berechnet `_inverseMass`/`_inverseInertia` neu. `inverseMass`/`inverseInertia` bleiben nach außen
weiterhin einfache (jetzt Getter-)Properties — keine Breaking Change für bestehenden Aufrufcode.

### 7. ✅ `src/core/Octree.ts:92` — Objekte außerhalb der Root-Bounds werden dauerhaft unsichtbar
`Octree.insert()` schlägt bei Objekten außerhalb der fix bei `initOctrees()` gesetzten Root-Bounds
nur mit `console.warn` fehl; `FrustumCuller` setzt Sichtbarkeit ausschließlich für von `query()`
zurückgegebene Objekte zurück.

**Szenario:** Ein dynamisch gespawntes oder schnell bewegtes/teleportiertes Objekt außerhalb der
Octree-Bounds wird nie von `query()` erfasst; `FrustumCuller._resetCulling` hat `inFrustum` bereits
auf `false` gesetzt — das Objekt bleibt dauerhaft unsichtbar, obwohl es in Szenengraph und
Physik-Listen weiterlebt.

**Fix:** `Octree.insert()` erweitert bei fehlgeschlagenem `root.insert()` jetzt die Root-`bounds`
(via `getBroadRadius()`/`center`, MathPool-basiert, alloc-frei) so, dass sie das Objekt einschließen,
und versucht den Insert erneut. Da `dynamicOctree`/`staticOctree` über Frames hinweg dieselbe
`bounds`-Instanz behalten (nur `.clear()`, keine Neuerzeugung), bleibt die Erweiterung persistent.
Bestehender Test `tests/core/Octree.test.ts` (erwartete bisher `false`) wurde auf das neue,
korrekte Verhalten aktualisiert.

**Nachtrag (Review-Feedback):** Berechtigter Einwand, dass ein Dehnen der Root-Bounds nicht
automatisch die bereits bei `_subdivide()` erzeugten Kind-Oktanten mitwachsen lässt. Empirisch mit
einem Repro-Test verifiziert (Root mit `maxObjects: 2` erzwungen unterteilt, dann Insert weit
außerhalb): Das Objekt landet korrekt im Fallback (`objects`-Array) des Root-Knotens selbst, und
`query()`/`queryRay()`/`queryVolume()` prüfen diese Fallback-Liste an *jedem* Knoten unconditional,
unabhängig von Rekursion in Kinder — daher bleibt es auffindbar, nicht unsichtbar. Der Review hat
dabei aber eine echte, verwandte Lücke aufgedeckt: `_subdivide()` war nicht dagegen geschützt, ein
zweites Mal auf einem bereits unterteilten Knoten zu laufen (falls die Fallback-Liste durch
wiederholtes Bounds-Wachstum selbst über `maxObjects` wächst) — das hätte eine zweite, räumlich
überlappende Kind-Generation über die erste gelegt. Gefixt mit einem einfachen
`if (0 < this.children.length) return;`-Guard am Anfang von `_subdivide()`.

**Bekannter Trade-off:** Die Fallback-Liste bietet für wiederholt weit-außerhalb-spawnende Objekte
keine eigene räumliche Unterteilung (linearer Scan bei jeder Query). Ein "echtes" dynamisches
Wachstum (neue, doppelt so große Root anlegen, alte Root als Sub-Oktant einhängen) würde das lösen,
ist aber eine deutlich größere strukturelle Änderung (Pooling/Depth-Bookkeeping beim Umhängen
bestehender Kinder) und wurde bewusst nicht im Rahmen dieses Bugfixes umgesetzt — Korrektheit war
das Ziel, nicht optimale Performance für diesen Randfall.

### 8. ✅ `src/core/Object3D.ts:130` — `computeBounds()` fehlt der OBB-Zweig
`computeBounds()` unterscheidet nur `BoundingType.BOX` und `BoundingType.SPHERE`; für
`BoundingType.OBB` gibt es keinen Zweig, sodass `this.bounds` dauerhaft `undefined` bleibt.

**Szenario:** Jede `Geometry.getBoundingVolume()`-Implementierung, die ein OBB liefert (ein
vollwertiges, von `PhysicsSystem`/`Collision.ts` für OBB-OBB-Paare konsumiertes Enum-Mitglied),
lässt die Weltbounds des Objekts für immer `undefined` — es fällt still aus
Physik-Collider-Sammlung, Octree-Insertion und korrektem Frustum-Culling heraus. Dieselbe Lücke
lässt `Raycaster.intersectObjects()` (`src/physix/Raycaster.ts:71`) solche Objekte beim Picking
überspringen.

**Fix:** OBB-Zweig in `computeBounds()` ergänzt (Kopie via `constructor()`, dann
`halfExtents.copyFrom(...)` + `transform(worldMatrix)`, analog zu Box/Sphere).

**Zusätzlich entdeckt & mitgefixt:** `BoundingBox.containsVolume()` (`src/physix/BoundingBox.ts:168`)
hatte für `other.type === BoundingType.OBB` **keinen Zweig und gab immer `false` zurück** — ein
bislang durch Finding #8 maskierter Folgefehler. Ohne diesen Fix hätte jedes OBB-gebundene Objekt
nach der Reparatur von #8 zwar endlich `bounds` bekommen, wäre aber trotzdem nie in einen Octree
eingefügt worden (auch nicht durch den #7-Fix, da `containsVolume` unabhängig von der Bounds-Größe
`false` liefert). Fix: konservative Sphere-Approximation über `getBroadRadius()`, inline dupliziert
statt über `containsSphere()` delegiert, um weder einen unsicheren Cast noch eine
Pro-Frame-Allokation (`new BoundingSphere(...)`) auf dem Octree-Rebuild-Pfad einzuführen — mit
Kommentar im Code begründet.

## Memory-Leaks

### 9. ✅ `src/core/Object3D.ts:65` — `remove()` versickert GPU-Ressourcen
`remove()` entfernt ein Kind aus dem Szenengraph, reiht es aber nie in `Scene._pendingRemovals`
ein, wodurch seine GPU-Ressourcen nie freigegeben werden.

**Szenario:** Code, der direkt `parent.remove(child)` statt `scene.remove(child)` aufruft (z. B.
ein fallengelassenes Item), entfernt das Objekt korrekt aus dem Graph, leakt aber dauerhaft
Geometry-Buffer, Texturen und Programm-/Pipeline-Cache-Einträge in allen drei Renderern, da nur
`Scene.remove()` `_pendingRemovals` befüllt.

**Fix:** `Object3D` bekommt ein `pendingRemovalSink`-Callback, das `Scene` einmalig auf ihrem
versteckten `root`-Objekt setzt. `remove()` läuft nun über `_detach()` (reines Abkoppeln) +
`_notifyRemoved()` (läuft den Parent-Chain hoch bis zum Root und ruft dessen Sink), sodass jeder
`irgendein.remove(child)`-Aufruf innerhalb einer Szene korrekt meldet — unabhängig davon, wie tief
`irgendein` im Baum sitzt. Wichtig: Reparenting via `add()` nutzt weiterhin `_detach()` **ohne**
Notify, damit ein Objekt, das nur den Parent wechselt (z. B. innerhalb derselben Szene), nicht
fälschlich als "verworfen" behandelt und seine GPU-Ressourcen live freigegeben werden. `Scene.remove()`
delegiert jetzt komplett an diesen Mechanismus (keine doppelte Sammlung mehr).

### 10. ✅ `src/renderers/WebGL1/WebGL1Renderer.ts:415` — RenderTarget-Resize leakt Textur + Renderbuffer
Bei RenderTarget-Resize wird die alte Farb-`WebGLTexture` in `_texCache` ohne `gl.deleteTexture`
überschrieben, und das bei Zeile 446 erzeugte Depth-`WebGLRenderbuffer` wird nirgends gespeichert
und ist daher nie löschbar.

**Szenario:** Jede WebGL1-App mit einem größenveränderlichen Offscreen-RenderTarget (z. B.
Spiegel-/Portal-Fläche) leakt pro Resize eine `WebGLTexture` und dauerhaft ein
`WebGLRenderbuffer`, da `destroy()` (Zeilen 998–1017) nur `_texCache`/`_renderTargetFbos`
durchläuft.

**Fix:** Neue Map `_renderTargetDepthBuffers` trackt den Renderbuffer pro RenderTarget. Vor dem
Neuanlegen (Resize-Pfad) werden jetzt sowohl die alte Textur als auch der alte Renderbuffer explizit
gelöscht; `destroy()` iteriert zusätzlich über `_renderTargetDepthBuffers`.

## Weitere Findings (kleinerer Blast-Radius) — alle gefixt

- ✅ **`src/renderers/WebGL1/WebGL1Renderer.ts:883`** — `_getOrCreateMesh` behandelte `needsUpdate`
  nicht. **Fix:** identisches Pattern wie in `WebGL2Renderer` übernommen (`mesh.update(geo)` +
  `geo.needsUpdate = false`), da `Mesh` renderer-agnostisch ist.
- ✅ **`src/physix/Raycaster.ts:43`** — `setFromCamera` nahm implizit eine perspektivische Kamera an.
  **Fix:** Ray wird jetzt aus zwei entprojizierten Punkten (Near- und Far-Plane derselben
  Bildschirmkoordinate) abgeleitet statt `camera.position` als Ursprung zu nehmen — für Perspektive
  identisch zum alten Ergebnis (Near-Punkt liegt kolinear zur Kameraposition auf diesem Strahl),
  für Orthografie aber jetzt korrekt (parallele Strahlen konvergieren nicht in der Kameraposition).
- ✅ **`src/loaders/AssetManager.ts:110`** — Race-Window im Load-Tracking: `_activeLoaders` war nur
  nach der rohen `url` geschlüsselt, wodurch zwei gleichzeitige, aber unterschiedlich gecachte
  Anfragen für dieselbe URL (z. B. `loadImage(url, flipY:false)` + `loadImage(url, flipY:true)`,
  oder `loadImage(url)` + `loadBinary(url)`) sich einen Eintrag teilten — wer zuerst fertig wurde,
  löschte ihn per `_checkCompletion`, während die andere Anfrage noch lief, was `onLoaded()`/
  `isLoaded` verfrüht "fertig" melden ließ. **Fix:** `_fetchWithProgress` bekommt einen expliziten
  `trackingKey`-Parameter; `loadImage` übergibt seinen (flipY-einschließenden) `cacheKey`,
  `loadText`/`loadJson`/`loadBinary`/`streamBinary` bekommen je ein eigenes Namensraum-Präfix
  (`text:`/`json:`/`binary:`/`stream:`).
- ✅ **`src/core/Scene.ts:181`** — `_updateBehaviorsRecursive` iterierte vorwärts über eine Liste,
  die sich selbst entfernende Behaviors per `splice` verändern können, wodurch das nächste Behavior
  übersprungen wurde. **Fix:** nach jedem `update()`-Aufruf wird geprüft, ob an Index `i` noch
  dasselbe Behavior-Objekt steht; falls nicht (weil `splice` das nächste Element nach vorne
  gerückt hat), wird `i` dekrementiert, damit es im nächsten Schleifendurchlauf erneut geprüft wird.
  Bewusst *keine* Rückwärts-Iteration gewählt, da das die Attach-Reihenfolge für alle (nicht nur
  selbst-entfernende) Behaviors umgekehrt hätte — mehrere Showcases kombinieren reihenfolge-
  abhängige Behaviors (z. B. Bewegung vor `LookAt`).
- ✅ **`src/core/DeviceCaps.ts:46`** — Der im Code kommentierte Bug beim Zusammenführen von
  Texture-Unit-Limits war nur für WebGPU behoben (eigenes `WEBGPU_MAX_SAMPLED_TEXTURES_PER_STAGE`),
  nicht für WebGL1/WebGL2, die sich weiterhin ein `Math.max()`-gemergtes `MAX_TEXTURE_IMAGE_UNITS`
  teilten. **Fix:** neue, getrennte `DeviceLimit`-Werte `WEBGL1_MAX_TEXTURE_IMAGE_UNITS` /
  `WEBGL2_MAX_TEXTURE_IMAGE_UNITS` (inkl. spec-Minimum 8 bzw. 16 in `getGuaranteedMinimum()`); alle
  tatsächlichen Bounds-Checks in `WebGL1Renderer`/`WebGL2Renderer` (Material-, Spot- und
  Directional-Shadow-Texturbindung) nutzen jetzt ihr renderer-eigenes Limit statt des gemergten
  Werts. Die generische `MAX_TEXTURE_IMAGE_UNITS` bleibt für rein informative Anzeigen
  (`GadgetInspector`, `SmallWorld`-Debug-Panel) unverändert bestehen.

## Priorisierung

Alle 15 Findings (#1–#10 sowie die 5 kleineren) sind jetzt gefixt, verifiziert via
`npx tsc --noEmit` (sauber) und `npx vitest run` (395/395 Tests grün, inkl. eines aktualisierten
Octree-Tests, der zuvor das alte, fehlerhafte Verhalten erwartet hatte).

**Noch nicht abgedeckt von dieser Review:** das Top-Level-Verzeichnis `showcases/` (39 Dateien,
~12.300 LOC) — die Review lief nur über `src/`.

---

# Clean-Code-/Simplification-Passe (`/simplify`) — 2026-08-22

Vier unabhängige Agenten (Reuse, Simplification, Efficiency, Altitude) haben die gesamte `src/`-Codebasis
untersucht — diesmal explizit nicht auf Korrektheit, sondern auf Redundanz, unnötige Komplexität,
Hot-Path-Allokationen und Abstraktionsebene. 34 Rohfunde, dedupliziert und trianguliert (mehrere
Funde trafen dieselbe Stelle aus unterschiedlichen Blickwinkeln). Priorität laut Vorgabe: **Performance
und Zero-Alloc vor Lesbarkeit**, wo beides in Konflikt steht.

## Gefixt

- **Tote `transparentMap`** in `WebGLMainPass.ts` (von Simplification *und* Efficiency unabhängig
  gemeldet) — wurde befüllt, aber nie gelesen. Ersatzlos entfernt; zusätzlich die Pro-Objekt-Batch-
  Allokation (`{shaderId, topology, matUuid, objects: [obj]}` pro transparentem Objekt/Frame) durch
  ein wiederverwendetes Batch-Objekt ersetzt — gleiches Pattern in `MainRenderPass.ts` (WebGPU) und
  `WebGPURenderer._renderBatch` (Instanced/Standard-Split-Arrays) angewendet.
- **`Collision.ts` Sweep-Funktionen** (`sweepSphereBox`, `sweepSphereObb`) allozierten bis zu 6
  Objekte pro Aufruf (`new Vector3D`/`new BoundingBox`/`new Ray`) — läuft bis zu `maxSubSteps`-mal
  pro Frame pro CCD-Kandidat. Auf lazy-initialisierte, wiederverwendete Scratch-Instanzen umgestellt.
  **Wichtig:** Musste lazy (`??=` bei erstem Aufruf) statt als Klassenfeld-Initializer geschrieben
  werden, da `Collision.ts` und `BoundingBox.ts` sich gegenseitig importieren — ein Feld-Initializer
  mit `new BoundingBox(...)` lief teils vor Abschluss des zirkulären Imports und crashte
  ("BoundingBox is not a constructor") je nachdem, welche Datei zuerst geladen wurde.
- **`PhysicsSystem._resolveCCD`**: `new BoundingBox(sweptMin, sweptMax)` pro CCD-Kandidat pro
  Substep durch wiederverwendetes `_ccdScratchBox`-Feld ersetzt. Da `Collision.test()`s Broadphase
  `.center` direkt liest, wird `.center` bei jeder Wiederverwendung explizit mitaktualisiert (anders
  als bei `Collision.ts`s rein Ray-genutztem Scratch, wo `.center` nie gelesen wird).
- **`resolveObbObb`**: die dreifach kopierte "prüfe Achse, aktualisiere minOverlap/best*"-Logik in
  `_considerAxis()` extrahiert. Bewusst über statische Scratch-Felder (`_obbSatMinOverlap` etc.)
  statt eines pro-Aufruf-State-Objekts, um keine neue Allokation auf diesem Physik-Hot-Path
  einzuführen.
- **`CascadedShadowPassGPU.ts`**: Pro-Kaskade-Light-Data-Objektliteral (3 Arrays + 2 `Color` +
  1 `Vector3D`, ~6 Allokationen × Kaskaden-Anzahl × Frame) durch lazy-initialisiertes Scratch-Objekt
  ersetzt (gleicher zirkulärer-Import-Fallstrick wie bei `Collision.ts`, hier mit `Color` statt
  `BoundingBox` — ebenfalls auf lazy-init umgestellt).
- **`PlanarReflectionNode.ts`** / **`DynamicReflectionProbe.ts`**: tote Instanzfelder
  (`_planeNormal`/`_planeConstant`, nie außerhalb der eigenen Methode gelesen) zu MathPool-Locals
  gemacht; mehrere `new Vector3D(...)` pro Frame durch `MathPool.acquireVector()`/`.set()` ersetzt;
  handgerollte `Math.min(6, Math.max(1, ...))`-Clamps durch `MathUtils.clamp` ersetzt.
- **`SpatialHash.ts`**: identische 6-Zeilen-Zellbereichsberechnung aus `insert()`/`query()` in
  `_cellRange()` extrahiert.
- **`FrustumCuller.ts`**: die zwei fast identischen `staticOctree`/`dynamicOctree`-Query-Blöcke zu
  einer Schleife über `[scene.staticOctree, scene.dynamicOctree]` zusammengeführt.
- **`CollisionResolution.ts`**: `0 === obj.bounds.type /* BoundingType.SPHERE */` (Magic Number mit
  Erklärkommentar) durch `BoundingType.SPHERE === obj.bounds.type` ersetzt.
- **`InteractionManager.ts`**: zwei Early-Return-Zweige mit identischem Rumpf (Pointer-Lock vs.
  außerhalb Canvas) zu einer zusammengeführten Bedingung verschmolzen.
- **`ibl-gen.ts`**: 14× wiederholtes `Math.min(255, Math.max(0, x))` durch `MathUtils.clamp(x, 0, 255)`
  ersetzt (Regex-basierte Ersetzung, danach manuell verifiziert).
- **Hand-gerollte Clamps** in `AudioSystem.ts` (4×), `Input.ts`, `FPSController.ts`,
  `FlickerBehavior.ts` durch `MathUtils.clamp` ersetzt, statt project-weit verstreuter
  `Math.max(min, Math.min(max, v))`/`Math.min(max, Math.max(min, v))`-Varianten.
- **`CollisionVisualizer.ts`** duplizierte die `"debug_"`-Namenspräfix-Konvention aus `Scene.ts`
  eigenständig. Zentralisiert als `Scene.isDebugObject(obj)`, von beiden Stellen genutzt.
- **Bonus, aus Review-Feedback entstanden:** `Octree._subdivide()` gegen erneutes Unterteilen eines
  bereits unterteilten Knotens abgesichert (siehe Nachtrag bei Finding #7 oben).

Alle Fixes verifiziert via `npx tsc --noEmit` (sauber), `npx vitest run` (395/395 grün) und
`npm run build:lib` (erfolgreich).

## Bewusst übersprungen (dokumentiert, nicht angewendet)

Diese Funde sind real, aber ihr Fix hätte entweder produktives Laufzeitverhalten geändert, einen
deutlich größeren Umbau erfordert, oder ein bestehendes, schon divergierendes Verhalten "repariert"
ohne dediziertes Review — alles außerhalb dessen, was ein automatisierter Batch-Fix verantworten
sollte:

- **Zwei parallele FPS-Controller-Implementierungen** (`core/behaviors/FirstPersonController.ts`
  vs. `core/controllers/FPSController.ts`), inkl. 4× dupliziertem Camera/Object3D-Duck-Typing-Check
  (`"updateProjectionMatrix" in this.target`). Zusammenlegen wäre der richtige Schritt, aber ein
  Eingriff in produktiven Gameplay-Code mit Breiten-Wirkung über mehrere Showcases.
- **WebGPU-Postprocessing-Pipeline** (`WebGPURenderer.ts`) hardcoded TAA/Bloom/HBAO/Motion-Trail
  statt einer generischen `PostProcessPass`-Kette — architektonisch der richtige Fix, aber ein
  substanzielles Redesign.
- **9-armige `BoundingType`-Dispatch-Kette** dreifach dupliziert in `Collision.test()`,
  `PhysicsSystem._resolveCollisions()` und (konzeptionell) den `resolve*`-Aufrufen. Eine
  Lookup-Tabelle wäre sauberer, aber ein Eingriff in denselben Physik-Code, in dem heute bereits
  mehrere Korrektheits-Bugs gefixt wurden — zusätzliches Risiko ohne dediziertes Re-Testing nicht
  gerechtfertigt.
- **`EnemyBehavior.ts`** reimplementiert planare Abstandsprüfung statt der vorhandenen
  `ProximitySensorBehavior` zu nutzen — Ersetzen hätte das (vermutlich gameplay-getunte)
  Detection-Range-Verhalten verändern können.
- **`SynthSFX.ts`/`AudioSystem.ts`** duplizieren die Panner-Setup-Logik, unterscheiden sich aber
  bereits leise im `rolloffFactor`-Default — Vereinheitlichen hätte eines der beiden Verhalten
  ändern müssen, ohne dass klar ist, welches "richtig" ist.
- **`CascadedShadowPassGPU`/`SpotShadowPassGPU`** duplizieren den Dummy-View-Swap für das
  WebGPU-Read/Write-Usage-Workaround — ein subtiler WebGPU-Validierungs-Kniff, den ich nicht ohne
  dedizierten GPU-Test in beiden Passes gleichzeitig anfassen wollte.
- **Kamera-Strategien** (`SmoothStrategy`/`StiffStrategy`/`HybridSyncStrategy`) triplizieren
  Kugel-↔-Kartesisch-Konvertierung — laut Agent "near byte-identical", nicht exakt identisch;
  Vereinheitlichen ohne genaue Diff-Prüfung pro Strategie hätte Regressionsrisiko für die
  Kamera-Bewegung in mehreren Showcases.
- **`Matrix4.extractScale`**, **`Object3D.traverse()`**, **`WebGLShadowPass`-Unsafe-Casts** und
  **`ClusterGrid.lightClusterCoverage`-Out-Param**: reale, aber kleinere Funde, aus Zeit-/
  Umfangsgründen nicht in diesem Durchgang umgesetzt.
