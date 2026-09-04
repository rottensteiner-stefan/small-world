# Continuous Review: Core Foundations & Math -- Änderungen der letzten 48h (Basis: `1d70c608..HEAD`)

**Reviewer:** Agent A · **Status:** ⚠️ mit einem kritischen Fund fertig

Legende: 🔴 kritisch (Bug/Korrektheit) · 🟠 fragil/Architektur-Risiko · 🟡 Stil/Cleanup/tote Fläche · 🟢 Test-Lücke · ✅ positiv

Scope: `src/core/*.ts`, `src/core/animation/**`, `src/core/behaviors/**`, `src/core/events/**`,
`src/core/cameras/CameraStrategyFactory.ts`, `src/environment/**`, `src/math/MathUtils.ts`,
`src/core/index.ts`. Diff-Basis: `git diff 1d70c608..HEAD` (48h-Fenster, 2026-09-02 20:04 bis
2026-09-04). Jede betroffene Datei wurde in ihrer aktuellen Vollversion gelesen, nicht nur der Hunk.

---

## Verifikation der 4 im letzten Review (2026-09-03) gefundenen kritischen Bugs

### ✅ 1. `Object3D.lookAt()` schrieb nur Euler-`rotation`, ignorierte `quaternion` -- FIX VERIFIZIERT KORREKT

**Fundort:** `src/core/Object3D.ts:270-284`.

```ts
public lookAt(target: Vector3D, up: Vector3D = new Vector3D(0, 1, 0)): this {
  const m = MathPool.acquireMatrix();
  Matrix4.lookAt(this.position, target, up, m);
  m.invert();
  const pos = MathPool.acquireVector();
  const scale = MathPool.acquireVector();
  m.decompose(pos, this.rotation, scale);
  if (this.quaternion) {
    this.quaternion.setFromRotationMatrix(m);
  }
  ...
}
```

Der Fix synchronisiert `quaternion` aus **derselben** (bereits invertierten) Matrix `m`, aus der auch
`this.rotation` per `decompose()` gewonnen wird -- beide Repräsentationen bleiben also konsistent,
kein Rundungs-/Reihenfolge-Mismatch zwischen Euler und Quaternion. Per Vitest-Repro bestätigt
(`Object3D` mit `position=(0,0,0)`, `lookAt(new Vector3D(10,0,0))`, `updateMatrixWorld()`): die lokale
`-Z`-Achse der resultierenden `worldMatrix` zeigt exakt zum Ziel (`dot(-Z, towardTarget) = 1`,
`dot(+Z, towardTarget) = -1`) -- unabhängig davon, ob vorher ein `quaternion` gesetzt war oder nicht.
`tests/core/Object3D.test.ts` deckt das ab und ist grün (`npx vitest run tests/core/Object3D.test.ts`).

Nebenbefund (kein neuer Bug, aber wichtig fürs Verständnis der Engine-Konvention, siehe Fund weiter
unten zu `BillboardInstancer`): `Object3D.lookAt()` orientiert so, dass die **lokale `-Z`-Achse** zum
Ziel zeigt (Standard-Kamerakonvention). Wer `lookAt()` für ein Objekt nutzt, dessen sichtbare
Vorderseite `+Z` ist (z.B. `Plane`-Geometrie, siehe `src/geometry/Plane.ts:18`: *"facing +Z"*), muss
das selbst kompensieren -- `lookAt()` tut das nicht automatisch. Details siehe 🔴-Fund unten.

### ✅ 2. `Input.ts` hatte ~15 `window`/`document`-Listener ohne `destroy()`-Pfad -- FIX VERIFIZIERT KORREKT UND VOLLSTÄNDIG

**Fundort:** `src/core/Input.ts:65-231`.

Alle 15 vormals anonymen Inline-Closures (`keydown`, `keyup`, `mousedown`, `mouseup`, `mousemove`,
`wheel`, `gesturechange`, `contextmenu`, `blur`, `pointerlockchange`, `touchstart`, `touchmove`,
`touchend` -- `gamepadconnected`/`gamepaddisconnected` wurden komplett entfernt, da sie ohnehin nur
leere No-op-Bodies hatten) sind jetzt benannte Klassenfelder (`_onKeyDown`, `_onMouseDown`, ...).
`init()` ist idempotent (`_isInitialized`-Guard, kein doppeltes Registrieren bei zweitem Aufruf),
`destroy()` ist ebenfalls idempotent und entfernt **jeden einzelnen** der 13 verbliebenen Listener mit
exakt derselben Funktionsreferenz, leert `_keys` und ruft `this._gamepadController.destroy()` auf
(stoppt dessen `setInterval`-WebHID-Polling, siehe unten). `SmallWorld.destroy()` (`SmallWorld.ts:393-395`)
ruft `this.input.destroy()` korrekt auf. Geprüft: `grep` über alle 13 `addEventListener`-Aufrufe in
`init()` gegen die 13 `removeEventListener`-Aufrufe in `destroy()` -- 1:1-Deckung, keine Lücke.

`UniversalGamepadController.destroy()` (`src/core/UniversalGamepadController.ts:217-222`) räumt den
`setInterval`-Handle für das WebHID-Polling korrekt auf (per `clearInterval`). Kleine Einschränkung
(kein neuer Bug, da vorher gar keine Cleanup-Möglichkeit existierte): bereits `joyCon.open()`-geöffnete
WebHID-Gerätehandles werden nicht per `joyCon.close()` freigegeben -- für den eigentlichen Zweck der
Behebung (Memory-Leak durch nie gestopptes Poll-Intervall pro `SmallWorld`-Instanz) ist das aber
irrelevant, da der Interval-Leak der eigentliche kritische Pfad war.

`tests/core/Input.test.ts` (`Lifecycle & Listener Cleanup`-Describe-Block) verifiziert konkret:
`init()` → `keydown` dispatchen → Zustand ändert sich → `destroy()` → derselbe `keydown` erneut
dispatchen → Zustand ändert sich **nicht** mehr. Test grün.

### ✅ 3. `PlanarReflectionNode` setzte `up` NACH `updateViewMatrix()` -- FIX VERIFIZIERT KORREKT

**Fundort:** `src/core/PlanarReflectionNode.ts:56-83`.

Die Reihenfolge ist jetzt: Position spiegeln → Target spiegeln → **`up` spiegeln** → erst danach
`this.mirrorCamera.updateViewMatrix()`. Der Kommentar an Ort und Stelle (`"must be set BEFORE
updateViewMatrix"`) macht die Absicht explizit. `tests/core/PlanarReflectionNode.test.ts` existiert
und ist grün.

Zusätzlicher, sauber gelöster Fund im selben Zeitfenster (kein Teil der ursprünglichen 4, aber im
selben File): `excludedObjects: Object3D[]` wurde ergänzt, um Objekte, deren Material
`renderTarget` selbst sampelt (typischerweise die Spiegel-Mesh-Fläche), während des
Reflexions-Sub-Renders korrekt unsichtbar zu schalten -- inklusive korrektem Save/Restore der
ursprünglichen `isVisible`-Werte per Index-Zuordnung (`excludedWasVisible[i]`). Sauber implementiert,
keine Restore-Lücke gefunden (auch nicht bei leerem Array).

### ✅ 4. `EventDispatcherImpl.dispatchEvent()` alloziert bei jedem Call ein neues Array -- FIX VERIFIZIERT KORREKT

**Fundort:** `src/core/events/EventDispatcherImpl.ts`.

Die Lösung ist ein klassisches Copy-on-Write mit einem `_dispatchDepth`-Zähler: `dispatchEvent()`
iteriert jetzt per Index direkt über das Original-Array (keine `.slice(0)` mehr) und inkrementiert/
dekrementiert `_dispatchDepth` per `try/finally` (auch bei einer werfenden Listener-Callback bleibt
der Zähler korrekt balanciert). `addEventListener`/`removeEventListener` kopieren das Array **nur**,
wenn `_dispatchDepth > 0` ist, d.h. nur während eine Dispatch-Iteration für genau diesen `eventName`
gerade läuft -- der Normalfall (kein Add/Remove während des Dispatchs) bleibt vollständig
allokationsfrei. Re-entrante verschachtelte `dispatchEvent()`-Aufrufe (Listener von Event A feuert
Event B) funktionieren korrekt, da jeder Aufruf seine eigene lokale `listeners`-Referenz hält und
`_dispatchDepth` global über alle Event-Namen hinweg zählt (kein Cross-Event-Interferenz-Bug, da COW
pro Aufruf ohnehin nur den betroffenen `eventName`-Eintrag der Map ersetzt).

Semantik-Nuance (unverändert gegenüber dem alten `.slice(0)`-Verhalten, also **keine Regression**):
Entfernt Listener A während der Dispatch-Iteration einen noch nicht aufgerufenen Listener B, wird B
in diesem Durchlauf trotzdem noch aufgerufen, weil die laufende Schleife über die alte (unveränderte)
Array-Referenz iteriert und die COW-Kopie erst für den *nächsten* `dispatchEvent()`-Aufruf sichtbar
wird. Das ist dasselbe Verhalten wie vorher mit `.slice(0)` und entspricht der in
`tests/core/EventDispatcherImpl.test.ts` explizit getesteten und dokumentierten Erwartung
("handles self-removal during dispatch safely via copy-on-write" -- prüft genau dieses Verhalten).
4 Tests, alle grün, decken Basis-Dispatch, Selbst-Entfernung, Hinzufügen während Dispatch und
Re-Entrance ab -- eine der saubersten Testabdeckungen der 4 Fixes.

**Fazit zu den 4 priorisierten Fixes: alle vier sind vollständig und korrekt, keiner nur
oberflächlich behoben, keine neuen Bugs durch die Fixes selbst eingeführt.**

---

## Neue Funde in diesem 48h-Fenster

### 🔴 `BillboardInstancer`: sphärischer (nicht Y-achsen-fixierter) Modus zeigt die Rückseite zur Kamera -- verifizierter 180°-Orientierungsfehler

*(✅ Behoben: `this._scratchRot.y += Math.PI` nach dem `copyFrom()` in `src/core/BillboardInstancer.ts` ergänzt -- genau die im "Fix-Richtung"-Absatz unten zuerst genannte Variante. Zwei neue Regressionstests in `tests/core/BillboardInstancer.test.ts` bestätigen, dass `axisLocked: false` jetzt denselben Yaw liefert wie `axisLocked: true` für dieselbe Kameraposition.)*

**Fundort:** `src/core/BillboardInstancer.ts:125-135` (neue Datei, `axisLocked: false`-Zweig).

```ts
if (this._axisLocked) {
  // Plane geometry lies in the local XY plane, facing +Z ... yaw-only billboard formula
  const dx = camera.position.x - x;
  const dz = camera.position.z - z;
  this._scratchRot.set(0, Math.atan2(dx, dz), 0);
} else {
  this._lookAtHelper.position.set(x, y, z);
  this._lookAtHelper.lookAt(camera.position);
  this._scratchRot.copyFrom(this._lookAtHelper.rotation);
}
```

`Object3D.lookAt()` (siehe Verifikation von Fund 1 oben) orientiert ein Objekt so, dass seine
**lokale `-Z`-Achse** zum Ziel zeigt -- Standard-Kamerakonvention. Die von `BillboardInstancer`
verwendete `Plane`-Geometrie hat aber laut eigenem Doc-Kommentar (`src/geometry/Plane.ts:18`:
*"A vertical flat plane geometry on the X-Y plane, facing +Z"*) ihre sichtbare Vorderseite auf
`+Z`. Der `axisLocked: true`-Zweig kompensiert das korrekt selbst (eigene `atan2(dx, dz)`-Formel,
die explizit `+Z` als Vorderseite annimmt -- der Kommentar sagt das auch ausdrücklich). Der
`axisLocked: false`-Zweig delegiert dagegen an `Object3D.lookAt()`, das `-Z` zum Ziel zeigt -- exakt
180° in die falsche Richtung für dieselbe Geometrie.

**Verifiziert per Wegwerf-Vitest-Test** (`tests/_scratch_billboard2.test.ts`, danach gelöscht): Zwei
`BillboardInstancer`-Instanzen (eine `axisLocked: true`, eine `axisLocked: false`), identische
Position `(0,0,0)`, identische Kamera bei `(5,0,0)`. Ergebnis: `axisLocked: true` liefert `yaw =
+π/2` (rotiert die `+Z`-Vorderseite korrekt zur Kamera, deckt sich mit dem bereits existierenden Test
`tests/core/BillboardInstancer.test.ts:56-63`, der genau diesen Fall für `axisLocked: true`
erwartet). `axisLocked: false` liefert `yaw = -π/2` -- eine Differenz von exakt `π` (180°) für
dieselbe Kamera-Position. Backface-Culling vorausgesetzt (Standard für opake `StandardMaterial`,
der Default-Material dieser Klasse), wäre die Quad-Fläche bei `axisLocked: false` entweder komplett
unsichtbar oder zeigt ihre unbeleuchtete Rückseite.

**Praktische Relevanz:** `axisLocked: false` ist explizit als API-Option dokumentiert ("spherical
(always dead-on) billboard") für z.B. Partikel/Icons, die auch bei Kamera-Pitch immer volle Deckung
zur Kamera zeigen sollen -- ein realistischer, vom Autor selbst vorgesehener Use Case, nicht nur ein
theoretischer Pfad. Es existiert **kein** Test für `axisLocked: false` (siehe Testlücke unten) --
der Bug wäre durch einen einzigen zusätzlichen Testfall analog zum vorhandenen `axisLocked: true`-Test
sofort aufgefallen.

**Fix-Richtung:** Entweder in der `else`-Branch das Ergebnis um `π` um die Y-Achse drehen (`this.
_scratchRot.y += Math.PI` nach dem `copyFrom`), oder -- sauberer -- `_lookAtHelper` mit einer
Hilfsposition aufrufen, die den Effekt umkehrt (z.B. `lookAt()` vom Kamera-Standpunkt aus statt
umgekehrt), oder einen expliziten `+Z`-bewussten Look-at-Helper schreiben statt sich auf
`Object3D.lookAt()`s `-Z`-Konvention zu verlassen, die für Kameras richtig, für `+Z`-Quads aber
falsch ist.

---

### 🟢 Testlücke: `BillboardInstancer`'s sphärischer Modus (`axisLocked: false`) hat keinerlei Testabdeckung

**Fundort:** `tests/core/BillboardInstancer.test.ts` -- alle 5 Tests decken entweder
Pool-Größe/`instanceMatrixNeedsUpdate` ab oder ausschließlich `axisLocked: true`. Der `else`-Zweig
der einzigen nicht-trivialen Verzweigung in `update()` ist zu keinem Zeitpunkt getestet -- der oben
dokumentierte 🔴-Fund wäre mit einem einzigen zusätzlichen Testfall (Analogie zu den zwei
vorhandenen `axisLocked: true`-Tests, aber mit `axisLocked: false`) sofort sichtbar gewesen.

*(✅ Bereits behoben: `tests/core/BillboardInstancer.test.ts` enthält inzwischen zwei
`axisLocked: false`-Tests, analog zu den bestehenden `axisLocked: true`-Fällen -- Kamera entlang `+Z`
(yaw 0) und Kamera seitlich versetzt (yaw `π/2`, identisch zu `axisLocked: true` nach dem
180°-Fix). Beide grün. Diese Tests waren bereits Teil des 180°-Fixes selbst und mussten in dieser
Session nicht mehr ergänzt werden -- verifiziert, keine weitere Aktion nötig.)*

---

### ✅ `CameraStrategyFactory`: von page-weitem Singleton-Cache zu Instanz-pro-Aufruf -- behebt einen realen "No Global Singleton"-Verstoß mit tatsächlichem Mutationsrisiko

**Fundort:** `src/core/cameras/CameraStrategyFactory.ts`.

Vorher hielt die Factory eine **eine** statische `Map<CameraStrategyType, CameraStrategy>` mit genau
einer Singleton-Instanz pro Typ, geteilt über die gesamte Seite. Verifiziert, dass das kein
theoretisches Risiko war: `SmoothStrategy`, `StiffStrategy` und `HybridSyncStrategy` (`src/core/
cameras/strategies/*.ts`) tragen alle echten, pro-Kamera-mutierbaren State (`radius`,
`_isInitialized`, `_lastPosition: Vector3D`). Zwei `SmallWorld`-Instanzen (oder auch nur zwei
`Camera`-Objekte in derselben Instanz) mit z.B. `CameraStrategyType.SMOOTH` hätten sich denselben
`radius`/`_isInitialized`-Zustand geteilt -- eine reale Cross-Instanz-Korruption, kein Edge Case.
Der Fix (`get()` konstruiert jetzt bei jedem Aufruf eine frische Instanz per `switch`) behebt das
korrekt; `get()` wird nachweislich nur bei Strategie-*Wechsel* aufgerufen (`Camera.ts:187`, nicht pro
Frame), also keine Performance-Sorge durch die Objekt-Allokation pro `.get()`-Aufruf.
`tests/core/CameraStrategyFactory.test.ts` verifiziert explizit sowohl `s1 !== s2` bei zwei
`get()`-Aufrufen desselben Typs als auch, dass zwei `Camera`s mit `STIFF`-Strategie unabhängige
`constraints` haben. Sauber gefunden, sauber gefixt, sauber getestet -- auch wenn dieser Fund nicht
Teil der ursprünglichen priorisierten 4 war.

---

### ✅ `DeviceCaps`: throwaway WebGL1/WebGL2-Probe-Kontexte werden jetzt per `WEBGL_lose_context` freigegeben

**Fundort:** `src/core/DeviceCaps.ts:182-267`.

Vorher wurden pro `DeviceCaps`-Instanz zwei `<canvas>`-Elemente mit `webgl`/`webgl2`-Kontext erzeugt,
um GPU-Limits auszulesen, aber nie freigegeben -- da jede `SmallWorld`-Instanz ihre eigene
`DeviceCaps` besitzt (`RendererContext`), leakte das pro Engine-Instanz zwei WebGL-Kontexte. Der Fix
ruft in einem `finally`-Block (läuft auch beim `catch`-Pfad, dort ist `gl`/`gl2` dann `null` und der
Optional-Chain-Aufruf ist ein No-op) `gl?.getExtension("WEBGL_lose_context")?.loseContext()` auf.
Korrekt: Das Auslesen der Limits passiert synchron *vor* dem `finally`, `loseContext()` invalidiert
den Kontext danach, keine Race Condition. Relevanter, gut dokumentierter Fix speziell für Multi-
Instanz-Szenarien (Vergleichs-Showcases mit N Engines nebeneinander) -- exakt das vom Projekt
geforderte Szenario. `tests/core/DeviceCaps.test.ts` existiert.

---

### 🟡 `RatGroomingBehavior._bindNodes()` rät wieder feste Namens-Präfix-Kandidaten statt eines generischen Musters -- reproduziert eine bereits dokumentierte, andernorts behobene Anti-Pattern-Klasse

**Fundort:** `src/core/behaviors/creatures/RatGroomingBehavior.ts:47-63`.

```ts
this._head =
  target.getObjectByName("Head") ||
  target.getObjectByName("Rat1Head") ||
  target.getObjectByName("RatHead");
```

Dieselbe Klasse von Bug wurde laut Projekt-Historie bereits einmal im `AnimationMixer` gefunden und
bewusst behoben ("2-Kandidaten-Präfix-Raten" durch einen generischen Tree-Walk ersetzt, siehe
`AnimationMixer.ts`'s `MIXAMO_RIG_PREFIX_RE`-Kommentar in diesem selben Review-Fenster). Hier wird
dasselbe Muster (mehrere fest verdrahtete Namens-Rateversuche statt eines robusten Matches) neu
eingeführt, statt aus der dokumentierten Lehre zu lernen. **Kein akuter Bug**: `GroomingRat.ts`
konstruiert seine Kinder immer mit exakt den Namen `"Head"`, `"LeftPaw"`, `"RightPaw"`,
`"Tail_0"`..`"Tail_5"` (beide Klassen werden nur gemeinsam ausgeliefert), sodass die zusätzlichen
Rate-Kandidaten (`"Rat1Head"`, `"RatHead"`, ...) aktuell toter Code sind, der nie greift. Wird diese
Behavior aber später (wie im `RatGroomingBehaviorOptions`-Namensschema durchaus nahegelegt) auf ein
extern geladenes Rig (glTF-Import mit abweichender Namenskonvention) angewendet, reproduziert sich
exakt das Bindungsproblem, das beim `AnimationMixer` bereits einmal gefixt wurde. Reine
Konsistenz-/Vorbeugungsempfehlung, keine akute Regression.

*(✅ Behoben: `_bindNodes()` in `src/core/behaviors/creatures/RatGroomingBehavior.ts` nutzt jetzt
einen generischen `_findNodeByName()`/`_findBySuffix()`-Tree-Walk (exakter Treffer zuerst, sonst
Suffix-Match über den Kindbaum) statt der drei fest verdrahteten Namens-Rateversuche pro Knoten --
analog zu `AnimationMixer._findByNormalizedMixamoName()`. Regressionstest ergänzt in
`tests/core/behaviors/GroomingRat.test.ts` ("should bind nodes on a rig that prefixes every name ...
via a generic suffix match"), der ein Rig mit einem Präfix bindet, das auf keiner der alten
Rate-Listen stand. Grün, `tsc` sauber.)*

---

### 🟢 Testlücke: `AnimationMixer`/`KeyframeTrack`-Refactoring (Zero-Alloc-Blending) hat keine dedizierte Testdatei

**Fundort:** kein `tests/core/animation/AnimationMixer.test.ts` bzw. `KeyframeTrack.test.ts`
gefunden (`find tests -iname "*AnimationMixer*" -o -iname "*KeyframeTrack*"` liefert nichts). Der
Umbau von array-basierter Contribution-Sammlung auf inkrementelle Generation-Stamp-States
(`_vecState`/`_quatState` mit `si !== frameIndex`) ist eine nicht-triviale algorithmische Änderung
(inkrementelles gewichtetes Slerp bleibt zwar mathematisch äquivalent zum alten Code -- manuell
nachvollzogen und für korrekt befunden -- aber ungetestet). Konkret ungetestet: Mehrfach-Action-
Blending mit unterschiedlichen Gewichten auf demselben Bone (Crossfade-Szenario), Verhalten wenn ein
Bone in Frame N von einer Action getroffen wird und in Frame N+1 von keiner mehr (Zustand soll
einfrieren, nicht zurückgesetzt werden -- passiert laut Code korrekt via `si`-Vergleich, aber
unverifiziert). Auch `Skeleton.ts`'s neuer Singulär-Matrix-Fallback (`invert()`-Rückgabewert jetzt
geprüft, siehe unten) hat keinen dedizierten Test.

*(✅ Behoben: kein neues `AnimationMixer.test.ts`/`KeyframeTrack.test.ts` angelegt (die bestehende
Konvention bündelt Skelett-/Animations-Tests bereits in `tests/core/animation/Animation.test.ts`,
die u.a. das Multi-Action-Weight-Blending und den Mixamo-Präfix-Fallback bereits abdeckte), aber
genau die zwei konkret genannten Lücken sind jetzt geschlossen: ein neuer Test "should freeze a
bone's pose (not reset it) once no action touches it anymore" verifiziert das Einfrieren via
`si`-Vergleich über zwei `mixer.update()`-Aufrufe, und ein neuer Test "should fall back to identity
when a SkinnedMesh's world matrix is singular" verifiziert `Skeleton.update()`s
`invert()`-Fallback direkt mit einer Nullskalierungs-Matrix. Beide grün.)*

### ✅ `Skeleton.update()`: `Matrix4.invert()`-Rückgabewert wird jetzt geprüft -- behebt den im letzten Review dokumentierten Fund (dort als 🟠, nicht Teil der "4 kritischen")

**Fundort:** `src/core/animation/Skeleton.ts:50-58`.

```ts
if (!invMeshWorld.invert()) {
  invMeshWorld.data.set(this._identityMatrix.data);
}
```

Fällt bei einer singulären `meshWorldMatrix` (z.B. Nullskalierung während eines "Pop-in"-Spawn-
Effekts) jetzt korrekt auf Identity zurück, statt stillschweigend die unveränderte (nicht invertierte)
Matrix weiterzuverwenden. Deckt sich exakt mit der im letzten Review vorgeschlagenen Fix-Richtung.
Kein dedizierter Test (siehe Testlücke oben), aber die Fix-Logik selbst ist bei Lesen des Codes
korrekt.

---

### 🟡 `DraggableBehavior.onDetach()` löscht `onPointerDown`/`onPointerUp`/`onPointerMove` weiterhin ohne Identity-Check -- inkonsistent zum neuen `HoverBehavior`-Muster im selben Zeitfenster

**Fundort:** `src/core/behaviors/DraggableBehavior.ts:65-72` vs. `src/core/behaviors/HoverBehavior.
ts:59-75` (siehe ✅-Abschnitt unten für den `HoverBehavior`-Fix).

`HoverBehavior.onDetach()` wurde in diesem Zeitfenster bewusst um einen Identity-Check erweitert,
genau damit ein `onDetach()` nicht die Pointer-Callback-Slots einer *anderen*, später attachten
Behavior überschreibt (dokumentiert und mit eigenem Test abgedeckt, siehe
`tests/core/behaviors/HoverBehavior.test.ts:38-49`, *"does not clobber a different behavior's
pointer handlers set after it"*). `DraggableBehavior.onDetach()` (unverändert in diesem Diff bis auf
eine `MathPool`-Zeile) setzt `onPointerDown`/`onPointerUp`/`onPointerMove` weiterhin bedingungslos
auf `undefined`, ohne zu prüfen, ob der aktuell gesetzte Handler tatsächlich noch der eigene ist.
Kein neuer Bug in diesem Zeitfenster (Datei war schon vorher so), aber die im selben Fenster an
anderer Stelle bewusst behobene Klasse von Bug (Callback-Clobbering beim Detach) besteht hier
unverändert fort -- unter demselben Single-Slot-Callback-Mechanismus (`onPointerDown`/`Up`/`Move`
laufen beide über `Object3D`s `_pickingBehavior`-Getter/Setter). Erwähnt als Konsistenz-Hinweis für
eine künftige Session, kein akuter Fund dieses Reviews.

*(✅ Behoben: `DraggableBehavior` speichert die in `onAttach()` verdrahteten
`onPointerDown`/`onPointerUp`/`onPointerMove`-Closures jetzt als private Felder und `onDetach()`
prüft vor dem Löschen per Identity-Check (`this.target.onPointerDown === this._onPointerDown`,
etc.), exakt analog zu `HoverBehavior.onDetach()`. Regressionstest ergänzt in neuer Datei
`tests/core/behaviors/DraggableBehavior.test.ts` (Basis-Cleanup, "does not clobber a different
behavior's pointer handlers set after it" analog zu `HoverBehavior.test.ts`, sowie ein
Verhaltenstest, dass ein verirrter Pointer-Move nach Detach nichts mehr bewegt). Alle grün.)*

---

### ✅ `InteractionManager`: `pickables`-Array jetzt wiederverwendetes Feld + `Set` statt `Array.includes()` -- behebt den im letzten Review dokumentierten Fund exakt wie vorgeschlagen

**Fundort:** `src/core/InteractionManager.ts:16-17, 50-51, 63-69`.

Genau die im letzten Review vorgeschlagene Fix-Richtung wurde umgesetzt: `_pickables: Object3D[]`
und `_pickableSet: Set<Object3D>` sind jetzt private Instanzfelder, pro `update()`-Aufruf nur
`.length = 0` bzw. `.clear()` statt Neuallokation, und die Dedup-Prüfung läuft über `Set.has()`
(O(1)) statt `Array.includes()` (O(n)). Kein neuer Bug gefunden.

---

### ✅ `FrustumCuller`: von statischer Klasse zu Instanz -- behebt den im letzten Review dokumentierten "No Global Singleton"-Verstoß

**Fundort:** `src/core/FrustumCuller.ts` (komplett von `static` auf Instanzmethoden/-felder
umgestellt), `src/core/SmallWorld.ts:74` (`private readonly _frustumCuller: FrustumCuller = new
FrustumCuller();`) und alle Call-Sites in `SmallWorld.ts` (`_loop()`) entsprechend angepasst.
`lastVisibleCount`/`lastIntersectedNodes` sind jetzt pro `SmallWorld`-Instanz isoliert, keine
Cross-Instanz-Sichtbarkeit von Debug-Statistiken mehr. `tests/core/OcclusionCulling.test.ts`
instanziiert `new FrustumCuller()` direkt und ist grün. Sauberer, vollständiger Fix.

---

### 🟡 `CloneUtils.shallowCloneWithValueTypes()`: neue Array/TypedArray/Plain-Object-Zweige sind nur eine Ebene tief -- dokumentiertes, aber leicht zu übersehendes Verhalten

**Fundort:** `src/core/CloneUtils.ts:39-59`.

Die Erweiterung (Arrays, TypedArrays und Plain-Object-Literale werden jetzt geklont statt geteilt,
vorher nur `Vector3D`/`Quaternion`/`Color`) ist eine echte Verbesserung -- vorher hätte
`clone().someArrayProp.push(x)` das Original mutiert, was mit den neuen Tests
(`tests/core/CloneUtils.test.ts`, u.a. für `TerrainMaterial.thresholds`) korrekt verifiziert nicht
mehr passiert. Kein Bug, aber ein Grenzfall bleibt unadressiert (und ist dokumentationsseitig nicht
erwähnt): Der Plain-Object-Zweig (`{ ...value }`) ist nur eine Ebene flach -- enthielte ein
Plain-Object-Feld selbst wieder eine `Vector3D`/`Color`, würde diese weiterhin über beide Kopien
geteilt. Aktuell in der Codebasis kein konkretes Beispiel gefunden, das das trifft (kein `Object3D`/
`AbstractMaterial`/`Behavior`-Feld ist ein Plain Object mit verschachtelten Value-Types); reine
Doku-Randnotiz für künftige Erweiterungen dieser Utility.

*(✅ Behoben: keine Verhaltensänderung (kein konkreter Bug, siehe oben), aber die Grenze ist jetzt
explizit im JSDoc von `shallowCloneWithValueTypes()` in `src/core/CloneUtils.ts` dokumentiert --
Plain-Object-Klon ist nur eine Ebene tief, mit Hinweis, was eine künftige Erweiterung tun müsste.)*

---

### 🟡 `MathUtils.fastSin()`/`fastCos()`: Lookup-Table entfernt, jetzt reine `Math.sin`/`Math.cos`-Wrapper -- sinnvolles Cleanup, kein Nutzer betroffen

**Fundort:** `src/math/MathUtils.ts`.

`grep -rn "fastSin\|fastCos\|MathUtils.init" src apps showcases` liefert außerhalb der Deklaration
selbst keine Treffer -- die entfernte 3600-Elemente-Lookup-Table (mit ihrer `0.1°`-Auflösung, also
ohnehin einer echten, wenn auch kleinen, Präzisionsminderung gegenüber `Math.sin`/`Math.cos`) hatte
keinen einzigen Aufrufer im gesamten Projekt. Entfernung ist reines, korrektes Totcode-Aufräumen,
keine Verhaltensänderung für existierenden Code.

*(Kein Fix nötig: dieser Fund beschreibt bereits abgeschlossenes, korrektes Cleanup ohne
verbleibende Aktion -- `grep` erneut bestätigt keine Aufrufer von `fastSin`/`fastCos` außerhalb der
Deklaration selbst. Unverändert gelassen.)*

---

## ✅ Positiv-Zusammenfassung

- Alle 4 im letzten Review als kritisch gemeldeten Bugs (`Object3D.lookAt()`-Quaternion-Sync,
  `Input.ts`-Listener-Leak, `PlanarReflectionNode`-`up`-Reihenfolge,
  `EventDispatcherImpl.dispatchEvent()`-Allokation) sind **vollständig und korrekt** behoben, mit
  gezielten, aussagekräftigen Unit-Tests, die das tatsächliche Verhalten prüfen (nicht nur
  Implementierungsdetails) -- verifiziert durch Lesen des vollständigen aktuellen Codes, gezielte
  Wegwerf-Repros und `npx vitest run` auf allen betroffenen Testdateien (42/42 grün).
- Drei zusätzliche, im letzten Review als 🟠 dokumentierte Architektur-Funde wurden im selben
  Zeitfenster ebenfalls sauber behoben: `FrustumCuller` (statisch → instanzgebunden),
  `InteractionManager`s `pickables`-Allokation (jetzt wiederverwendetes Feld + `Set`), und
  `Skeleton.update()`s ignorierter `invert()`-Rückgabewert.
- `CameraStrategyFactory` und `DeviceCaps` wurden über die dokumentierten 4+3 Funde hinaus proaktiv
  von echten (nicht nur theoretischen) Multi-Instanz-Bugs befreit -- beide mit konkret
  nachgewiesenem State-Sharing-Risiko (`SmoothStrategy`/`StiffStrategy`/`HybridSyncStrategy`s
  Instanzfelder bzw. zwei nie freigegebene WebGL-Kontexte pro Engine-Instanz) und beide mit
  gezielten neuen Tests abgesichert.
- Der `AnimationMixer`/`KeyframeTrack`-Umbau auf inkrementelle Zero-Allocation-Blend-States ist
  algorithmisch korrekt nachvollzogen (identische Ergebnisse zum alten Array-basierten Verfahren,
  nur ohne die Objekt-Allokationen pro Track/Frame) -- der einzige Schönheitsfehler ist die fehlende
  dedizierte Testdatei dafür (siehe 🟢 oben).
- Der einzige substanzielle neue Bug (`BillboardInstancer`s sphärischer Modus, 180° falsche
  Blickrichtung) betrifft eine brandneue, optionale Funktion mit noch keinem produktiven Aufrufer im
  Repo (kein `new BillboardInstancer(..., { axisLocked: false })`-Aufruf außerhalb von Tests
  gefunden) -- Impact aktuell auf zukünftige Nutzung begrenzt, aber real und leicht durch einen
  einzigen zusätzlichen Testfall zu verhindern gewesen.
