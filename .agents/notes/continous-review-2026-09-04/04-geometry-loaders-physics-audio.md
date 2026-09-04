# Review: Geometry, Loaders, Physics, Audio (`src/geometry`, `src/loaders`, `src/interfaces/LoaderOptions.ts`, `src/physix/OBB.ts`, `src/physix/PhysicsSystem.ts`, `src/audio`)

**Reviewer:** Agent D (Fortsetzung) · **Scope:** Änderungen `1d70c608..HEAD` (letzte 48h) · **Status:** ✅ alle 5 kritischen Funde aus dem Review vom 2026-09-03 verifiziert korrekt und vollständig behoben, keine neuen kritischen Regressionen gefunden

Legende: 🔴 kritisch (Bug/Korrektheit) · 🟠 fragil/Architektur-Risiko · 🟡 Stil/Cleanup/tote Fläche · 🟢 Test-Lücke · ✅ positiv/verifiziert

---

## Verifikation der 5 vorherigen kritischen Funde

### ✅ [VERIFIZIERT] Fund 1 — Resting-Contact-Oszillation (`PhysicsSystem.ts`)

**Datei:** `src/physix/PhysicsSystem.ts:308`

```diff
-const correction = depth / totalInvMass + 0.005;
+const correction = depth / totalInvMass;
```

Der künstliche `+0.005`-Bias wurde ersatzlos entfernt — keine Slop/Baumgarte-Umformulierung, sondern
schlicht die exakte volle Positionskorrektur ohne Überkorrektur. Nachgerechnet: `correction * invMassA`
und `correction * invMassB` summieren sich exakt zu `depth` (proportional nach inverser Masse verteilt),
d.h. die Durchdringung wird pro Substep exakt aufgehoben, nicht überkompensiert.

**Verifiziert** mit dem mitgelieferten `tests/physix/PhysicsRestingContact.test.ts` (300 Frames, 60Hz) —
grün. Zusätzlich mit einem eigenen Wegwerf-Test über **3000 Frames** (≈50 Simulationssekunden)
laufen lassen: die Y-Position der ruhenden Kugel stabilisiert sich innerhalb von `< 1e-6` über die
letzten 100 Frames — keine messbare Restoszillation mehr, auch nicht im Langzeitlauf. Fund vollständig
und korrekt behoben.

---

### ✅ [VERIFIZIERT] Fund 2 — `Object3D.computeBounds()` verwirft manuell zugewiesene OBB / `OBB.transform()` ignoriert Skalierung

**Dateien:** `src/core/Object3D.ts:207-268` (außerhalb des eigentlichen Scopes, aber Gegenprobe nötig), `src/physix/OBB.ts:76-119`

`OBB.transform()` extrahiert jetzt Skalierung aus der Weltmatrix (`Math.hypot(e[0],e[1],e[2])` etc.),
normalisiert die Achsen korrekt gegen einen `0.00001`-Epsilon-Fallback (statt bei entarteter Skala
`NaN`-Achsen zu erzeugen) und multipliziert `halfExtents` mit der extrahierten Skala:

```ts
this.halfExtents.x *= sx;
this.halfExtents.y *= sy;
this.halfExtents.z *= sz;
```

**Wichtiger Seiteneffekt geprüft:** Diese Multiplikation ist **in-place und kumulativ** — ein zweiter
Aufruf von `transform()` auf demselben `OBB`, ohne `halfExtents` zwischendurch auf die lokalen
Ausgangswerte zurückzusetzen, würde die Skalierung exponentiell aufschaukeln (Frame 2: `sx²`, Frame 3:
`sx³`, ...). Das ist ein latentes API-Fragilitätsrisiko (siehe 🟡 unten), aber **kein aktiver Bug**:
Der einzige produktive Aufrufer, `Object3D.computeBounds()` (`Object3D.ts:251-265`), setzt
`b.halfExtents` bei **jedem** Aufruf explizit aus den unskalierten lokalen Geometrie-Bounds zurück,
bevor `transform()` aufgerufen wird — pro Frame/Substep gibt es also immer einen frischen, korrekten
Ausgangswert. `grep -rn "\.transform("` über den gesamten `src/`-Baum bestätigt: kein anderer Call-Site
ruft `OBB.transform()` direkt auf.

**Verifiziert** mit `tests/physix/OBBScaleAndGeometryBounds.test.ts` (beide Tests grün):
- `OBB.transform()` skaliert `halfExtents` korrekt entlang aller 3 Achsen (1,2,3 → 2,6,12 bei Skala 2,3,4).
- Eine manuell zugewiesene `OBB`-Instanz auf einem `Object3D` mit `Cube`-Geometrie bleibt nach
  `computeBounds()` eine `OBB` (wird nicht mehr durch eine `BoundingBox` ersetzt) — **und** ein
  zweiter `computeBounds()`-Aufruf im selben Frame-Zyklus liefert weiterhin (3,4,5), nicht (9,16,25)
  — die Kumulationsgefahr manifestiert sich im echten Nutzungspfad also nicht.

Fund vollständig behoben, beide Teilprobleme (OBB-Typ-Verlust + fehlende Skalen-Extraktion) korrekt
adressiert.

---

### ✅ [VERIFIZIERT] Fund 3 — Systemisches NaN bei `radius=0`/`segments=0`

**Dateien:** alle 15 Geometrie-Klassen im Scope (`Capsule`, `Circle`, `Cube`, `Cylinder`, `Disk`,
`ExtrudeGeometry`, `Gear`, `Ground`, `Octahedron`, `Plane`, `Pyramid`, `Sphere`, `Terrain`, `Torus`,
`Tube`)

Konsistentes Muster über alle Klassen geprüft: Segmentanzahlen werden im Konstruktor **vor**
`generateGeometryData()` mit `Math.max(N, Math.floor(x))` geclampt (`N` = 1 für lineare Segmente wie
`widthSegments`, 3 für radiale/Kreis-Segmente, wo `< 3` geometrisch keinen Sinn ergibt), Radien/Größen
mit `Math.max(0, x)`. `Sphere.ts` normalisiert zusätzlich per explizitem `invRadius`-Guard
(`radius > 0.000001 ? 1/radius : 0`) mit Fallback-Normale `(0,1,0)` statt der vorherigen direkten
`pos/radius`-Division. `ExtrudeGeometry.ts` guardet die beiden Distanz-Divisionen für UV-Berechnung
(`totalDist > 0 ? ... : 0`). `Gear.ts` clamped zusätzlich `holeRadius` relativ zu `innerRadius`
(`Math.min(clampedInnerRadius * 0.9, holeRadius)`), verhindert also auch degenerierte
Loch-größer-als-Zahnrad-Konfigurationen.

Guard-Position ist in **allen** Dateien korrekt **vor** der problematischen Division/dem Loop platziert
(Konstruktor-Ebene, nicht erst in `generateGeometryData()`), sodass abgeleitete Felder wie
`this.radius`/`this.xSegments` bereits geclampt sind, wenn sie später verwendet werden.

**Testabdeckung geprüft** (`tests/geometry/ParametricGeometryNaNGuards.test.ts`): deckt 14 von 15
Scope-Klassen ab (Sphere, Torus, Cylinder, Cone [nicht im Scope, aber mitgetestet], Capsule, Tube,
Plane, Ground, Pyramid, Circle, Disk, Cube, Gear, Octahedron) — **Terrain fehlt komplett**, und
`ExtrudeGeometry` wird nur indirekt über `Gear` mit geclampten Parametern getestet, nie mit
`toothHeight=0`/entarteten Rohformen direkt. Das ist eine echte Test-Lücke (siehe 🟢 unten), aber
**kein funktionaler Fehler** — mit einem eigenen Wegwerf-Test verifiziert:
`Terrain.fromHeightData({ heightData: Float32Array([0.5]), heightmapResolution: 1,
meshWidthSegments: 0, meshDepthSegments: 0 })` erzeugt keine NaN-Vertices (die Segment-Clamps
(`Math.max(1, ...)`) in `Terrain.ts:121-122` reichen aus, da `heightmapResolution` selbst nur als
Multiplikator/Index verwendet wird, nie als Divisor).

Fund vollständig und korrekt behoben, Testlücke bei Terrain/ExtrudeGeometry siehe unten.

---

### ✅ [VERIFIZIERT] Fund 4 — Loader nutzten weiterhin den `AssetManager`-Singleton

**Dateien:** `src/interfaces/LoaderOptions.ts`, `src/loaders/AbstractLoader.ts`, `GltfLoader.ts`,
`ObjLoader.ts`, `ImageLoader.ts`, `MtlLoader.ts`, `TextLoader.ts`, `SkyboxLoader.ts`,
`BinaryStreamLoader.ts`, `gltf/GltfMaterialParser.ts`

`LoaderOptions.assetManager?: AssetManager` wurde ergänzt; `AbstractLoader` hält jetzt
`protected _assetManager: AssetManager`, Default ist eine **frische private Instanz**
(`options.assetManager ?? new AssetManager()`), niemals der deprecated Singleton.

`grep -rn "AssetManager\.\(loadJson\|loadBinary\|loadText\|loadImage\|streamBinary\|setBaseUrl\|setHeader\)"`
über `src/loaders/` liefert **keinen einzigen Treffer mehr** — jeder Loader ruft ausschließlich
`this._assetManager.loadX(...)` auf. `GltfMaterialParser.parseMaterial`/`resolveTexture` nehmen jetzt
einen `assetManager: AssetManager`-Parameter entgegen und reichen ihn konsistent durch alle 5
Textur-Resolving-Aufrufe (baseColor, metallicRoughness, normal, occlusion, emissive). `ObjLoader`
reicht seine Instanz explizit an die intern konstruierte `MtlLoader` weiter
(`new MtlLoader({ basePath: folderPath, assetManager: this._assetManager })`) — die Cache-/
Header-/BaseUrl-Kette bleibt also über die gesamte OBJ→MTL→Textur-Kaskade durchgängig instanzbasiert.

Der deprecated statische Singleton-Pfad (`AssetManager._sharedDefault`) existiert unverändert weiter
für Rückwärtskompatibilität (Removal-Target v1.0.0 laut Doku), wird aber von keinem Loader in diesem
Scope mehr erreicht.

**Verifiziert** mit `tests/loaders/LoaderAssetManagerInjection.test.ts` (3 Tests, grün): (1) jede
Loader-Instanz bekommt standardmäßig eine eigene private `AssetManager`-Instanz, nicht dieselbe wie
eine zweite Instanz; (2) ein injizierter `AssetManager` (inkl. `setBaseUrl`/`setHeader`) wird
tatsächlich für den Fetch verwendet; (3) `ObjLoader` reicht seine Instanz nachweislich (per
`fetchSpy`-Header-Check) an die intern erzeugte `MtlLoader` weiter. Zusätzlich
`tests/loaders/gltf/GltfMaterialParser.test.ts` grün (PBR-Parsing inkl. `applyClamp`).

Fund vollständig und sauber behoben — keine verbliebenen Loader mit Singleton-Fallback im Scope.

**Cross-Scope-Hinweis (nicht Teil dieses Scopes, aber auffällig):** `src/core/textures/Texture.ts:142`,
`CubeTexture.ts:43,50` und `TextureArray.ts:37` rufen weiterhin `AssetManager.loadImage(...)` **statisch**
auf — die Instanz-Migration wurde bislang nur bis zur Loader-Schicht durchgezogen, nicht bis zu den
direkten Textur-Konsumenten. Für Multi-Engine-Betrieb (mehrere `SmallWorld`-Instanzen pro Seite) bleibt
das ein Leck derselben Klasse wie der behobene Fund 4, nur eine Ebene tiefer im Aufrufgraphen. Da
`src/core/textures/` außerhalb des zugewiesenen Scopes liegt, hier nur als Hinweis für den zuständigen
Reviewer dokumentiert, nicht als eigener Fund bewertet.

---

### ✅ [VERIFIZIERT] Fund 5 — `SynthSFX.startDrone()`/`startFire()` ohne Stop-Mechanismus

**Dateien:** `src/audio/SynthSFX.ts`, `src/audio/AudioSystem.ts`

Beide Methoden geben jetzt ein `SoundHandle` (`{ stop(): void }`) zurück. `stop()` ist idempotent
(`let stopped = false` Guard), stoppt jeden erzeugten `OscillatorNode`/`AudioBufferSourceNode`
(mit `try/catch` gegen bereits beendete Nodes) und disconnected anschließend den kompletten Graphen
(alle Gains/Filter/Panner/LFOs). `AudioSystem.startDrone()`/`startFire()` wrappen das
`SynthSFX`-Handle zusätzlich über `_trackEndlessSound()` in ein `_activeEndlessSounds`-Set, sodass
`AudioSystem.dispose()` **jeden noch laufenden** Drone/Fire-Graphen automatisch stoppt — selbst wenn
der Aufrufer sein Handle nie hält oder nie `.stop()` ruft.

**Aufrufer-Check:** `yad/App.ts:249` (`audio.startDrone()`), `neon-labyrinth/App.ts:390`
(`this.audio.startDrone()`), `yad/core/LevelBuilder.ts:252` (`config.audio.startFire(...)`) —
**keiner** dieser drei Call-Sites hält das zurückgegebene Handle oder ruft `.stop()` explizit auf.
Das ist bei der aktuellen App-Architektur unkritisch: `LevelBuilder` hat keine
Unload/Reload-Semantik (ein Level lebt so lange wie die App-Instanz), und `SmallWorld.dispose()`
(`src/core/SmallWorld.ts:400`) ruft `this.audio.dispose()` beim Engine-Teardown zuverlässig auf,
wodurch alle vergessenen Handles trotzdem sauber gestoppt werden. Sollte `LevelBuilder` künftig
Mid-Session-Level-Wechsel (z.B. mehrere Level pro App-Instanz) unterstützen, müssten
`startFire()`-Handles pro Fackel individuell verfolgt und beim Entfernen der Fackel gestoppt werden —
aktuell besteht dafür kein Bedarf, da kein Aufrufer das tut.

**Verifiziert** mit `tests/audio/AudioSystem.test.ts` (u.a. `describe("endless sound lifecycle
(startDrone/startFire leak fix)")`, alle Tests grün): Handle stoppt alle Oszillatoren/Quellen genau
einmal, ist idempotent bei doppeltem `stop()`, und `dispose()` räumt sowohl vergessene als auch
bereits manuell gestoppte Handles korrekt (ohne Doppel-Stop) auf.

Fund vollständig behoben.

---

## Neue Funde in diesem Zeitfenster

### ✅ `GeometryWorkerProcessor.ts` (225 Zeilen) korrekt entfernt — keine Restreferenzen

**Datei:** `src/loaders/GeometryWorkerProcessor.ts` (gelöscht), `src/loaders/index.ts`

Der vorherige Review stufte diese Klasse als 🟡 tote/nie verdrahtete API-Fläche ein (kein Worker,
duplizierte `AbstractGeometry`-Formeln, kein produktiver Aufrufer). Die Löschung in Commit `04f63322`
entfernt die Datei, ihren Export aus `src/loaders/index.ts` und passt `tests/loaders/BinaryStreamLoader.test.ts`
an (entfernt den zugehörigen Test-Case). `grep -rn "GeometryWorkerProcessor"` über den gesamten
Working Tree (inkl. `dist`, Showcases, Apps) liefert **keinen einzigen Treffer** mehr — auch keine
String-basierte Worker-URL-Referenz (`grep -rn "new Worker"` zeigt nur `src/core/threading/ThreadPool.ts`,
unabhängig von dieser Klasse). Die Funktionalität war laut vorherigem Review nie in Produktion verdrahtet
(kein Loader rief sie auf), daher ist hier keine Funktionalität verloren gegangen. Sauberer, vollständiger
Cleanup.

### 🟢 Test-Lücke: `ParametricGeometryNaNGuards.test.ts` deckt `Terrain` gar nicht und `ExtrudeGeometry` nur indirekt ab

**Datei:** `tests/geometry/ParametricGeometryNaNGuards.test.ts`

Wie oben unter Fund 3 verifiziert, ist der Terrain-Fix korrekt, aber es existiert kein Test dafür in der
NaN-Guard-Suite (weder in dieser Datei noch anderswo im Repo, geprüft per `grep -rln "Terrain" tests/geometry/`).
Ebenso wird `ExtrudeGeometry` nur über `Gear`s bereits geclampte Parameter erreicht, nie mit einer direkt
konstruierten entarteten `Shape`/`innerShape` (z.B. eine Shape mit 0 oder 1 Punkten, die die
`totalDist`-Guards in `ExtrudeGeometry.ts:181,219` auf die Probe stellen würde). Da beide Fixes bei
manueller Verifikation tatsächlich korrekt greifen, ist das nur eine Lückenbewertung, kein Bug — aber
bei zukünftigen Refactorings dieser beiden Klassen bietet die bestehende Suite keinen Schutz vor einer
Regression.

**Fix-Richtung:** Zwei zusätzliche `it()`-Blöcke in `ParametricGeometryNaNGuards.test.ts`: einen für
`Terrain.fromHeightData({ heightData: new Float32Array([0]), heightmapResolution: 1, meshWidthSegments: 0, meshDepthSegments: 0 })`,
einen für `new ExtrudeGeometry({ shape: [], innerShape: [], depth: 0 })` (oder eine 1-Punkt-Shape).

### 🟡 `OBB.transform()` mutiert `halfExtents` multiplikativ in-place — fragile API, korrekt nur weil der einzige Aufrufer diszipliniert zurücksetzt

**Datei:** `src/physix/OBB.ts:76-101`

Wie unter Fund 2 dokumentiert: `transform()` multipliziert die aktuellen `this.halfExtents`-Werte mit
der aus der übergebenen Matrix extrahierten Skala, statt von separat gehaltenen lokalen
Referenzwerten auszugehen. Das ist korrekt, solange `halfExtents` vor jedem Aufruf frisch aus den
lokalen Bounds gesetzt wird (wie es `Object3D.computeBounds()` tut) — aber es gibt in der Klasse
selbst keinen Schutz, keine Dokumentation dieser Voraussetzung und keinen zweiten "lokale
Ausgangswerte"-Zustand (anders als z.B. `BoundingBox`/`BoundingSphere`, die getrennte `min`/`max`
bzw. `center`/`radius` als Ziel einer `transform()`-Operation gegen eine unveränderte Quelle
verwenden — vgl. `Object3D.ts:242-243,247-249`, wo `lb`/`ls` explizit vor jedem `transform()`-Aufruf
in `b` kopiert werden). Ein zukünftiger Direktaufruf von `obb.transform(matA); obb.transform(matB);`
(z.B. in einem neuen Tool/Editor-Feature, das die OBB inkrementell nachführt, ohne
`Object3D.computeBounds()` zu durchlaufen) würde `halfExtents` unbemerkt kumulativ verzerren — kein
Fehler, keine Exception, nur eine langsam falsch werdende Kollisionshülle.

**Failure-Szenario:** Aktuell nicht auslösbar über den produktiven Code-Pfad (nur ein Aufrufer,
korrekt implementiert). Risiko besteht für künftige Erweiterungen, die `OBB` direkt (ohne den
`Object3D.computeBounds()`-Umweg) transformieren — z.B. ein Editor-Gizmo, der eine freistehende OBB
live nachführt.

**Fix-Richtung:** `OBB` um private `_localHalfExtents: Vector3D` erweitern (parallel zu `halfExtents`),
`transform()` immer von `_localHalfExtents * scale` statt `halfExtents *= scale` ausgehen lassen —
analog zum bereits etablierten `lb`/`b`-Muster bei `BoundingBox`/`BoundingSphere`. Kein Blocker, da
kein aktiver Bug, aber ein API-Vertrag, der leicht falsch verwendet werden kann.

### 🟡 `tests/loaders/BinaryStreamLoader.test.ts`: `beforeEach`-Reset auf statische `AssetManager`-Caches ist jetzt wirkungslose Altlast

**Datei:** `tests/loaders/BinaryStreamLoader.test.ts:6-10`

```ts
beforeEach(() => {
  // @ts-expect-error accessing private static cache for testing
  AssetManager._binaryCache = new Map();
  // @ts-expect-error accessing private static cache for testing
  AssetManager._activeLoaders = new Map();
});
```

Seit `BinaryStreamLoader.stream()` intern `options.assetManager ?? new AssetManager()` verwendet
(instanzbasiert, siehe Fund 4), greift der Test nie mehr auf die statischen Klassenfelder zu, die
hier zurückgesetzt werden — jeder Testlauf bekommt ohnehin eine frische `AssetManager`-Instanz mit
leeren Instanz-Caches. Der Reset ist nicht falsch (schadet nicht), aber tote Testinfrastruktur aus der
Vor-Migrations-Zeit, die den nächsten Leser fälschlich glauben lässt, hier würde noch ein
prozessweiter Zustand zurückgesetzt.

**Fix-Richtung:** `beforeEach`-Block ersatzlos entfernen. Sehr geringe Priorität.

---

## ✅ Positiv

- **Fix 1 (Resting Contact):** Über 3000 Frames (50s) stabil, keine messbare Restoszillation — sauberste
  der 5 Behebungen, keine Vorbehalte.
- **Fix 3 (NaN-Guards):** Konsistentes Clamp-Muster (`Math.max(N, Math.floor(x))` für Segmente,
  `Math.max(0, x)` für Radien/Größen) über alle 15 Geometrie-Klassen hinweg, immer auf
  Konstruktor-Ebene vor der Generierung platziert — keine Klasse vergessen, keine Inkonsistenz in der
  Guard-Position gefunden.
- **Fix 4 (AssetManager-Injection):** Die Migration wurde diesmal wirklich bis in jeden einzelnen
  Loader durchgezogen (inkl. der verschachtelten `ObjLoader → MtlLoader`-Kette und
  `GltfMaterialParser`s Textur-Resolving) — nicht nur die Instanz-API bereitgestellt, sondern auch
  tatsächlich verdrahtet. `grep` über den gesamten Loader-Scope bestätigt lückenlos keine
  verbliebenen statischen Aufrufe.
- **Fix 5 (Audio-Lifecycle):** Das zentrale `AudioSystem.dispose()`-Sicherheitsnetz (räumt auch von
  Aufrufern "vergessene" Handles auf) ist eine robustere Lösung als reines
  Jeder-Aufrufer-muss-selbst-aufräumen — funktioniert auch mit den drei existierenden Aufrufern, die
  ihr Handle allesamt nicht halten.
- **`GeometryWorkerProcessor`-Löschung:** Sauberer, vollständiger Cleanup einer bereits als tot
  identifizierten Fläche — keine Restreferenzen, kein Funktionsverlust.
- **`npx tsc --noEmit -p tsconfig.json`** läuft ohne Fehler über den gesamten Scope; kein `any` in
  den geänderten Dateien gefunden.
- Alle Testsuiten im Scope (`tests/geometry`, `tests/loaders`, `tests/physix`, `tests/audio`, 27
  Dateien / 155 Tests) laufen grün.
