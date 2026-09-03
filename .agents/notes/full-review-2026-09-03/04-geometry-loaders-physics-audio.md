# Review: Geometry, Loaders, Physics, Audio, Extensions, Utils (`src/geometry`, `src/loaders`, `src/physix`, `src/audio`, `src/extensions`, `src/utils`)

**Reviewer:** Agent D · **Status:** ⚠️ mit kritischen Funden fertig

Legende: 🔴 kritisch (Bug/Korrektheit) · 🟠 fragil/Architektur-Risiko · 🟡 Stil/Cleanup/tote Fläche · 🟢 Test-Lücke · ✅ positiv

---

## `src/physix/` — Sub-Stepping, Kollisionsauflösung, CCD

### ✅ [ERLEDIGT] Resting Contact oszilliert für immer (positionale Korrektur nie im Gleichgewicht)
*(Behoben 2026-09-03: `+ 0.005`-Überkorrektur in `PhysicsSystem.ts:308` entfernt; Positionskorrektur löst Durchdringung nun ohne künstlichen Bias auf; Unit-Tests in `tests/physix/PhysicsRestingContact.test.ts`.)*

**Datei:** `src/physix/PhysicsSystem.ts:308`

```ts
const correction = depth / totalInvMass + 0.005;
```

**Problem:** Die Baumgarte-artige Positionskorrektur addiert eine feste Konstante (`+0.005`) zur
exakten Durchdringungstiefe, statt (wie beim klassischen "Slop"-Pattern üblich) einen kleinen
Toleranzwert *abzuziehen* (`Math.max(depth - slop, 0)`). Damit wird ein ruhender Körper bei jedem
Substep um mehr als die tatsächliche Überlappung nach außen gedrückt — die Schwerkraft zieht ihn
im nächsten Substep wieder zurück in eine (neue, minimale) Überlappung, die wieder um `+0.005`
überkorrigiert wird. Das System erreicht nie ein Gleichgewicht, sondern oszilliert unendlich.

Per `git log -p` ist das keine versehentliche Regression, sondern bewusst eingebaut (Commit-Nachricht:
"Added a tiny epsilon (0.005) to counteract visual polygon intersection") — der erklärende Kommentar
dazu ist im aktuellen Code allerdings verlorengegangen (Zeile 308 hat keinen Kommentar mehr). Die
Intention (sichtbares Z-Fighting/Mesh-Interpenetration vermeiden) ist nachvollziehbar, aber die
Umsetzung ist zu grob: `+0.005` wird nicht als einmaliger Sicherheitsabstand, sondern als
kontinuierlicher Störterm auf jeden Substep angewandt, ohne Rücksicht darauf, ob der Körper bereits
ruht.

**Verifiziert** mit einem Wegwerf-Test (`tests/physix/_scratch_resting.test.ts`, nach Verifikation
wieder gelöscht): Kugel (r=1, restitution=0) auf statischem Boden fallen gelassen, 300 Frames bei
1/60s simuliert. Ab Frame ~60 (Aufprall) oszilliert die Y-Position für den Rest der Simulation
permanent zwischen `1.00233` und `1.00500`, die Y-Geschwindigkeit zwischen `-0.16023` und `0.00000` —
exakt alternierend, ohne jemals zu konvergieren:

```
last 30 Y:  1.00233, 1.00500, 1.00233, 1.00500, ... (endlos)
last 30 VY: -0.16023, 0.00000, -0.16023, 0.00000, ... (endlos)
```

**Failure-Szenario:** Jeder ruhende/gestapelte Körper in der Engine (Kisten, Charaktere, Requisiten)
vibriert für immer minimal statt zur Ruhe zu kommen. Bei sichtbaren Objekten mit feiner
Post-Processing-Pipeline (Bloom/TAA) könnte das als leichtes Zittern/Flackern wahrnehmbar sein, vor
allem bei Kamera-Nahaufnahmen oder wenn mehrere Substeps interpoliert gerendert werden
(`applyRenderInterpolation`). Auch numerisch unsauber: Ein "gelöstes" Kollisionssystem sollte für
ruhende Kontakte auf Nettobeschleunigung 0 konvergieren.

**Fix-Richtung:** Klassisches Slop-Pattern verwenden: `const correction = Math.max(depth - SLOP, 0) / totalInvMass * BAUMGARTE_PERCENT` (typische Werte: `SLOP ≈ 0.005`, `BAUMGARTE_PERCENT ≈ 0.2-0.8`). Das lässt geringfügige Überlappung unkorrigiert (verhindert genau das Jittern) statt sie zu verstärken. Der ursprüngliche Beweggrund ("visuelles Poly-Intersection vermeiden") lässt sich stattdessen z.B. über einen kleinen konstanten Rendering-Offset am Mesh oder korrektes Slop-Tuning erreichen, nicht über eine pauschale Übertreibung der physikalischen Korrektur.

---

### ✅ [ERLEDIGT] `Object3D.computeBounds()` überschreibt manuell zugewiesene OBB-Bounds stillschweigend mit einer AABB, sobald das Objekt Geometrie hat
*(Behoben 2026-09-03: `computeBounds()` in `src/core/Object3D.ts` bewahrt OBB-Instanzen und führt Skalierung/Transformation korrekt anhand der Geometrie nach; `OBB.transform()` extrahiert und skaliert `halfExtents`; Unit-Tests in `tests/physix/OBBScaleAndGeometryBounds.test.ts`.)*

**Dateien:** `src/core/Object3D.ts:213-254` (Zuständigkeit von Agent A, aber der Bug manifestiert
sich direkt im `src/physix/OBB.ts`-Vertrag und wird hier dokumentiert, da er OBB-Kollisionen in
diesem Scope unbenutzbar macht), `src/physix/OBB.ts:76-91`

**Problem:** `computeBounds()` liest `localBounds = this.geometry.getBoundingVolume()`. Für **jede**
eingebaute Geometrie (`AbstractGeometry.getBoundingVolume()`, `src/geometry/AbstractGeometry.ts:74-79`)
ist das immer eine `BoundingBox` (nur `Sphere` überschreibt auf `BoundingSphere`) — es gibt keine
einzige Geometrie-Klasse, die `BoundingType.OBB` zurückgibt. Wenn ein Objekt `.bounds = new OBB()`
manuell zugewiesen bekommt (der einzige Weg, OBB-Bounds überhaupt zu benutzen) UND zusätzlich
`.geometry` gesetzt ist, dann greift in `computeBounds()` dieser Zweig:

```ts
if (!this.bounds || this.bounds.type !== localBounds.type) {
  // Create a fresh copy
  if (localBounds.type === 1 /* BoundingType.BOX */) {
    ...
    this.bounds = new BoxType(lb.min.clone(), lb.max.clone());
```

`this.bounds.type` (OBB=2) !== `localBounds.type` (BOX=1) → die Bedingung ist wahr → die
manuell gesetzte `OBB`-Instanz wird durch eine frische `BoundingBox` ersetzt. Das passiert bei
**jedem** Aufruf von `computeBounds()` — und `PhysicsSystem._internalStep` ruft das für jeden
dynamischen Body bei jedem Substep auf (`PhysicsSystem.ts:181`). Ein OBB-Body mit Geometrie verliert
also spätestens im nächsten Substep seine orientierte Box wieder und wird fortan als achsenparallele
AABB behandelt — rotierte Kollisionsauflösung (SAT, `resolveObbObb`) findet dann faktisch nie mehr
statt, weil `this.bounds.type` nie mehr `OBB` ist.

Selbst in dem (einzigen praktisch nutzbaren) Fall, dass ein OBB-Body **keine** Geometrie hat und
`computeBounds()` daher komplett übersprungen wird (`if (!this.geometry) { ... }`-Guard fehlt hier
zwar nicht, sondern das ganze Bounds-Update ist an `if (this.geometry)` geknüpft, s.
`Object3D.ts:213`), bleibt ein zweiter, unabhängiger Defekt: `OBB.transform()`
(`src/physix/OBB.ts:76-91`) extrahiert Position und Rotation aus der Weltmatrix, aber der Skalierungs-Teil
ist **auskommentiert**:

```ts
// 3. Extract scale and apply to half extents
// const sx = Math.hypot(e[0]!, e[1]!, e[2]!);
// const sy = Math.hypot(e[4]!, e[5]!, e[6]!);
// const sz = Math.hypot(e[8]!, e[9]!, e[10]!);
```

`halfExtents` wird also nie mit der Weltskala multipliziert — ein skaliertes OBB-Objekt behält für
immer die ursprünglichen (unskalierten) `halfExtents`, egal wie stark `obj.setScale(...)` es
verzerrt.

**Verifiziert** mit einem Wegwerf-Test (`tests/physix/_scratch_obb_scale.test.ts`, danach gelöscht):
`Object3D` mit `Cube`-Geometrie + manuell zugewiesenem `OBB`-Bounds + `setScale(10, 2, 1)` +
`computeBounds()`. Ergebnis:
```
bounds constructor after computeBounds(): BoundingBox
bounds type after computeBounds(): 1 (OBB=2, BOX=1, SPHERE=0)
is instanceof OBB: false
```
Die zugewiesene `OBB`-Instanz ist nach einem einzigen `computeBounds()`-Aufruf spurlos verschwunden.

**Failure-Szenario:** OBB-Kollisionen (der einzige Bounding-Typ, der rotierte Objekte korrekt
behandelt) funktionieren in der Praxis nur für Bodies ganz ohne `.geometry` — also nicht für normale
gerenderte Meshes mit Physik. Jeder Versuch, einer rotierten Rampe/Kiste/Wand über `PhysicsSystem`
echte OBB-Kollisionserkennung zu geben, scheitert lautlos (kein Fehler, keine Exception — die
Kollision läuft einfach über die viel zu grobe/falsche AABB weiter, oder bei tatsächlicher Skalierung
über eine falsch dimensionierte OBB). Die existierenden OBB-Tests (`PhysicsSystem.test.ts`,
`OBB.test.ts`) decken das nicht ab, weil sie `resolveObbObb`/`_resolveCollisions` direkt aufrufen
bzw. absichtlich Objekte ohne Geometrie verwenden (siehe Kommentar in `PhysicsSystem.test.ts:459-464`,
der genau diese Falle für Test-Autoren dokumentiert, aber nicht als Produktbug erkennt).

**Fix-Richtung:** Zwei unabhängige Fixes nötig: (1) `computeBounds()` darf eine bestehende
`OBB`-Instanz nicht wegwerfen, nur weil `geometry.getBoundingVolume()` grundsätzlich eine AABB liefert
— z.B. per explizitem Opt-in-Flag am Objekt (`preferredBoundingType`) oder indem OBB-Bounds von
`computeBounds()` komplett ausgenommen werden (nur Position/Rotation/Skalierung nachführen, nie den
Typ wechseln, wenn der Nutzer explizit OBB gewählt hat). (2) `OBB.transform()`: die auskommentierte
Skalen-Extraktion aktivieren und `halfExtents` mit den ursprünglichen lokalen Halbausdehnungen
multiplizieren (dafür müssten lokale `halfExtents` getrennt von den transformierten gehalten werden,
ähnlich wie `Object3D.computeBounds()` es für BOX/SPHERE bereits über `lb`/`ls` vs. `b` vormacht).

---

### 🟠 Keine tangentiale Reibung in der Kollisionsauflösung — `RigidBody.friction` ist globales Dämpfungsglied, kein Kontakt-Coulomb-Friction

**Dateien:** `src/physix/PhysicsSystem.ts:286-359` (`_resolveCollisions`), `src/physix/solvers/EulerIntegrator.ts:44`, `src/physix/RigidBody.ts:65`

**Problem:** `_resolveCollisions` berechnet ausschließlich einen Normalimpuls (`velAlongNormal`,
`jMag`, Restitution `e`) — es gibt keinen Tangentialimpuls senkrecht zur Kollisionsnormalen. Das
bedeutet: Ein Körper, der auf einer geneigten Fläche (OBB/Box in Schräglage) aufliegt, wird nur in
Normalenrichtung gestoppt/rückgeprallt, aber nichts bremst seine Bewegung *entlang* der Fläche —
er gleitet ungebremst weiter (abgesehen von der globalen `rb.friction`-Dämpfung, die jeden Substep
unabhängig von Kontakt/Boden angewendet wird, s. `EulerIntegrator.ts:44`:
`rb.velocity.scale(rb.friction * fluidLinearDrag)`).

Der Name `RigidBody.friction` (Doc: "How much velocity is retained when sliding along a surface")
suggeriert Coulomb-Reibung an der Kontaktfläche, ist aber tatsächlich eine globale,
kontakt-unabhängige Geschwindigkeitsdämpfung, die **immer** wirkt (auch frei fliegende Körper ohne
jeden Kontakt werden gebremst) — funktional deckungsgleich mit Luftwiderstand/Linear-Damping, nicht
mit Bodenreibung.

**Failure-Szenario:** Objekte auf geneigten Rampen (OBB-Box-Kollision) rutschen nie wirklich zur
Ruhe, sondern nur so stark gebremst wie der globale `friction`-Faktor es zulässt — unabhängig davon,
ob die Rampe "Eis" oder "Beton" sein soll (aus Kontext/Materialsicht gäbe es dafür keinen Hebel,
weil Reibung nicht pro Kontaktpaar, sondern nur pro Body global existiert). Für ein Engine mit
expliziter FluidVolume/Buoyancy/CCD-Tiefe (alles bereits vorhanden) ist das Fehlen von
Kontakt-Reibung eine auffällige Lücke im ansonsten reichhaltigen Kollisionsmodell.

**Einordnung:** Kein Blocker, ggf. bewusste Scope-Entscheidung (ähnlich CCD sphere-only, ADR 0005) —
aber anders als CCD gibt es dafür kein ADR, das diese Grenze dokumentiert. Falls beabsichtigt, sollte
das analog zu ADR 0005 festgehalten werden; falls nicht, ist ein Tangentialimpuls
(`vt = rv - normal * velAlongNormal; jT = -vt.length() * frictionCoeff / totalInvMass`, geclamped an
`|jT| <= jN * frictionCoeff` nach Coulomb) die Standard-Ergänzung.

---

## `src/geometry/` — Degenerierte Parameter, Normalen/Tangenten

### ✅ [ERLEDIGT] Systemische Division durch 0 bei `radius=0` / `segments=0` — NaN-Geometrie ohne Guard, quer über fast alle parametrischen Geometrien
*(Behoben 2026-09-03: Parameter-Clamping und Zero-Guards für `radius`, `segments`, `dimensions` und UVs in allen parametrischen Geometrien und `ExtrudeGeometry` eingefügt; Unit-Tests in `tests/geometry/ParametricGeometryNaNGuards.test.ts`.)*

**Dateien:** `src/geometry/Sphere.ts:75`, `src/geometry/Torus.ts:52,58`, `src/geometry/Cylinder.ts:82,87,122,141,164`, `src/geometry/Capsule.ts:64,71,78`, `src/geometry/Tube.ts:70,74`, `src/geometry/Ground.ts:54,56`, `src/geometry/Plane.ts:54,56`, `src/geometry/Pyramid.ts:56,58,74`, `src/geometry/Terrain.ts:190,193` u.a.

**Problem 1 — `Sphere` bei `radius=0`:** `generateGeometryData()` berechnet die Normalen direkt aus
der Position durch Division durch den Radius, statt (wie sonst überall in dieser Datei üblich) über
`AbstractGeometry.computeNormals()`:

```ts
// src/geometry/Sphere.ts:75
n.push(px / this.radius, py / this.radius, pz / this.radius);
```

Bei `radius = 0` sind alle Positionen `px/py/pz` ebenfalls `0` (bzw. `-0`), also ist jede Normalen-Komponente `0/0 = NaN` — kein Epsilon-Guard wie sonst im Modul üblich (vgl. `AbstractGeometry.computeNormals()`, das bei degenerierten Dreiecken sauber auf einen Up-Vector zurückfällt).

**Problem 2 — jede Geometrie mit `segments`-Parameter bei `segments=0`:** In praktisch jeder
parametrischen Geometrie wird ein UV-Koordinatenanteil als `x / this.xSegments` berechnet, ohne
`xSegments` je auf einen Mindestwert (1) zu clampen. Bei `xSegments = 0` läuft die Schleife
`for (x = 0; x <= this.xSegments; x++)` trotzdem einmal (x=0), und `0 / 0 = NaN` propagiert in
Vertex-Positionen (nicht nur Normalen).

**Verifiziert** mit drei Wegwerf-Tests (`tests/geometry/_scratch_*.test.ts`, alle danach gelöscht):
- `new Sphere({ radius: 0, widthSegments: 4, heightSegments: 4 })` → **75/75** Normalen-Komponenten sind `NaN`.
- `new Torus({ tubularSegments: 0, radialSegments: 4 })` → **10/15** Vertex-Komponenten sind `NaN`.
- `new Cylinder({ radialSegments: 0 })` → **8/18** Vertex-Komponenten sind `NaN`.

**Failure-Szenario:** `NaN` in Vertex-/Normalen-Buffern ist keine harmlose Verzerrung — je nach
WebGL/WebGPU-Treiber propagiert das in undefiniertes Rendering (fehlende/verzerrte Dreiecke,
manchmal sichtbares Flackern über die ganze Draw Call hinweg, da NaN durch nachfolgende
Interpolation/Culling-Stufen läuft) oder wird von `BoundingBox.fromVertices()` in die Bounds
übernommen (`NaN` in `min`/`max` invalidiert Broadphase-Queries für das ganze Objekt lautlos). Ein Aufrufer, der z.B. per UI-Parameter oder generativem Level-Editor (Maker!) einen Radius/Segmentanzahl auf 0 zieht (z.B. während eines Drag-Sliders, bevor der Nutzer losgelassen hat), bekommt keinen Fehler, sondern eine unsichtbar kaputte Geometrie.

**Fix-Richtung:** Einheitlich in allen Konstruktoren/Optionen: Segmentanzahlen mit
`Math.max(1, segments)` clampen (analog zu einem needed `MathUtils.clamp`), und für `radius`
entweder denselben Ansatz (`Math.max(EPSILON, radius)`) oder — sauberer — `Sphere` ebenfalls über
`computeNormals()` statt der direkten `pos/radius`-Formel normalisieren, wie es der Rest des Moduls
bereits tut (dort existiert der Epsilon-Guard schon).

---

## `src/loaders/` — AssetManager-Singleton, GltfLoader-Fehlerpfade

### ✅ [ERLEDIGT] Jeder Loader in `src/loaders/` benutzte weiterhin den globalen `AssetManager`-Singleton — die bereits vollzogene Instanz-Migration (`RendererContext.assetManager`) wurde nie in die Loader-Schicht durchgezogen
*(Behoben 2026-09-03: `LoaderOptions.assetManager?: AssetManager` ergänzt; `AbstractLoader` hält `protected _assetManager`, default ist eine frische private Instanz statt des Singletons; `GltfLoader`/`ObjLoader`/`ImageLoader`/`MtlLoader`/`TextLoader`/`SkyboxLoader`/`BinaryStreamLoader` sowie `GltfMaterialParser.parseMaterial`/`resolveTexture` rufen jetzt ausschließlich die injizierte Instanz auf; `ObjLoader` reicht seine Instanz an die intern erzeugte `MtlLoader` weiter. Unit-Tests in `tests/loaders/LoaderAssetManagerInjection.test.ts`.)*

**Dateien:** `src/loaders/GltfLoader.ts:58,65,73`, `src/loaders/gltf/GltfMaterialParser.ts:166` (Textur-Resolving ruft ebenfalls `AssetManager.loadImage` statisch auf), `src/loaders/ObjLoader.ts:37`, `src/loaders/ImageLoader.ts:28`, `src/loaders/MtlLoader.ts:22,82,99`, `src/loaders/TextLoader.ts:24`, `src/loaders/SkyboxLoader.ts:25`, `src/loaders/BinaryStreamLoader.ts:27`; Gegenprobe: `src/loaders/AssetManager.ts:16-30,328-389`, `src/interfaces/RendererContext.ts:1-23`, `src/interfaces/LoaderOptions.ts:7-10`

**Problem:** `AssetManager` selbst dokumentiert explizit den Umbau weg vom Singleton (Klassenkommentar,
`AssetManager.ts:12-14`: "Construct one per engine instance... so its cache can be released with the
engine instead of living for the process's lifetime") und jede statische Methode ist bereits
`@deprecated` mit dem Hinweis "Use an instance via `RendererContext.assetManager` instead."
`RendererContext` (`src/interfaces/RendererContext.ts`) existiert genau dafür und wird laut
Kommentar dort ausdrücklich referenziert auf `.agents/collaborate/god-objects-refactoring.md` —
ein bereits durchgeführtes Refactoring, das "Cluster 3: Globale Singletons" (u.a. `AssetManager`)
als Verstoß gegen die Core Architectural Law "No Global Singletons" identifiziert und Phase 1
("Vorbereitung von Instanz-basierten Schnittstellen") als erledigt markiert.

Die Instanz-Seite (`new AssetManager()`, `RendererContext.assetManager`) existiert also. Aber **kein
einziger** Loader in diesem Scope wurde umgestellt: `GltfLoader`, `ObjLoader`, `ImageLoader`,
`MtlLoader`, `TextLoader`, `SkyboxLoader` und `BinaryStreamLoader` rufen ausnahmslos die statischen,
als deprecated markierten `AssetManager.loadJson()/loadBinary()/loadText()/loadImage()/streamBinary()`
auf (z.B. `GltfLoader.ts:58`: `const json = (await AssetManager.loadJson(url)) as GltfJson;`) — nicht
etwa eine übergebene Instanz. `LoaderOptions`/`GltfLoaderOptions`
(`src/interfaces/LoaderOptions.ts:7-10,20-...`) haben nicht einmal ein `assetManager`-Feld — es gibt
aktuell **keinen Weg**, einem `GltfLoader` (oder jedem anderen Loader) überhaupt eine
`AssetManager`-Instanz zu injizieren.

Jeder statische Aufruf läuft über `AssetManager["_sharedDefault"]`
(`private static get _sharedDefault(): AssetManager { return (this._default ??= new AssetManager()); }`,
`AssetManager.ts:328-330`) — ein klassischer, lazy-initialisierter, **prozessweiter** Singleton.

**Failure-Szenario:** Laut AGENTS.md ("No Global Singletons... Small World must support multiple
engine instances per page") ist Multi-Engine-Betrieb pro Seite ein explizites Architektur-Ziel. Sobald
zwei `SmallWorld`-Instanzen (z.B. zwei unabhängige Canvas-Widgets auf derselben Seite) jeweils glTF-,
OBJ-, Bild- oder Textressourcen laden, teilen sie sich **denselben** Cache
(`_imageCache`/`_jsonCache`/`_binaryCache`/`_textCache`), dieselbe `_baseUrl` und dieselben
`_headers` — `AssetManager.setBaseUrl(...)` oder `AssetManager.setHeader(...)` für Instanz A
verändert unsichtbar auch die Requests von Instanz B. Der Cache wird zudem nie freigegeben (lebt für
die gesamte Prozesslaufzeit), genau das Gegenteil dessen, was der eigene Klassenkommentar als Grund
für die Instanz-Migration nennt.

**Verifiziert** durch Codeinspektion (kein Wegwerf-Test nötig, das Verhalten ist eindeutig aus der
Struktur ablesbar): `grep -rn "AssetManager\."` über `src/loaders/*.ts` zeigt ausschließlich
Großschreibung (statischer Klassenzugriff) — keine einzige Stelle nutzt eine
Konstruktor-/Instanzreferenz. Das Refactoring-Dokument selbst nennt `GltfLoader.ts` als Teil von
"Cluster 5" für eine noch ausstehende Zerlegung, erwähnt die `AssetManager`-Anbindung dort aber nicht
mehr separat — die Migration wurde offenbar als mit Phase 1 (Instanz-API bereitstellen) abgeschlossen
betrachtet, obwohl die eigentlichen Verbraucher nie umgestellt wurden.

**Fix-Richtung:** `LoaderOptions` um ein optionales `assetManager?: AssetManager`-Feld erweitern
(Default: `RendererContext`-Instanz oder ein neu erzeugtes `AssetManager()`, NICHT der Singleton),
und jeden Loader intern `this._assetManager.loadX(...)` statt `AssetManager.loadX(...)` aufrufen
lassen. Die statischen Methoden können für Abwärtskompatibilität mit Removal-Target v1.0.0 bestehen
bleiben (wie schon dokumentiert), sollten aber von keinem shipping Loader mehr tatsächlich benutzt
werden.

---

### 🟢 GltfLoader: `_loadJson`-Pfad prüft nicht auf glTF-Version, `_loadBinary` schon

**Datei:** `src/loaders/GltfLoader.ts:57-70` vs. `72-109`

**Problem:** `_loadBinary()` validiert Magic-Bytes und `version !== 2` explizit mit klaren
Fehlermeldungen ("Not a valid .glb file.", "Only glTF 2.0 is supported."). `_loadJson()` (der
`.gltf`-Textpfad) liest die JSON-Datei dagegen ungeprüft ein — es gibt keine Kontrolle von
`json.asset?.version`. Eine `.gltf`-Datei mit `asset.version: "1.0"` (ein anderes, inkompatibles
Format) oder ganz ohne `asset`-Feld durchläuft `_parse()` klaglos und scheitert erst irgendwo tief in
der Knoten-/Attribut-Auflösung mit einer nichtssagenden `TypeError`/`undefined`-Exception statt einer
verständlichen Fehlermeldung direkt beim Laden.

**Failure-Szenario:** Nutzer, die eine `.gltf`-Datei aus einer alten Pipeline (glTF 1.0) oder ein
kaputt exportiertes Asset laden, bekommen keine klare Diagnose ("Only glTF 2.0 is supported", die es
für `.glb` ja gibt), sondern eine kryptische Exception irgendwo mitten in `_parse()`.

**Fix-Richtung:** In `_loadJson()` denselben Versions-Guard wie in `_loadBinary()` ergänzen:
`if (json.asset?.version !== "2.0") throw new Error(...)`. Kleiner, risikoarmer Fix mit klarer
DX-Verbesserung; als Test-Lücke eingestuft, weil aktuell auch kein Test das inkonsistente Verhalten
zwischen beiden Lade-Pfaden abdeckt.

---

### 🟡 `GltfSkinParser.parseSkeletons`: unsicherer Cast versteckt fehlende Validierung bei kaputten Joint-Indizes

**Datei:** `src/loaders/gltf/GltfSkinParser.ts:25`

```ts
const bones: Bone[] = skinDef.joints.map((jIdx) => nodeObjects[jIdx] as Bone);
```

**Problem:** Wenn ein `skin.joints`-Eintrag in einer kaputten/handgeschriebenen glTF-Datei auf einen
nicht-existenten oder falsch typisierten Node-Index zeigt, liefert `nodeObjects[jIdx]` `undefined`.
Der `as Bone`-Cast unterschlägt das gegenüber dem Typsystem — `bones` ist als `Bone[]` deklariert,
enthält an dieser Stelle aber tatsächlich `undefined`. Der einzige nachgelagerte Schutz ist
`if (bones[b]) { bones[b]!.inverseBindMatrix... }` (Zeile 40) — das schützt nur den
Inverse-Bind-Matrix-Schreibzugriff, nicht die an `new Skeleton(bones, boneInverses)` (Zeile 46)
übergebene Liste selbst. Ob `Skeleton`/`SkinnedMesh` intern robust gegen `undefined`-Einträge in
ihrer Bone-Liste sind, ist außerhalb dieses Reviews (`src/core/animation/` liegt in Agent
B/C-Scope) — aus Sicht von `GltfSkinParser` wird eine potenziell inkonsistente Datenstruktur
weitergereicht, ohne dass der Ladevorgang selbst dagegen einen Fehler wirft.

**Failure-Szenario:** Eine handgeschriebene oder durch einen fehlerhaften Exporter erzeugte
`.gltf`/`.glb`-Datei mit einem Joint-Index außerhalb des gültigen `nodes`-Bereichs führt nicht zu
einer klaren "invalid skin" Fehlermeldung beim Laden, sondern zu einer möglicherweise erst beim
ersten Rendern/Animieren auftretenden Exception (`Cannot read properties of undefined`) tief in der
Skinning-Pipeline, weit entfernt von der eigentlichen Fehlerursache.

**Fix-Richtung:** Nach dem `.map(...)` explizit auf `undefined`-Einträge prüfen und mit einer
sprechenden Fehlermeldung abbrechen (`Skin ${i} references invalid joint node ${jIdx}`), statt den
Cast unvalidiert durchzureichen.

---

### 🟠 `ObjLoader`: Ein fehlendes/kaputtes `.mtl` lässt den gesamten `.obj`-Ladevorgang scheitern, statt gracefully auf Default-Materialien zurückzufallen

**Datei:** `src/loaders/ObjLoader.ts:90-92`

```ts
if ("mtllib" === type) {
  const mtlLoader: MtlLoader = new MtlLoader({ basePath: folderPath });
  materials = await mtlLoader.load(parts[1]!);
}
```

**Problem:** Kein `try/catch` um `mtlLoader.load(...)`. Wenn die referenzierte `.mtl`-Datei fehlt
(404), unlesbar ist, oder aus einem anderen Grund abgelehnt wird, wirft `MtlLoader.load()` — die
Exception läuft ungefangen durch `ObjLoader._parse()` nach oben und wird im äußeren `try/catch` von
`ObjLoader.load()` als `LOADER_ERROR` weitergereicht: Der komplette `.obj`-Ladevorgang schlägt fehl,
obwohl das Mesh selbst (Vertices/Normals/UVs/Indices) vollständig und gültig geparst wurde und mit
Fallback-Materialien (`materials.get(name) || new PhongMaterial()`, Zeile 153) problemlos rendern
könnte.

Das steht im Kontrast zu `MtlLoader` selbst, das genau diese Großzügigkeit für **Texturen innerhalb**
der `.mtl`-Datei bereits vorbildlich umsetzt (`MtlLoader.ts:81-93`: einzelne fehlgeschlagene
Texturen werden nur geloggt, nicht fatal) — nur eine Ebene höher, beim `.mtl`-File selbst, fehlt
dieselbe Nachsicht.

**Failure-Szenario:** Ein `.obj`-Export, bei dem der referenzierte `.mtl`-Pfad falsch geschrieben,
umbenannt oder schlicht nicht mitkopiert wurde (ein sehr häufiges Real-World-Problem bei
OBJ/MTL-Paaren aus Drittanbieter-Tools), lädt in Small World gar nicht mehr — statt (wie von den
meisten anderen OBJ-Loadern/Viewern erwartbar) mit neutralen Standardmaterialien sichtbar zu werden.

**Fix-Richtung:** `mtlLoader.load(...)` in ein eigenes `try/catch` einpacken, bei Fehlschlag einen
`console.warn` ausgeben und mit dem leeren/Default-`materials`-Map fortfahren, statt die Exception
weiterzureichen.

---

### 🟡 `GeometryWorkerProcessor` läuft nie in einem echten Worker, ist tote/unbenutzte Fläche, und dupliziert `AbstractGeometry`s Normalen-/Tangenten-Formeln

**Datei:** `src/loaders/GeometryWorkerProcessor.ts` (ganze Datei, 225 Zeilen)

**Problem — drei zusammenhängende Punkte:**

1. **Irreführender Name/Doku, keine tatsächliche Off-Main-Thread-Arbeit:** Klassendoku ("High-performance processor for off-main-thread geometry computation (DirectStorage worker staging)") und Methode `processGeometryAsync` ("Non-blocking staging via microtask queue") suggerieren einen Web Worker. Tatsächlich verwendet die Implementierung nur `queueMicrotask()` (Zeile 200) — das läuft **synchron auf dem Main-Thread**, noch vor dem nächsten Repaint, und blockiert das UI genauso wie ein direkter synchroner Aufruf. Es gibt keinen `new Worker(...)`, kein `postMessage`, keinen Transfer via `ArrayBuffer` — kein einziger Hinweis auf echten Thread-Wechsel irgendwo im Repo (verifiziert per `grep -rn "new Worker\|postMessage" src/loaders/`, keine Treffer). Das widerspricht genau der im `CONTEXT.md` dokumentierten eigenen Konvention des Projekts, keinen Namen zu verwenden, der mehr verspricht als tatsächlich implementiert ist (vgl. "HBAO... nie den genaueren Namen behaupten, den es nicht verdient").
2. **Toter/unbenutzter Code:** `grep -rn "GeometryWorkerProcessor"` zeigt nur den Export in `src/loaders/index.ts` und die eigene Testdatei (`tests/loaders/BinaryStreamLoader.test.ts`) — kein einziger produktiver Loader (`GltfLoader`, `ObjLoader`, `BinaryStreamLoader` selbst) ruft `GeometryWorkerProcessor.processGeometryAsync/computeNormals/computeTangents` tatsächlich auf. Die Klasse ist spekulative, nie verdrahtete API-Fläche.
3. **Dupliziert `AbstractGeometry`s Tangenten-/Normalen-Berechnung 1:1:** `computeNormals()`/`computeTangents()` hier (Zeilen 23-190) sind praktisch identisch (gleiche Variablennamen `tan1`/`tan2`/`s1`/`s2`/`t1`/`t2`/`div`/`r`, gleiche Gram-Schmidt-Orthogonalisierung) zu `AbstractGeometry.computeNormals()`/`computeTangents()` (`src/geometry/AbstractGeometry.ts:85-182,241-314`) — ein weiterer Copy-Paste-Footprint in einer Codebase, die genau solche Duplikate an anderer Stelle bereits bewusst extrahiert hat (vgl. Projekt-Historie zu GltfLoader-Clamp-Dedup, WGSL-Footprint-Dedup).

**Failure-Szenario:** Kein akuter Bug (der Code ist unbenutzt), aber ein Wartungsrisiko: Ein
zukünftiger Fix an der Tangenten-/Normalenformel (z.B. der bereits an anderer Stelle dieses Reviews
gefundene fehlende Epsilon-Guard) müsste an zwei Stellen synchron gehalten werden, und der Name
verspricht Performance-Eigenschaften ("off-main-thread"), die bei tatsächlicher Anbindung an einen
echten Loader gar nicht eingelöst würden.

**Fix-Richtung:** Entweder (a) tatsächlich in einen echten `Worker` verlagern und an mindestens einen
Loader anschließen, oder (b) die Duplikation eliminieren, indem `GeometryWorkerProcessor` intern
`AbstractGeometry`s statische Normal-/Tangenten-Berechnung wiederverwendet (ggf. als geteilte
freistehende Funktion extrahiert), und die Klasse in Name/Doku ehrlich als "synchron, nur
Microtask-verzögert" beschreiben — oder (c) ersatzlos entfernen, falls kein Loader sie in absehbarer
Zeit tatsächlich benötigt.

---

## `src/audio/` — AudioContext-Lifecycle, Node-Cleanup

### ✅ [ERLEDIGT] `SynthSFX.startDrone()`/`startFire()` erzeugten dauerhaft laufende Audio-Node-Graphen ohne jede Stop-/Cleanup-Möglichkeit — verifizierter Leak, in echten Apps bereits mehrfach pro Level ausgelöst
*(Behoben 2026-09-03: `SynthSFX.startDrone()`/`startFire()` geben jetzt ein `SoundHandle` mit `stop()` zurück, das alle Oszillatoren/Noise-Sources stoppt und den Graphen disconnected; `AudioSystem` trackt aktive Handles in `_activeEndlessSounds` und bekommt eine neue `dispose()`-Methode, die alle noch laufenden Drone-/Fire-Instanzen stoppt und `this.context.close()` aufruft; `SmallWorld.destroy()` ruft jetzt `this.audio.dispose()` auf. Unit-Tests in `tests/audio/AudioSystem.test.ts` ("endless sound lifecycle").)*

**Dateien:** `src/audio/SynthSFX.ts:29-127` (`startDrone`), `src/audio/SynthSFX.ts:132-175` (`startFire`), `src/audio/AudioSystem.ts:266-274` (dünne `void`-Wrapper `startDrone()`/`startFire()`)

**Problem:** Beide Methoden sind `void`-Rückgabetyp — sie geben keine Referenz auf die erzeugten
Audio-Nodes zurück. Intern werden aber mehrere **endlos laufende** Quellen gestartet:

- `startDrone()`: `subOsc`, `subOsc2`, `pad1`, `pad2`, `pad3` (Oszillatoren ohne jeden `.stop()`-Aufruf, laufen unbegrenzt) sowie `noiseSrc` (`loop = true`) und `windLFO` — insgesamt 7 permanent aktive Nodes plus zugehörige Gain-/Filter-Nodes.
- `startFire()`: `noiseSource` mit `loop = true`, verbunden über `filter` → `panner` → `gainNode` → `sfxGain` — läuft ab dem Aufruf für immer.

Anders als `playFootstep`/`playShoot`/`playHurt`/`playTone` (die alle explizit `osc.stop(currentTime + duration)` aufrufen und damit dem Web-Audio-Spec-Mechanismus folgen, der beendete, unreferenzierte Source-Nodes automatisch aus dem Graph entfernt) gibt es für `startDrone`/`startFire` **keine** `stop()`-Aufrufe und **keine** zurückgegebene Referenz, über die ein Aufrufer sie später selbst stoppen könnte. Da die Quellen aktiv Audio produzieren (looping bzw. nie gestoppt), greift die spec-seitige automatische Garbage-Collection ("ended, unreferenced source nodes get disconnected") hier nicht — der gesamte Node-Graph bleibt für die Lebensdauer des `AudioContext` aktiv, unabhängig davon, ob irgendein JS-Code noch eine Referenz hält. Es existiert in `AudioSystem`/`SynthSFX` keine einzige `stopDrone()`, `stopFire()` oder generische `dispose()`-Methode.

**Verifiziert** durch Codeinspektion (eindeutig aus der Struktur ablesbar, kein Test nötig) und durch
Auffinden der tatsächlichen Call-Sites:
- `src/apps/yad/core/LevelBuilder.ts:257-259`: `config.audio.startFire(light.position, 0.4)` wird
  für **jeden** Grid-Eintrag mit `lightColor` aufgerufen — also potenziell einmal pro
  Fackel/Lichtquelle in einem Level. Es gibt keine Guard-Logik, die verhindert, dass ein Level mit
  z.B. 15 Lichtquellen 15 gleichzeitig und für immer laufende Rauschen-Filter-Panner-Ketten anlegt,
  von denen keine einzelne (und auch nicht alle zusammen) je wieder gestoppt werden kann.
- `src/apps/yad/App.ts:244-251` und `src/apps/neon-labyrinth/App.ts:385-392`: `startDrone()` wird
  zwar jeweils nur über einen `{ once: true }`-Click-Listener ausgelöst (verhindert Mehrfachaufruf in
  der aktuellen Nutzung), aber das ist reine Aufrufer-Disziplin, keine Absicherung in `AudioSystem`
  selbst — ein Refactoring, das den Drone z.B. bei einem Szenenwechsel neu triggert, würde
  unbemerkt einen zweiten, nie endenden Drone-Graphen zusätzlich zum ersten starten (hörbar
  lauter/dissonanter, nicht wieder rückgängig zu machen).

**Failure-Szenario:** Jeder `startFire()`-Aufruf ist ein permanenter Ressourcenverbrauch (CPU für
kontinuierliche Audio-Rendering-Berechnung von Noise-Buffer + Biquad-Filter + Panner) ohne jede
Möglichkeit der Rücknahme — weder pro Aufruf noch global (außer den kompletten `AudioContext` zu
schließen, was auch Musik/SFX/Reverb mitreißt). Bei prozedural generierten Levels mit vielen
Lichtquellen (das explizite Einsatzszenario in `LevelBuilder.ts`) skaliert der Leak linear mit der
Levelgröße. Läuft eine App über längere Zeit (Level-Wechsel, Neustart einer Szene ohne vollständigen
Objekt-Reload), akkumulieren sich unhörbar viele nie endende Audiographen.

**Fix-Richtung:** `startDrone()`/`startFire()` sollten ein Handle zurückgeben (z.B. `{ stop(): void }`
oder die Source-Node selbst), das der Aufrufer hält und bei Bedarf beendet (`source.stop()` +
`disconnect()` der Zwischenknoten). Zusätzlich sollte `AudioSystem` eine interne Liste aktiver
"endless" Sources führen und eine `dispose()`/`stopAll()`-Methode anbieten, die beim Abbau der Szene
(oder des gesamten `SmallWorld`-Instanz-Lifecycles) alle noch laufenden Drone-/Fire-Instanzen sauber
stoppt — passend zum in AGENTS.md geforderten "Fail Fast & Lifecycle"-Prinzip und der expliziten
Multi-Instanz-Fähigkeit der Engine.

**Verwandter Befund (✅ mitbehoben) — `AudioSystem` hat überhaupt keine `dispose()`/`close()`-Methode, und
`SmallWorld.destroy()` rührt `this.audio` nicht an:** `grep -n "dispose\|destroy\|close("
src/audio/*.ts` liefert keinen einzigen Treffer — es gibt keinen Weg, den `AudioContext` selbst
jemals zu schließen. `SmallWorld.destroy()` (`src/core/SmallWorld.ts:400-411`) entfernt Event-Listener
und ruft `this.renderer.destroy()` auf, aber nirgends `this.audio.context.close()` o.ä. Der
`AudioContext` (inkl. Mixer-Graph `masterGain`/`sfxGain`/`musicGain`/Reverb sowie jedem noch
laufenden Drone/Fire-Graphen) bleibt nach `destroy()` unverändert aktiv weiterlaufen. Browser
begrenzen die Zahl gleichzeitig lebender `AudioContext`-Instanzen pro Seite (in einigen Browsern nur
niedrige einstellige Zahl, bevor `new AudioContext()` fehlschlägt) — bei wiederholtem
Erzeugen/Zerstören von `SmallWorld`-Instanzen (z.B. in Tests, Storybook-artigen Demo-Seiten, oder
Single-Page-Apps, die zwischen mehreren Small-World-Canvases wechseln) ist das ein direkter Weg,
dieses Limit zu erreichen. Gehört zum selben Fix: `AudioSystem.dispose()` sollte
`this.context.close()` aufrufen, und `SmallWorld.destroy()` sollte es aufrufen.

---

### 🟡 `AudioSystem.load()` schluckt Fehler komplett, inkonsistent zum `EventType.LOADER_ERROR`-Muster der übrigen Loader

**Datei:** `src/audio/AudioSystem.ts:108-118`

**Problem:** Jeder Loader in `src/loaders/` (siehe oben) dispatcht bei einem Fehler konsequent
`EventType.LOADER_ERROR` und wirft die Exception weiter, sodass Aufrufer sie behandeln können.
`AudioSystem.load()` fängt Fehler dagegen mit `catch (e) { console.error(...); }` ab, ohne ein Event
zu dispatchen und ohne die Exception weiterzureichen — ein `await audioSystem.load(url, name)`
schlägt aus Sicht des Aufrufers nie fehl, es erscheint nur eine Konsolenzeile. Nachfolgende
`play(name)`-Aufrufe liefern dann still `null` zurück (weil `_buffers.get(name)` nichts findet), ohne
erkennbaren Zusammenhang zu einem vorherigen Ladefehler.

**Failure-Szenario:** Ein Sounddatei-Tippfehler oder 404 wird nur in der Konsole sichtbar, nicht über
den regulären Event-/Error-Pfad der Engine — Code, der sich (wie bei `GltfLoader`/`ObjLoader`
üblich) auf `LOADER_ERROR` verlässt, um Ladefehler zentral zu behandeln oder anzuzeigen, bekommt bei
Audio-Assets nie eine Chance dazu.

**Fix-Richtung:** Konsistent zum Rest der Loader entweder die Exception weiterwerfen (Aufrufer
entscheidet, ob er sie behandelt) oder zumindest ein eigenes Event dispatchen, statt nur zu loggen.

---

## `src/extensions/` und `src/utils/` — kurze Sichtprüfung

Wie im Auftrag vorgesehen nur kurz mitgeprüft (kein Schwerpunkt). Keine Bugs auf dem Niveau der
obigen Funde gefunden. Bemerkenswert:

- `src/extensions/weather/WeatherEmitter.ts` ist ein Musterbeispiel für die geforderte
  Zero-Allocation-Hot-Path-Disziplin: alle Partikeldaten liegen in parallelen `Float32Array`s statt
  Objekten pro Partikel, `update()` alloziert nichts, feste Scratch-`Vector3D`/`Matrix4`-Felder
  werden wiederverwendet (`_scratchPos`/`_scratchRot`/`_scratchScale`/`_scratchMatrix`). Der
  Klassenkommentar dokumentiert außerdem ehrlich, dass die Klasse bewusst NICHT in
  `SmallWorld`/`EngineOptions` verdrahtet ist (Opt-in-Erweiterung) — genau die Art von
  Transparenz, die an anderer Stelle in diesem Review fehlt (vgl. `GeometryWorkerProcessor`).
- `src/extensions/imposter/ImposterBaker.ts`: `computeSubtreeBoundingSphere()` und der
  Orthographic-Kamera-Bake-Loop sind ungewöhnlich sorgfältig kommentiert — insbesondere der Hinweis,
  warum `bottom`/`top` gegenüber der üblichen Konvention vertauscht sind (WebGPU-Renderziel-Zeilenreihenfolge vs. `Plane`/`Sprite`-UV-Konvention), ein Detail, das ohne den Kommentar leicht als Bug missverstanden würde.
- `src/utils/HeightmapGenerator.ts`: Diamond-Square-Implementierung mit sauberen Rand-Guards
  (`get()` gibt `-1` für Out-of-Bounds zurück statt zu crashen) und optionalem seedbaren RNG
  (`_mulberry32`/`_cyrb128`) für reproduzierbare Heightmaps — keine Auffälligkeiten bei kurzer
  Durchsicht.

---

## ✅ Was gut gemacht ist

- **MathPool-Disziplin in `src/physix/`:** Über praktisch die gesamte Kollisions-/Integrations-Pipeline (`PhysicsSystem`, `Collision`, `EulerIntegrator`, `SweptSphereCCD`) wird konsequent `MathPool.acquireVector()`/`releaseVector()` (und analog für Matrizen/Quaternionen) verwendet, mit korrekt gepaarten Acquire/Release-Aufrufen auch in verzweigten Codepfaden (z.B. der bedingte `velB`-Zweig in `PhysicsSystem._resolveCollisions`, der je nach `rbB`-Vorhandensein unterschiedlich freigegeben wird). Das ist genau die im `CONTEXT.md` geforderte Zero-Allocation-Hot-Path-Disziplin, sauber durchgehalten.
- **`SweptSphereCCD`/ADR 0005:** Die Sphere-only-CCD-Implementierung ist sauber von der diskreten Kollisionsauflösung getrennt, gut dokumentiert (inklusive der bewussten Scope-Grenze) und durch eine ungewöhnlich gründliche Testsuite abgedeckt (`PhysicsSystem.test.ts`, "CCD (fast-moving sphere bodies)"-Block: Tunneling-Verhinderung, Sphere-Sphere-CCD, Threshold-Grenzfall, Deaktivierung via `Infinity`, UND explizit der Nicht-Abdeckung von Box/OBB-Bodies als dokumentiertes Verhalten statt Bug).
- **`AbstractGeometry.computeNormals()`/`computeTangents()`:** Sauberer Epsilon-Guard bei der Normalen-Normalisierung (`0.00001 < len`) mit sinnvollem Fallback (Up-Vector) für degenerierte/entartete Dreiecke — genau das defensive Pattern, das an anderer Stelle (Sphere, segments=0) fehlt und dort auch tatsächlich fehlschlägt.
- **`AssetManager._fetchWithProgress`/Tracking-Key-Kommentare:** Die Dokumentation der Tracking-Key-Race-Condition (unterschiedliche Caches, die sich einen `_activeLoaders`-Eintrag teilen würden) ist ein Beispiel für genau die Art von "WHY, nicht WAS"-Kommentar, die der Coding-Guide fordert — nicht offensichtlich, aber beim Lesen sofort einleuchtend.
- **`ObjLoader._parseFaceVertex`:** Vorbildliche Fehlerbehandlung für face-vertex-Indizes aus kaputten/handgeschriebenen OBJ-Dateien (negative/1-basierte/Out-of-Range-Indizes, fehlende UV/Normal-Segmente) — mit klaren `console.warn`s und Kommentaren, die genau erklären, warum Platzhalter statt Auslassung nötig sind (Array-Alignment).
- **`WeatherEmitter`/`ImposterBaker`:** Beide demonstrieren, dass "opt-in, nicht in `SmallWorld` verdrahtet" als Architekturentscheidung sauber dokumentiert wird, statt stillschweigend unfertig zu wirken.

---

## Fazit

Der geprüfte Teilbereich zeigt ein deutliches Gefälle: Die *mathematische* Kernlogik (SAT/Sphere-Kollisionsauflösung, Sub-Stepping-Accumulator, CCD-Sweep-Formeln, Zero-Allocation-Pooling) ist überwiegend sauber, gut getestet und gut dokumentiert — die Impuls-/Restitutionsformeln selbst sind korrekt. Die gefundenen kritischen Probleme liegen fast alle an den *Rändern* dieser Kernlogik: einem einzigen falsch gepolten Vorzeichen in der Positionskorrektur (Resting-Contact-Oszillation), einem übersehenen Zusammenspiel zwischen zwei ansonsten für sich funktionierenden Mechanismen (`computeBounds()` + `OBB.transform()`), einer nie zu Ende geführten Architektur-Migration (`AssetManager`-Singleton in der Loader-Schicht), und fehlenden Lifecycle-Gegenstücken für sonst funktionierende "Start"-APIs (`startDrone`/`startFire` ohne `stop`).

**Top 3 nach Priorität:**

1. **🔴 Resting-Contact-Oszillation** (`PhysicsSystem.ts:308`) — betrifft *jeden* ruhenden/gestapelten Körper in der Engine, damit die höchste Reichweite aller Funde. Der Fix ist klein (Slop-Pattern statt Additions-Epsilon) und risikoarm.
2. **🔴 `AudioSystem`/`SynthSFX`-Leak bei `startFire`/`startDrone`** — bereits in produktivem App-Code (`LevelBuilder.ts`) mehrfach pro Level ausgelöst, ohne jede Stop-Möglichkeit; wächst mit jeder Levelgröße.
3. **🔴 OBB-Bounds werden durch `computeBounds()` stillschweigend verworfen** — macht OBB-Kollisionen für jedes Objekt mit Geometrie faktisch unbenutzbar; hohe Priorität, weil der Fehler komplett lautlos ist (kein Crash, keine Warnung, nur falsches Kollisionsverhalten).

Der `AssetManager`-Singleton-Befund ist strukturell genauso wichtig (expliziter Verstoß gegen eine Core Architectural Law), aber mit geringerer akuter Symptomatik in Single-Instance-Apps — daher Platz 4, nicht Platz 1-3.

Kein Fund in diesem Review ist spekulativ: jeder Bug wurde entweder durch einen Wegwerf-Test (danach gelöscht) empirisch reproduziert, oder durch eindeutige Codeinspektion (Grep-Belege, Cross-Referenz zu ADRs/Kommentaren/Git-Historie) verifiziert.
