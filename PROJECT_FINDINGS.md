# Projekt-Findings — Status & offene Punkte

Konsolidiert aus vier inzwischen gelöschten Recherche-/Plan-Dateien
(`physics-broadphase-plan.txt`, `physics-broadphase-research-findings.txt`,
`codebase-analysis-research-findings.txt` — bei Bedarf per
`git show 7fbbf1f3:<dateiname>` bzw. vor dem jeweiligen Lösch-Commit
abrufbar). **Jede Behauptung wurde gegen den aktuellen Quellcode
re-verifiziert (Stand 2026-07-21)** — die ursprünglichen Analysen waren an
vielen Stellen bereits veraltet, siehe Abschnitt "Bereits behoben" pro Teil.

---

## 1. Physics Broadphase

### Erledigt (verifiziert im aktuellen Code)

1. **Octree-Broadphase statt Brute-Force.** `PhysicsSystem._resolveCollisions`
   (`src/physix/PhysicsSystem.ts:184-373`) baut pro Aufruf einen eigenen,
   privaten `_broadphaseTree: Octree` (Zeile 208-219), befüllt aus
   `_allColliders`. Fehlgeschlagene Inserts (außerhalb der Baum-Bounds) landen
   in `_broadphaseFallback` und werden weiterhin linear getestet statt
   stillschweigend verworfen zu werden (Zeilen 221-226, 242-245). Der
   `bodies.indexOf(...)`-Dedup-Check wurde durch eine O(1)-`_bodyIndex`-Map
   ersetzt (Zeilen 228-231, 252-253). SpatialHash wurde bewusst NICHT
   verwendet (2D-XZ-only, kein `remove()`, YAD-spezifisch).
2. **Box-Box-Auflösung.** `Collision.resolveBoxBox` (`Collision.ts:137-165`)
   existiert und ist in `PhysicsSystem`s Dispatch-Block eingebunden
   (`PhysicsSystem.ts:280-286`, Typ-Kombination `(1,1)`).
3. **Opt-in Physik in `SmallWorld`.** `public physics: PhysicsSystem`
   (`SmallWorld.ts:39`), `config.gravity`/`config.enablePhysics` verdrahtet
   (Zeilen 72-74, 412-413), Default `false` — verhindert Doppel-Stepping in
   Showcases 20/21/22, die weiterhin ihre eigene `PhysicsSystem`-Instanz
   verwalten.
4. **Sphere-OBB-Erkennung und -Auflösung (2026-07-21).**
   `Collision._sphereObb`/`resolveSphereObb` (`Collision.ts`): Sphere-Mittelpunkt
   wird in die 3 OBB-Lokalachsen projiziert (Dot-Produkt), auf `halfExtents`
   geclamped → nächster Punkt auf der OBB, Standard-Closest-Point-Test.
   Auflösung inkl. "Mittelpunkt steckt in der OBB"-Sonderfall, analog zu
   `resolveSphereBox`, nur in lokalen OBB-Achsen statt AABB-min/max. In
   `Collision.test()` (Erkennung) und `PhysicsSystem`s Dispatch-Block
   (Auflösung, Typ-Kombinationen `(SPHERE,OBB)`/`(OBB,SPHERE)`) eingebunden.
5. **OBB-OBB-Auflösung (2026-07-21).** `Collision.resolveObbObb`: die
   bestehende 15-Achsen-SAT-Prüfung (`_obbObb`) wurde in einen gemeinsamen
   `_axisOverlap(axis,a,b,t)`-Helper refaktoriert (liefert die signierte
   Überlappungstiefe statt nur `boolean`; `_testAxis` nutzt ihn jetzt auch,
   Duplikat entfernt). `resolveObbObb` sucht darüber die Achse mit der
   geringsten Penetrationstiefe (Minimum-Translation-Vector-Verfahren,
   Standardalgorithmus) und liefert den Korrekturvektor. In
   `PhysicsSystem`s Dispatch eingebunden (`(OBB,OBB)`).
6. **`StaticCollider` mit Broadphase verbunden (2026-07-21).** Neues
   `Scene.staticColliders: Collidable[]` (immer initialisiert, flache Liste,
   analog zu `spatialHash`). `YadLevelBuilder.ts` pusht jeden erzeugten
   `StaticCollider` zusätzlich dort hinein.
   `PhysicsSystem._resolveCollisions` liest `scene.staticColliders`
   zusätzlich zum `Object3D`-Szenengraph in `_allColliders` ein (gemeinsamer
   `_trackColliderBounds()`-Helper für die Welt-AABB-Verfolgung, ersetzt den
   vorher inline duplizierten Code). Da `StaticCollider` kein `Object3D` ist
   (kein `rigidBody`/`position`), wurde die Haupt-Kollisionsschleife um eine
   `otherObj instanceof Object3D`-Weiche ergänzt (`otherAsBody`) —
   `_allColliders`/`_broadphaseFallback`/`_collisionEvent.objectB` sind
   entsprechend von `Object3D[]`/`Object3D` auf `Collidable[]`/`Collidable`
   verallgemeinert. Sieben neue Tests (Sphere-OBB Erkennung/Auflösung/
   Inside-Case, OBB-OBB Auflösung/Negativfall in `Collision.test.ts`;
   OBB-OBB- und `StaticCollider`-Integration in `PhysicsSystem.test.ts`).
   Ein bestehender Test (`Collision.test.ts`, "should gracefully handle
   unhandled collision permutations") wurde durch einen dedizierten Test
   für Box-OBB ersetzt (siehe unten).
7. **Box-OBB Erkennung und -Auflösung (2026-07-22).** Erkennung (`_boxObb`)
   und Auflösung (`resolveBoxObb`) implementiert. Ein statisches, virtuelles
   `_tempBoxObb` wird genutzt, um Zuweisungen pro Frame (Zero-Alloc) zu
   vermeiden und den bestehenden OBB-OBB SAT-Algorithmus wiederzuverwenden.
   Integriert in `Collision.test()` und `PhysicsSystem._resolveCollisions()`.
   Lint, `build:lib` und volle Testsuite (180 Tests) grün.
8. **Zwei getrennte volle Szenengraph-Durchläufe pro Frame behoben (2026-07-23).**
   `step()` (vormals `_collectBodiesRecursive`) und `_resolveCollisions()` (vormals
   `_collectCollidersRecursive`) iterieren nicht länger zweimal unabhängig über `scene.objects`.
   Es gibt jetzt eine einzige Methode `_collectRecursive(obj, bodies, colliders)`, die beide Listen in einem einzigen
   Szenengraph-Walk aufbaut. Die Signatur von `_resolveCollisions` wurde entschlackt (`(bodies, allColliders)`), und
   die betroffenen Tests wurden angepasst.

### Noch offen

(Keine offenen Punkte mehr in dieser Kategorie.)

### Bewusst nicht geplant (Design-Entscheidung, kein Bug)

- **Kein echter Zero-Alloc-Octree.** `OctreeNode.clear()`/`_subdivide()`/
  `queryVolume()` allozieren weiterhin neue Arrays/Nodes/Vektoren pro Frame
  — bewusste Entscheidung (siehe Plan-Dokument Entscheidung 3: Octree wird
  von drei weiteren Subsystemen genutzt, ein Umbau vergrößert die
  Regressionsfläche für einen heute unbelegten Nutzen). Nur als Folge-Task
  zu behandeln, falls Profiling einer echten laufenden App das rechtfertigt.
- **`SpatialHash` bleibt 2D (XZ-only), ohne `remove()`/Update-API.**
  Bewusst so gebaut für YAD-artige statische Grid-Level (eigener Docstring:
  "for grid-based games like YAD"), keine generische 3D-Broadphase-
  Alternative zum Octree geplant.
- **`YadApp.ts` nicht auf `PhysicsSystem` migriert.** Bewusste Entscheidung
  — siehe Abschnitt 5.

---

## 2. Core / Behaviors / Cameras

### Noch offen

1. **`Raycaster.intersectObjects` ohne räumliche Beschleunigung**
   (`src/physix/Raycaster.ts:59-99`) — reiner linearer Scan vor dem
   Möller-Trumbore-Test. **Einschränkung beim Review:** fraglich, ob das
   überhaupt noch ein Bug ist — `InteractionManager.ts` filtert vor dem
   `Raycaster`-Aufruf bereits über `staticOctree`/`dynamicOctree.queryRay(...)`
   und reicht nur die grob vorgefilterte Kandidatenliste weiter
   (`InteractionManager.ts:54-78`). `Raycaster` selbst ist dann bewusst die
   Narrowphase — die Beschleunigung existiert bereits, nur eine Ebene höher
   als ursprünglich im Finding vermutet. Nicht als eigenständige Lücke
   weiterverfolgt, ohne dass jemand bestätigt, dass eine
   Raycaster-interne Beschleunigung tatsächlich zusätzlichen Nutzen hätte.

### Bereits behoben (in der Original-Analyse noch als Bug gelistet)

- **`OBB.intersectsFrustum` exakter 8-Eckpunkte-Test (2026-07-22).** Der alte,
  konservative Bounding-Sphere-Test wurde durch einen exakten Projektions-Test ersetzt
  (Projektion der OBB-Halbachsen auf die Frustum-Ebenen-Normalen). Zero-Alloc.

- **DI-Parität `FirstPersonController`/`FPSController` behoben
  (2026-07-21).** `FirstPersonController` akzeptiert jetzt ebenfalls ein
  optionales `input?: InputInterface` (Default `Input.instance`), analog zu
  `FPSController`. Alle `Input.isPressed(...)`-Aufrufe in `update()` wurden
  durch `this._options.input.isPressed(...)` ersetzt. Lint, `build:lib` und
  volle Testsuite (173 Tests) grün.
- **Non-Null-Assertion-Konzentration in `Matrix4.ts`/`Collision.ts`/
  `Quaternion.ts` behoben (2026-07-21).** ~140 rohe `arr[i]!`-Lesezugriffe
  (Float32Array-Komponenten bzw. feste 3-elementige `axes`-Arrays) wurden
  durch einen zentralen Helper `MathUtils.at<T>(arr, index)`
  (`src/math/MathUtils.ts`) ersetzt, der die `noUncheckedIndexedAccess`-
  Vertrauensgrenze an einer einzigen Stelle bündelt statt sie an ~140
  Call-Sites zu wiederholen. Mechanische Ersetzung per Skript, danach
  Prettier/ESLint und volle Bausschaftskette gegen den Diff verifiziert.
  **Ausnahme bewusst nicht ersetzt:** 9 Stellen in `Matrix4.decompose()`
  (`m.data[i]! *= invSX/invSY/invSZ`) — dort ist `arr[i]!` ein gültiges
  Zuweisungsziel (TS erlaubt Non-Null-Assertions als Lvalue), ein
  Funktionsaufruf wie `MathUtils.at(...)` aber nicht (`TS2364`); diese
  bleiben als direkter Array-Zugriff mit `!` stehen, mit Kommentar
  begründet. Zwei weitere, thematisch andere Assertions
  (`Matrix4.scale`s `target!`/`z!`, optionale Parameter statt
  Array-Index) blieben unangetastet — außerhalb des Findings-Scopes.
  Lint, `build:lib` und volle Testsuite (173 Tests) grün; keine
  Laufzeit-Verhaltensänderung (reine Lese-Wrapper).
- **`FirstPersonController`/`FPSController`-Duplikation behoben
  (2026-07-21).** Die wortgleiche `_resolveCollisions()` wurde in eine
  gemeinsame freie Funktion `resolveSphereCollisions(collider, target, scene)`
  extrahiert (`src/core/behaviors/CollisionResolution.ts`). Beide Klassen
  rufen sie jetzt mit ihrem eigenen `_collider`/`target`/`this._options.scene`
  auf; Verhalten (inkl. Guard-Klausel und Frame-Reihenfolge) unverändert.
  Import in beiden Aufrufern per direktem Dateipfad
  (`./CollisionResolution.js` bzw. `../behaviors/CollisionResolution.js`),
  nicht über den `behaviors/index.js`-Barrel — dieselbe
  Zirkularimport-Vorsicht wie beim `addBehavior`/`removeBehavior`-Fix.
  Zusätzlich `FPSController.ts`s `Behavior`-Import von
  `../behaviors/index.js` auf `../behaviors/Behavior.js` umgestellt (war
  bereits ein echter Wert-Import wegen `extends Behavior`, jetzt ebenfalls
  ohne Barrel-Umweg). Die DI-Inkonsistenz beim `InputInterface` bleibt
  offen (siehe oben). Lint, `build:lib` und volle Testsuite (173 Tests)
  grün.
- **`addBehavior`/`removeBehavior`-Duplikation behoben (2026-07-21).** Die
  byte-identische Logik aus `Object3D.ts` und `Camera.ts` wurde in zwei
  gemeinsame freie Funktionen `attachBehavior(behaviors, behavior, target)`
  und `detachBehavior(behaviors, behavior)` extrahiert
  (`src/core/behaviors/Behavior.ts`, direkt neben der `Behavior`-Klasse).
  Beide Klassen rufen sie jetzt auf und geben weiterhin `this` zurück.
  **Wichtige Nebenerkenntnis:** ein direkter Import aus dem
  `behaviors/index.js`-Barrel hätte einen echten Laufzeit-Zirkularimport
  ausgelöst (`Class extends value undefined`, u. a. in `AbstractLight.ts`) —
  vorher war `Behavior` in `Object3D.ts`/`Camera.ts` nur ein reiner
  Typ-Import (zur Build-Zeit weggelassen), `attachBehavior`/`detachBehavior`
  sind aber echte Laufzeit-Funktionswerte, die sonst den kompletten
  `behaviors/`-Barrel (~20 Dateien) in den Modulgraphen hineingezogen
  hätten. Fix: Import direkt aus `./behaviors/Behavior.js`, nicht über den
  Barrel. Camera erbt weiterhin nicht von Object3D (kein Mixin) — bewusst
  minimal-invasiv, keine Vererbungshierarchie eingeführt. Lint, `build:lib`
  und volle Testsuite (173 Tests) grün.
- **Duplizierter Constraint-Clamping-Block behoben (2026-07-21).** Der
  identische `if (min && max) / else if (min) / else if (max)`-Block aus
  `FPSStrategy.ts`, `SmoothStrategy.ts` und `StiffStrategy.ts` wurde in
  einen gemeinsamen `clampVector(vector, constraints)`-Helper extrahiert
  (`src/core/cameras/strategies/CameraStrategyUtils.ts`). `FPSStrategy`
  ruft ihn mit `camera.position` auf, `SmoothStrategy`/`StiffStrategy` mit
  `camera.target` — Verhalten unverändert, nur die Duplikation entfernt.
  Lint, `build:lib` und volle Testsuite (173 Tests) grün.
- `Object3D.lookAt()` weist das Ergebnis inzwischen korrekt `this.rotation`
  zu (`Object3D.ts:163-174`) — war zuvor ein No-Op.
- `updateMatrixWorld()` hat kein vestigiales `force`-Parameter mehr
  (`Object3D.ts:176`).
- `CameraStrategyFactory.get()` wirft bei unbekanntem Typ jetzt konsistent
  (wie `CameraEffectFactory.create()`), statt still auf `MANUAL`
  zurückzufallen (`CameraStrategyFactory.ts:27-29`).
- `ObliqueProjection` implementiert inzwischen eine echte Scherungsmatrix
  (`ObliqueProjection.ts:104-121`), ist nicht mehr identisch zu
  `OrthographicProjection`.

---

## 3. Renderer-Stack (WebGL1/WebGL2/WebGPU)

### Noch offen

(Keine offenen Punkte mehr in dieser Kategorie.)

### Bereits behoben (in der Original-Analyse noch als Bug/Lücke gelistet)

- **WebGL1/WebGL2 Render-Pipeline Pass-System (2026-07-22).** Die monolithischen
  `render()`-Schleifen wurden in die Basisklasse `AbstractWebGLRenderer` gezogen
  und in ein modulares Pass-System (`WebGLRenderPass`, `WebGLMainPass`,
  `WebGLShadowPass`, `WebGLPostProcessPass`) refaktoriert, analog zur WebGPU-Symmetrie.
- **`UniformPacker` Integration verworfen (2026-07-22).** Bewusste Design-Entscheidung:
  Auf WebGL führt das serielle Entpacken zu Overhead. Die nativen API-Aufrufe
  (gl.uniform*) sind für den aktuellen Shader-Aufbau performanter.

- WebGPU hatte laut alter Analyse "keinen Shadow-Code" — inzwischen echtes
  Cascaded/Spot-Shadow-Mapping vorhanden (`CascadedShadowPassGPU`,
  `SpotShadowPassGPU`, als Passes registriert, `WebGPURenderer.ts:34-35,280-281`).
- `QuantizeElement` war über die öffentliche Config-API unerreichbar —
  inzwischen im `PostProcessingGroup`-Konstruktor automatisch hinzugefügt und
  per `config.quantize` vollständig durchverdrahtet (`PostProcessingGroup.ts:35,118-124`).
- `AbstractWebGLRenderer.destroy()` selbst räumt nur `WEBGL_lose_context`
  auf, aber `WebGL1Renderer`/`WebGL2Renderer` überschreiben `destroy()`
  vollständig und geben Programme/Texturen/FBOs/Mesh-Buffer frei
  (`WebGL1Renderer.ts:818-852`) — kein echtes Leck.
- `WebGPURenderer` hatte laut alter Analyse kein `destroy()`-Override —
  inzwischen vollständige Implementierung (`WebGPURenderer.ts:1640-1692`),
  die alle Caches, Buffer, Texturen und zuletzt das Device selbst zerstört.
- `CoreShaderChunks.ts` enthält keine `FORCE_REBUILD`-Cache-Busting-Kommentare
  mehr.
- `RendererFactory.ts` loggt nur noch englische Strings.

---

## 4. Materials / Loaders / Forge-Tools

### Bewusst nicht geplant (Design-Entscheidung, kein Bug)

- **`ComputeToysImporter` bleibt eine selbst-beschriftete Heuristik**
  (`ComputeToysImporter.ts:9,14`, "Basic heuristic") — Regex-basierte
  WGSL-Transformation, fragil bei mehrzeiligen/verschachtelten
  `textureStore`-Aufrufen. Eine echte Behebung wäre ein vollständiger
  WGSL-Parser — weit außerhalb des Scopes einer Cleanup-Passage, und der
  Code benennt seine eigene Einschränkung bereits ehrlich.
- **Xtractor.ts "KI-Chat"-Panel ist ein expliziter Mock/Stub**
  (`Xtractor.ts:739-745`, `@DEVELOPER_NOTE`) — keine echte AI-API
  angebunden, ehrlich als Platzhalter markiert. "Beheben" würde eine
  echte AI-API-Anbindung (Auswahl, Keys, Kosten) bedeuten — eine
  Produktentscheidung, nicht ein Cleanup.

### Bereits behoben (in der Original-Analyse noch als Bug gelistet)

- **`AbstractMaterial`/`ShaderRegistry` stilles Überschreiben behoben
  (2026-07-21).** `ShaderRegistry.registerProvider()` loggt jetzt
  `console.debug` bei Kollision, analog zum bereits vorhandenen Verhalten
  von `register()` (`ShaderRegistry.ts:48-53`). `AbstractMaterial.ts:37`s
  Selbstregistrierung im Konstruktor bleibt unverändert (weiterhin
  harmlos, da alle Instanzen eines Typs denselben Shader emittieren),
  aber eine Kollision ist jetzt sichtbar statt stumm.
- **Duplizierte `folderPath`-Ableitung behoben (2026-07-21).** Gemeinsamer
  `protected static getFolderPath(url)`-Helper auf `AbstractLoader`
  (`src/loaders/AbstractLoader.ts`), genutzt von `ObjLoader`, `MtlLoader`
  und `GltfLoader` (beide Call-Sites) statt jeweils eigenem
  `url.substring(0, url.lastIndexOf("/") + 1)`.
- `getRenderManifest()`-Duplikation über sechs Materialien — inzwischen
  gemeinsamer Helper `_createBaseManifest()`/`_syncBaseManifestState()` in
  `AbstractMaterial.ts:52-125`, von allen sechs Materialien genutzt.
- `ObjLoader` produzierte bei fehlerhaften `f`-Zeilen stille NaN-Positionen —
  validiert jetzt explizit (`Number.isFinite`, Bounds-Check) und fällt mit
  `console.warn` auf `(0,0,0)` zurück (`ObjLoader.ts:171-180`).
- `AssetManager`s deutschsprachiger Fallback-Fehlerstring ist jetzt englisch
  (`"[AssetManager] Fallback failed: ${url}"`).
- `MtlLoader` hatte inkonsistentes try/catch (nur um `map_Kd`, nicht um
  `map_Bump`) — beide Texturlade-Pfade sind jetzt gleich abgesichert.
- `ForgeWindow`s `localStorage`-Key war nach Titel-String gekeyt
  (Kollisionsrisiko) — jetzt eigener `persistenceKey`-Parameter, alle
  Call-Sites in `SmallWorld.ts` übergeben stabile IDs statt Titel.

---

## 5. Apps/Yad & Extensions

### Noch offen

(Keine offenen Punkte mehr in dieser Kategorie.)

### Bewusst nicht geplant (Design-Entscheidung, kein Bug)

- **YAD nutzt bewusst kein `PhysicsSystem`.** `YadController.ts` und
  `EnemyBehavior.ts` lösen Kollision/Pickup/Damage weiterhin über
  `scene.staticOctree`/`spatialHash`-Queries plus manuelle
  Distanzberechnung, nicht über die engine-eigene `PhysicsSystem` (siehe
  Abschnitt 1) — dokumentierte, bewusste Design-Entscheidung.
- **YAD nutzt bewusst kein StateMachine/FSM-Modul für Gegner** — explizit
  dokumentiert in `docs/guides/custom-game.md:88` ("YAD does not use the
  engine's `StateMachine`/FSM module for enemies — but it's available").
  Kein Pathfinding, reine Distanz-Verfolgung, so beabsichtigt.

### Bereits behoben (in der Original-Analyse noch als Bug gelistet)

- **`YadApp.ts` Prototyping-Kommentare behoben (2026-07-22).** Veraltete Kommentare zu `lavaNoiseMap` entfernt.
- **`EnemyBehavior.ts`-Inline-Imports und Magic-Number behoben
  (2026-07-21).** Die Ad-hoc-Inline-Type-only-Imports
  (`import("../../physix/index.js").BoundingSphere`/`BoundingBox`,
  `import("../../interfaces/index.js").Collidable`) wurden durch normale
  Top-Level-Imports ersetzt (`BoundingSphere` war bereits importiert, jetzt
  ergänzt um `BoundingBox`, `Collidable`, `BoundingType`). Der
  Magic-Number-Vergleich `obj.bounds.type === 0 /* BoundingType.SPHERE */`
  wurde zu `BoundingType.SPHERE === obj.bounds.type` (Enum statt Zahl,
  Yoda-Vergleich). Verhalten unverändert. Lint, `build:lib` und volle
  Testsuite (173 Tests) grün.
- `YadController.ts` identifizierte Objekte früher stringly-typed über
  `obj.name.startsWith("Enemy"/"Wall"/"Item_")` — nutzt jetzt ein typisiertes
  Tag-System (`obj.tag === YadObjectTags.ENEMY/DOOR/ITEM/LAVA/SLIME`).
- `YadLevelBuilder.ts` enthielt einen deutschsprachigen internen
  Debug-Kommentar zur Lava-Boden-Logik — die gesamte Datei ist inzwischen
  durchgehend englisch kommentiert.

---

## Hinweis zur Quelle & Methodik

Der ursprüngliche Broadphase-Plan (`physics-broadphase-plan.txt`) trug den
Kopf „Analyse- & Planungsdokument (noch nicht implementiert)" — bereits vor
der letzten Session veraltet, da die Umsetzung längst erfolgt war. Bei der
Einarbeitung von `codebase-analysis-research-findings.txt` stellte sich
heraus, dass etwa die Hälfte der ursprünglich gemeldeten Befunde (u. a.
`lookAt()`-No-Op, OBB-Intersection-Stubs, mehrere deutschsprachige Strings,
fehlende `destroy()`-Implementierungen, Material-Manifest-Duplikation,
YadController-Stringly-Typing) inzwischen bereits gefixt war. **Lehre:** Bei
älteren Analyse-/Plan-Dokumenten immer gegen den tatsächlichen Quellcode
verifizieren, nicht gegen den Dokumenten-Stand selbst.
