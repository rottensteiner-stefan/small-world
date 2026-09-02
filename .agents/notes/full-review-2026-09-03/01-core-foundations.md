# Review: Core Foundations & Math (`src/core/*.ts`, fsm/events/stage/threading/helpers/animation/controllers/text/textures/colors, `src/math`, `src/interfaces`, `src/enums`)

**Reviewer:** Agent A · **Status:** ⚠️ mit kritischen Funden fertig

Legende: 🔴 kritisch (Bug/Korrektheit) · 🟠 fragil/Architektur-Risiko · 🟡 Stil/Cleanup/tote Fläche · 🟢 Test-Lücke · ✅ positiv

---

## `src/core/Object3D.ts`

### ✅ [ERLEDIGT] `lookAt()` schreibt nur Euler-`rotation`, ignoriert gesetztes `quaternion` — Objekt dreht sich sichtbar nicht
*(Behoben 2026-09-03: `this.quaternion.setFromRotationMatrix(m)` wird in `lookAt()` synchronisiert, falls `quaternion` gesetzt ist; Unit-Test in `tests/core/Object3D.test.ts` ergänzt.)*

**Fundort:** `src/core/Object3D.ts:258-269` (`lookAt()`) im Zusammenspiel mit `updateMatrixWorld()` (`src/core/Object3D.ts:271-285`).

```ts
public lookAt(target: Vector3D, up: Vector3D = new Vector3D(0, 1, 0)): this {
  const m = MathPool.acquireMatrix();
  Matrix4.lookAt(this.position, target, up, m);
  m.invert();
  const pos = MathPool.acquireVector();
  const scale = MathPool.acquireVector();
  m.decompose(pos, this.rotation, scale);   // schreibt NUR this.rotation (Euler)
  ...
}

public updateMatrixWorld(): void {
  if (this.quaternion) {
    this.localMatrix.composeFromQuaternion(this.position, this.quaternion, this.scale); // <- gewinnt
  } else {
    this.localMatrix.compose(this.position, this.rotation, this.scale);
  }
  ...
}
```

`lookAt()` schreibt die berechnete Blickrichtung ausschließlich in `this.rotation` (Euler-Winkel via `Matrix4.decompose()`, `src/math/Matrix4.ts:230-274`). Ist auf demselben Objekt aber `this.quaternion` gesetzt, ignoriert `updateMatrixWorld()` `this.rotation` komplett und komponiert stattdessen aus dem (unverändert stehen gebliebenen) `quaternion`. `quaternion` wird u.a. von `GltfLoader.ts:313` (jedem glTF-Node mit Rotation-Kanal) und von `AnimationMixer.ts:174/191` (jedem animierten Bone) gesetzt — also für praktisch jedes über die glTF-Pipeline geladene Objekt, dem primären Asset-Workflow laut `VISION.md`.

Konkretes Fehlerszenario: `LookAtBehavior` (`src/core/behaviors/LookAtBehavior.ts:22`) ruft pro Frame `this.target.lookAt(targetPos)` auf. Hängt man dieses Behavior an ein glTF-geladenes Objekt (z.B. einen Charakter-Kopf-Socket oder ein importiertes Prop), berechnet `lookAt()` brav einen neuen Rotationswert — der aber nie ins gerenderte Ergebnis einfließt, weil `quaternion` Vorrang hat und stehen bleibt. Das Objekt dreht sich sichtbar nie, ohne Fehler oder Warnung.

**Verifiziert:** Wegwerf-Vitest-Test (`tests/_scratch_repro/lookat_repro.test.ts`, danach gelöscht) mit `Object3D` + gesetztem Identity-`quaternion`: nach `lookAt(new Vector3D(10,0,0))` ändert sich `obj.rotation.y` wie erwartet, aber `obj.quaternion` bleibt exakt `{0,0,0,1}` und die resultierende `worldMatrix` nach `updateMatrixWorld()` ist weiterhin die reine Identity-Rotationsmatrix (m[0]/m[5]/m[10] ≈ 1) — bestätigt, dass die Rotation aus `lookAt()` komplett verschluckt wird.

**Fix-Richtung:** `lookAt()` sollte, wenn `this.quaternion` gesetzt ist, entweder direkt ein Quaternion aus der Ziel-Matrix extrahieren und `this.quaternion` aktualisieren (statt/zusätzlich zu `this.rotation`), oder `this.quaternion` explizit auf `undefined` setzen, damit `updateMatrixWorld()` wieder den Euler-Pfad nimmt. Ein `Quaternion.fromMatrix()`-Analog existiert vermutlich schon für den `AnimationMixer`-Pfad und könnte wiederverwendet werden.

---

## `src/core/Scene.ts`

### 🟠 `_scratchFrustum`/`Frustum.setFromMatrix()` wird pro Aufruf berechnet, aber nie zum Culling benutzt — totes Arbeitspaket, mehrfach pro Frame

**Fundort:** `src/core/Scene.ts:259-264` (`getVisibleObjectsSorted()`) und `src/core/Scene.ts:286-347` (`_collectVisible()`).

```ts
const frustum = this._scratchFrustum;
const vpMat = this._scratchMatrix;
vpMat.data.set(vp);
frustum.setFromMatrix(vpMat);          // 6 Ebenen aus der VP-Matrix extrahieren

this._collectVisible(this.root, this._renderList, frustum);   // frustum wird durchgereicht...

private _collectVisible(obj: Object3D, renderList: RenderList, frustum: Frustum): void {
  ...
  if (obj.frustumCulled && obj.bounds) {
    if (!obj.inFrustum) {               // ...aber hier NIE gelesen. Gating läuft komplett über obj.inFrustum.
      return;
    }
  }
  ...
  for (let i: number = 0; i < obj.children.length; i++) {
    this._collectVisible(obj.children[i]!, renderList, frustum);   // nur weitergereicht
  }
}
```

`frustum` wird innerhalb von `_collectVisible()` (auch rekursiv) an keiner Stelle gelesen (kein `frustum.intersectsVolume(...)` o.ä.) — das tatsächliche Culling läuft ausschließlich über das von `FrustumCuller` (separat, pro Frame vorher) gesetzte `obj.inFrustum`-Flag. `_scratchFrustum` wird laut Grep sonst nirgends im Projekt gelesen (`grep -rn "_scratchFrustum" src` liefert nur die Deklaration + diese eine Zuweisung). Die `setFromMatrix()`-Ebenenextraktion (6 Ebenen, je ein paar Vektor-Operationen) ist damit komplett verschwendete Arbeit.

Das wiegt schwerer als ein einzelner toter Aufruf, weil `getVisibleObjectsSorted()` laut Aufruferliste mehrfach pro Frame mit unterschiedlichen `vp`-Matrizen läuft (`MainRenderPass`, `DepthPrePassGPU`, `SpotShadowPassGPU`, `CascadedShadowPassGPU` rufen es alle auf) — die nutzlose Extraktion passiert also potenziell 4+ Mal pro Frame, für jede Shadow-Pass-Matrix, obwohl das Ergebnis nie konsultiert wird.

Zusätzlich ist das architektonisch irreführend: der Parametername `frustum` in `_collectVisible()` suggeriert, dass hier tatsächlich frustum-getestet wird, während die reale Prüfung bereits vorher (in `FrustumCuller`, mit der *Kamera*-VP-Matrix, nicht der jeweiligen Shadow-Pass-VP-Matrix!) passiert ist. Das bedeutet zusätzlich: die Shadow-Passes filtern hier gar nicht nach ihrem eigenen (Licht-)Frustum, sondern nach dem zuletzt von `FrustumCuller` gegen die Kamera berechneten `inFrustum`-Flag — was für Shadow-Passes fachlich ohnehin fragwürdig ist (ein Objekt kann außerhalb des Kamera-Frustums, aber innerhalb des Schatten-Frustums liegen und würde hier fälschlich übersprungen), aber das ist ein Rendering-Pass-Thema außerhalb meines Scopes; ich vermerke es nur als Kontext für den zuständigen Rendering-Agenten.

**Verifiziert:** `grep -rn "_scratchFrustum" src` → nur Deklaration (Scene.ts:77) und die eine Zuweisung/Nutzung (Scene.ts:259-262), kein Lesezugriff auf das Ergebnis. `grep -n "frustum\." src/core/Scene.ts` innerhalb von `_collectVisible` liefert keine Treffer außer der Weiterreichung an rekursive Aufrufe.

**Fix-Richtung:** Entweder den `frustum`-Parameter/die `setFromMatrix()`-Berechnung ganz entfernen (reines Aufräumen, da das Gating ohnehin über `obj.inFrustum` läuft), oder — falls die ursprüngliche Absicht war, hier tatsächlich pro Render-Pass gegen die jeweilige VP-Matrix zu testen (relevant v.a. für Shadow-Passes) — `frustum.intersectsVolume(obj.bounds)` tatsächlich aufrufen statt `obj.inFrustum` zu lesen.

---

## `src/core/Octree.ts`

### 🟠 Root-Wachstum (`Octree.insert()`) macht Kind-Bounds dauerhaft stale — neue Region subdivided nie, `root.objects` wächst unbegrenzt

**Fundort:** `src/core/Octree.ts:258-279` (`Octree.insert()`) im Zusammenspiel mit `OctreeNode._subdivide()`'s Reentry-Guard (`src/core/Octree.ts:112-119`).

Wenn ein Objekt außerhalb der aktuellen Root-Bounds eingefügt wird (Kommentar nennt explizit "a spawned or teleported object beyond the initial world size" — u.a. relevant für Showcase-12-artige Teleport-Spawns), wächst `Octree.insert()` `this.root.bounds.min/max/center` und ruft `this.root.insert(obj)` erneut auf:

```ts
this.root.bounds.min.min(min);
this.root.bounds.max.max(max);
this.root.bounds.center.copyFrom(...).scale(0.5);
...
return this.root.insert(obj);
```

Das aktualisiert aber **nur die Bounds des Root-Knotens selbst** — die bereits existierenden 8 Kind-Knoten (falls die Root vorher schon subdivided war) behalten ihre alten, jetzt zu kleinen Bounds. Landet das neue (weit-außerhalb-)Objekt danach im Root-Insert, versucht `OctreeNode.insert()` es zuerst in eines der Kinder zu stecken (`this.children[i]!.insert(obj)`), was für jedes Kind fehlschlägt (`child.bounds.containsVolume(obj.bounds)` ist `false`, da Kind-Bounds nicht mit gewachsen sind) — das Objekt landet also im `objects`-Array der Root selbst.

Übersteigt `root.objects.length` danach `maxObjects`, ruft `insert()` `this._subdivide()` auf der Root auf — aber `_subdivide()` hat einen Reentry-Guard (`if (0 < this.children.length) return;`, Zeile 119), der jede erneute Subdivision blockiert, weil die Root ja bereits (mit den alten Bounds) Kinder hat. Das Ergebnis: **jedes weitere Objekt in der neu gewachsenen Region landet für immer direkt im `root.objects`-Array**, ohne jemals subdivided zu werden — unabhängig von `maxObjects`/`maxDepth`. Wiederholtes Spawnen/Teleportieren außerhalb der ursprünglichen Weltgröße (das Szenario, das der Kommentar selbst als Use-Case nennt) degradiert die Octree schleichend zu einer linearen Liste für genau diese Objekte.

**Verifiziert:** Wegwerf-Vitest-Test (`tests/_scratch_repro/octree_growth.test.ts`, danach gelöscht): Octree mit `maxObjects: 4`, zunächst 10 Objekte bei `(0,0,0)` eingefügt → `root.children.length === 8` (initiale Subdivision greift). Anschließend 50 Objekte weit außerhalb der ursprünglichen `[-10,10]`-Bounds eingefügt (bei `(1000+i, ...)`, jedes Mal ein Root-Wachstum auslösend) → `root.children.length` bleibt exakt `8` (keine erneute Subdivision), während `root.objects.length` auf über 40 (effektiv alle 50) unbegrenzt anwächst, weit über `maxObjects`.

Kein Korrektheits-Bug (Queries finden die Objekte weiterhin, da `query()`/`queryRay()`/`queryVolume()` auch `this.objects` auf jeder Ebene mit durchsuchen) — aber ein echtes Performance-Leck: genau die Fälle, die Wachstum auslösen (Spawn/Teleport weit außerhalb der Startbounds), sind exakt die Fälle, in denen die räumliche Struktur am nötigsten wäre, degradiert hier aber zu O(n) linearer Suche für diese Untermenge.

**Fix-Richtung:** Nach einem Root-Bounds-Wachstum entweder die komplette Octree einmalig neu aufbauen (alle vorhandenen Objekte re-inserten, `_nodePool` macht das billig), oder den Reentry-Guard in `_subdivide()` gezielt für den Root-Wachstumsfall aufheben (Kinder mit den neuen Bounds neu erzeugen und vorhandene Kind-Inhalte umverteilen).

---

## `src/core/FrustumCuller.ts`

### 🟠 Vollständig statische Klasse — Page-weite globale State-Verletzung des "No Global Singletons"-Gesetzes (bereits bekanntes, offenes Debt-Item)

**Fundort:** `src/core/FrustumCuller.ts:10-19` — `_frustum`, `_queryHits`, `lastIntersectedNodes`, `lastVisibleCount` sind allesamt `static` Felder einer Klasse ohne Instanzen.

`AGENTS.md`/`CONTEXT.md` verlangen explizit Context Objects/Constructor Injection statt globaler Singletons, gerade weil "Small World must support multiple engine instances per page". `FrustumCuller` ist aber komplett statisch: Ruft eine zweite `SmallWorld`-Instanz auf derselben Seite `FrustumCuller.cull(sceneB, ...)`, während Konsument-Code von Instanz A gerade `FrustumCuller.lastVisibleCount`/`lastIntersectedNodes` als "meine letzte Cull-Statistik" liest, bekommt es die Werte der zuletzt aufgerufenen Scene — unabhängig davon, welche `SmallWorld`-Instanz eigentlich gemeint war. Die Scratch-Puffer (`_frustum`, `_queryHits`) selbst sind unkritisch (synchron innerhalb eines `cull()`-Aufrufs verbraucht, kein Await dazwischen), aber die beiden `public static`-Debug-/Inspector-Felder sind über Instanzgrenzen hinweg sichtbarer, nicht gekapselter Zustand.

Dies deckt sich mit einem bereits bekannten, dokumentierten offenen Punkt aus einer früheren Session (`lastVisibleCount`/`lastIntersectedNodes` als "open debt" nach der Entfernung von `lastVisibleObjects`) — ich vermerke es hier trotzdem als konkreten Fund, weil es das einzige echte "No Global Singleton"-Gesetzesverstoß-Beispiel in meinem gesamten Scope ist und noch nicht behoben wurde.

**Fix-Richtung:** `FrustumCuller` als Instanz-Klasse (oder Context-Objekt-Feld auf `SmallWorld`) statt statischer Klasse führen; jede `SmallWorld`-Instanz hält ihren eigenen Culler mit eigenem `lastVisibleCount`/`lastIntersectedNodes`.

---

## `src/core/InteractionManager.ts`

### 🟠 `pickables`-Array wird jeden Frame neu alloziert — Zero-Allocation-Hot-Path-Verstoß

**Fundort:** `src/core/InteractionManager.ts:48` (`update()`), aufgerufen jeden Frame aus `SmallWorld._loop()` (`src/core/SmallWorld.ts:517`).

```ts
public update(): void {
  ...
  const pickables: Object3D[] = [];               // <- neue Allocation, jeden Frame
  if (this.scene.staticOctree || ...) {
    this._queryHits.length = 0;                    // dieses Array IST bereits ein wiederverwendetes Feld
    ...
    for (const obj of this._queryHits) {
      if ((obj as Object3D).isPickable && !pickables.includes(obj as Object3D)) {
        pickables.push(obj as Object3D);
      }
    }
  } else {
    for (const obj of this.scene.objects) {
      this._getPickableObjects(obj, pickables);    // Fallback-Pfad ohne Octree/SpatialHash
    }
  }
  const intersects: Intersection[] = this._raycaster.intersectObjects(pickables, true);
  ...
}
```

`_queryHits` ist korrekt als wiederverwendetes privates Feld modelliert (`this._queryHits.length = 0` statt Neuallokation) — aber `pickables` direkt daneben ist eine lokale `const [] `, jeden einzelnen Frame neu erzeugt, für jede `SmallWorld`-Instanz mit aktivem `InteractionManager`. Zusätzlich läuft der Dedup-Check `!pickables.includes(...)` pro Query-Hit linear über das bisher gesammelte `pickables`-Array (O(n²) im ungünstigen Fall bei vielen pickbaren Treffern aus mehreren räumlichen Strukturen), statt z.B. mit einem wiederverwendeten `Set`.

Das ist zwar in absoluten Zahlen meist harmlos (kleine Objektzahlen pro Frame), verstößt aber gegen die im `CONTEXT.md` explizit benannte Zero-Allocation-Hot-Path-Regel für Per-Frame-Code, und zwar in genau dem Modul, das daneben (`_queryHits`) bereits korrekt zeigt, wie es stattdessen aussehen sollte.

**Fix-Richtung:** `pickables` als privates, wiederverwendetes Instanzfeld führen (analog `_queryHits`), am Frame-Ende `pickables.length = 0` statt Neuallokation. Für die Dedup-Prüfung ein wiederverwendetes `Set<Object3D>` statt `Array.includes()`.

---

## `src/core/SmallWorld.ts`

### 🟡 Vier `window`-Listener für `gadget:audio:*`-Events, die nirgends im Projekt dispatched werden — totes Feature, nie entfernt, würde bei Wiederbelebung das Event-Bus-Gesetz brechen

**Fundort:** `src/core/SmallWorld.ts:136-149` (Constructor) und `destroy()` (`src/core/SmallWorld.ts:400-411`).

```ts
if (typeof window !== "undefined") {
  window.addEventListener("gadget:audio:master", (e: Event) =>
    this.audio.setMasterVolume((e as CustomEvent).detail),
  );
  window.addEventListener("gadget:audio:music", ...);
  window.addEventListener("gadget:audio:sfx", ...);
  window.addEventListener("gadget:audio:reverb", ...);
}
```

**Verifiziert:** `grep -rln "gadget:audio" . --include="*.ts" --include="*.html" --include="*.js"` findet außer dieser einen Registrierungsstelle in `SmallWorld.ts` selbst keinen einzigen Ort im gesamten Repo, der eines dieser vier `CustomEvent`s tatsächlich dispatched (`dispatchEvent`/`new CustomEvent("gadget:...")` liefert 0 Treffer). Der komplette Codepfad ist seit mindestens dieser Reviewsitzung faktisch tot — jede `SmallWorld`-Instanz registriert vier Listener für Events, die nie eintreffen.

Zwei unabhängige Probleme:
1. **Leak:** Diese vier Listener werden in `destroy()` nie mit `removeEventListener` entfernt (im Gegensatz zu `resize`/`keydown`/`pagehide`, die dort korrekt aufgeräumt werden). Jede erzeugte `SmallWorld`-Instanz hält über die Closure `this.audio` fest im globalen `window`-Listener-Graph — die Instanz kann nach `destroy()` nie GC'd werden.
2. **Architekturbruch bei Wiederbelebung:** Sollte dieses Feature reaktiviert werden (z.B. ein künftiges Gadget-Inspector-Audio-Panel), wäre es als globaler `window`-`CustomEvent`-Kanal genau das, was `CONTEXT.md`'s "Event Bus"-Eintrag explizit ausschließt ("_Avoid_: Global Event Bus, Universal EventBus — rejected under Context Object; this bus is scoped to one engine instance, never a shared global"). Bei mehreren `SmallWorld`-Instanzen auf einer Seite (explizit unterstütztes Szenario) würde ein `gadget:audio:master`-Event gleichzeitig die Lautstärke JEDER Instanz ändern, nicht nur der gemeinten — genau das Cross-Instanz-Leck, das die Instanz-gebundene `EventDispatcherImpl` (`this.events`) verhindern soll.

**Fix-Richtung:** Toten Code entfernen (kein Dispatcher existiert), oder falls das Feature tatsächlich noch kommen soll: über `this.events` (das bereits existierende Per-Instanz-Event-Bus-Feld) verdrahten statt über globale `window`-`CustomEvent`s, und in jedem Fall in `destroy()` sauber abmelden.

---

## `src/core/events/EventDispatcherImpl.ts`

### 🔴 `dispatchEvent()` alloziert bei JEDEM Aufruf ein neues Array (`listeners.slice(0)`) — direkte Verletzung der im `CONTEXT.md` namentlich genannten Zero-Allocation-Hot-Path-Regel

**Fundort:** `src/core/events/EventDispatcherImpl.ts:38-48`.

```ts
public dispatchEvent(type: string | EventType, eventData: Record<string, unknown> = {}): void {
  const eventName: string = type as string;
  const listeners: EventHandler[] | undefined = this._listeners.get(eventName);
  if (listeners) {
    eventData["type"] = eventName;
    const listenersCopy: EventHandler[] = listeners.slice(0);   // <- neue Array-Allocation, jedes Mal
    for (const listener of listenersCopy) {
      listener(eventData);
    }
  }
}
```

`CONTEXT.md`'s eigener Glossar-Eintrag "Zero-Allocation (Hot Path)" nennt wörtlich **"event dispatch"** als eines von genau drei kanonischen Beispielen für Code, der pro Frame nichts allozieren darf ("this is a specific, named commitment repeated verbatim across the physics, event bus, and FSM docs"). `dispatchEvent()` — die zentrale, einzige Implementierung dieses Event-Busses (`Events`-Interface) — alloziert aber bei jedem einzelnen Aufruf ein frisches Array via `Array.prototype.slice(0)`, unabhängig davon, ob überhaupt ein Listener währenddessen sich selbst deregistriert (der eigentliche Grund für die Defensive Copy).

Das ist kein theoretisches Problem: `PhysicsSystem.ts:297` und `:351` feuern `"physics:collision"` für jede erkannte Kollision während `PhysicsSystem.step()` — bei mehreren gleichzeitigen Kollisionen (z.B. ein Stapel Kisten, siehe Showcase-12-artige Szenen) potenziell mehrfach pro Frame, macht `dispatchEvent()` real zu einem Per-Frame-Hot-Path-Aufrufer, nicht nur zu einem seltenen UI-Event-Pfad.

**Verifiziert:** `Array.prototype.slice()` alloziert per Spezifikation immer ein neues Array (bestätigt per Node-Einzeiler: `const a=[1,2,3]; const b=a.slice(0); a===b` → `false`). Aufruferliste via `grep -rn "\.dispatchEvent(" src` bestätigt `PhysicsSystem.ts` als Aufrufer aus dem physikalischen Step, dem laut `CONTEXT.md` explizit zweiten der drei genannten Zero-Alloc-Hot-Paths.

**Fix-Richtung:** Klassisches Problem, klassische Lösung ohne Allocation: entweder (a) nur dann eine Kopie ziehen, wenn während der Iteration tatsächlich strukturell verändert wird (z.B. per Dirty-Flag, das `removeEventListener` während einer laufenden Dispatch-Iteration setzt), oder (b) rückwärts über das Original-Array iterieren und Entfernungen erst nach der Schleife anwenden (ähnliches Muster wie bereits korrekt in `Scene._updateBehaviorsRecursive()` für Behavior-Selbstentfernung gelöst — siehe dort), oder (c) einen wiederverwendeten Scratch-Puffer pro `eventName` pflegen statt `slice()`.

---

## `src/core/animation/AnimationMixer.ts` + `src/core/animation/KeyframeTrack.ts`

### 🟠 Blending-Pfad alloziert 2-3 Objekte PRO TRACK PRO FRAME — Zero-Allocation-Hot-Path-Verstoß im primären Charakter-Animationssystem

**Fundort:** `src/core/animation/AnimationMixer.ts:103` und `:116` (`update()`), plus `src/core/animation/KeyframeTrack.ts:74-100` (`_findSegment()`).

`KeyframeTrack.sampleQuaternion()`/`sampleVector()` selbst sind vorbildlich zero-alloc umgesetzt (`_tempQuatA`/`_tempVecA` als wiederverwendetes Scratch-State, mit explizitem JSDoc-Hinweis "owned scratch state, reused across calls -- copy it before the next call ... if it must be retained"). Der Aufruf, den beide Sample-Methoden intern machen, unterläuft das aber selbst:

```ts
private _findSegment(time: number): { i0: number; i1: number; alpha: number | null } {
  ...
  return { i0: 0, i1: 0, alpha: null };   // <- neues Objekt-Literal, JEDEN Aufruf
  ...
}
```

`_findSegment()` wird von `sampleQuaternion()`/`sampleVector()` bei jedem Sample-Aufruf aufgerufen und gibt in jedem Fall (4 Return-Stellen) ein frisches `{i0, i1, alpha}`-Objekt-Literal zurück — pro Track, pro Frame, pro spielender Action.

Zusätzlich unterläuft `AnimationMixer.update()` selbst den vom `KeyframeTrack`-Kommentar geforderten "copy it if retained"-Vertrag korrekt, aber ebenfalls mit Allokation statt Pooling:

```ts
contributions.push({ value: sampled.clone(), weight: action.weight });  // Zeile 103 (Quaternion) / 116 (Vector3D)
```

`sampled.clone()` (neue `Quaternion`/`Vector3D`-Instanz) UND das umschließende `{value, weight}`-Objekt-Literal sind beides frische Allokationen — pro Track, pro Frame, pro spielender Action. Bei einer typischen Mixamo-Figur (dutzende Bones, je ein Rotations- und teils Translations-Track) macht das in Summe grob 3 Allokationen × 2-3 Tracks × ~50 Bones ≈ 150-450 Objekte pro Frame und pro animiertem Charakter — real genutzt u.a. in `apps/and-now/scenes/flakturm-tunnel/showcase.ts:364` und `character-diorama/showcase.ts:1351`, beides Per-Frame-`AnimationMixer.update()`-Konsumenten.

Der Blending-Algorithmus selbst (gewichteter Vektor-Mittelwert, inkrementelles gewichtetes Slerp für Quaternion-N-Blending) ist mathematisch sauber und richtig — das Problem ist rein die Objekt-Allocation-Strategie, nicht die Formel.

**Fix-Richtung:** `_findSegment()` auf ein wiederverwendetes Instanzfeld umstellen (Rückgabe per `out`-Parameter statt neuem Objekt-Literal, analog zu `_readQuaternion`/`_readVector`). Für `AnimationMixer`: `VectorContribution`/`QuaternionContribution` aus einem pro-Mixer vorallozierten Pool ziehen (Größe = max. gleichzeitig spielende Actions, typischerweise klein und bekannt) statt `sampled.clone()` + neuem Objekt-Literal pro Track/Frame.

---

## `src/core/animation/Skeleton.ts` + `src/core/animation/Bone.ts`

### 🟠 `Skeleton.update()` ignoriert `Matrix4.invert()`'s Erfolgs-Rückgabewert — bei singulärer `meshWorldMatrix` (z.B. Nullskalierung bei "Pop-in"-Effekten) rendert Skinning mit unveränderter statt invertierter Matrix

**Fundort:** `src/core/animation/Skeleton.ts:50-57` (`update()`).

```ts
public update(meshWorldMatrix?: Matrix4): void {
  const invMeshWorld = MathPool.acquireMatrix();
  if (meshWorldMatrix) {
    invMeshWorld.data.set(meshWorldMatrix.data);
    invMeshWorld.invert();          // <- Rückgabewert (boolean) ignoriert
  } else {
    invMeshWorld.data.set(this._identityMatrix.data);
  }
  ...
}
```

`Matrix4.invert()` (statisch: `src/math/Matrix4.ts:485-521`) gibt korrekterweise `false` zurück und lässt das Ziel **komplett unverändert**, wenn die Determinante exakt 0 ist (singuläre Matrix). `Skeleton.update()` prüft diesen Rückgabewert nicht — bei einer singulären `meshWorldMatrix` (z.B. ein `SkinnedMesh`, dessen Skalierung auf einer Achse exakt `0` steht, ein gängiges Autoring-Muster für "Pop-in"/"Grow"-Spawn-Effekte, die bei Skalierung 0 starten und zu 1 hochtweenen) bleibt `invMeshWorld` die reine Kopie der (nicht invertierten!) `meshWorldMatrix` — die anschließende `Matrix4.multiply(invMeshWorld, tempMat, finalMat)` wendet also fälschlich die Welt-Matrix ein zweites Mal an statt sie herauszurechnen, was zu falsch transformierten Bone-Matrizen für dieses Frame führt (kein Crash, aber sichtbar falsches Skinning-Ergebnis, sobald die Skalierung wieder von 0 wegwandert).

Dasselbe Muster (Rückgabewert von `invert()` ignoriert) liegt auch dem oben dokumentierten `Object3D.lookAt()`-Fund zugrunde — `Camera.screenToWorld()` (`src/core/Camera.ts:147`) macht es dagegen korrekt (`if (false === this._viewProjMatrix.invert(invVP)) { ...Fallback... }`), was zeigt, dass die Codebasis den Fehlerfall an einer Stelle sauber behandelt und an zwei anderen übersieht.

**Verifiziert:** Wegwerf-Vitest-Test (`tests/_scratch_repro/skeleton_invert.test.ts`, danach gelöscht): `Matrix4` mit `compose(pos=0, rot=0, scale=(0,1,1))` (X-Skalierung 0, klassischer Singulär-Fall) → `invert()` liefert `false` und `m.data` ist nach dem Aufruf byte-identisch mit dem Zustand davor — bestätigt, dass der Fehlerfall lautlos verpufft und die aufrufende Seite ohne Prüfung des Rückgabewerts eine unveränderte statt invertierte Matrix weiterverwendet.

**Fix-Richtung:** Rückgabewert prüfen und im Fehlerfall auf Identity zurückfallen (wie `_identityMatrix` bereits im `else`-Zweig vorhanden) statt die unveränderte Matrix stillschweigend weiterzuverwenden. Gleiche Behandlung für `Object3D.lookAt()` oben.

### 🟡 `Bone.updateMatrixWorld()` ist eine reine Byte-für-Byte-Dopplung von `Object3D.updateMatrixWorld()`

**Fundort:** `src/core/animation/Bone.ts:19-35` vs. `src/core/Object3D.ts:271-285`.

Der komplette Methodenkörper ist inhaltlich identisch zur Basisklasse (gleiche Quaternion/Euler-Verzweigung, gleiche Parent-Multiplikation, gleiche Kind-Rekursion) — der einzige Unterschied ist ein manuelles `for`-Loop statt `for...of` über `children`, ohne jeden funktionalen Unterschied. Das `override`-Keyword und die komplette Neuimplementierung sind damit überflüssig; jede künftige Änderung an `Object3D.updateMatrixWorld()` (z.B. ein Fix für den oben gefundenen `lookAt()`/Quaternion-Bug, falls er dort behoben wird) müsste zusätzlich hier manuell nachgezogen werden, sonst laufen beide Implementierungen unbemerkt auseinander.

**Fix-Richtung:** Override komplett entfernen (Bone erbt `updateMatrixWorld()` unverändert von `Object3D`), oder falls die Existenz des Overrides beabsichtigt war (z.B. als Ansatzpunkt für zukünftige Bone-spezifische Logik), zumindest per `super.updateMatrixWorld()` an die Basisklasse delegieren statt den Körper zu duplizieren.

---

## `src/core/Input.ts`

### ✅ [ERLEDIGT] `Input.init()` registriert ~15 `window`/`document`-Listener ohne jede Aufräum-Möglichkeit — kein `destroy()`/`dispose()` existiert, `SmallWorld.destroy()` räumt es nicht mit auf
*(Behoben 2026-09-03: `Input.destroy()` entfernt alle 15 `window`/`document`-Listener via benannte Referenzen und stoppt `UniversalGamepadController` [inkl. `clearInterval` des WebHID-Pollings]; `FPSCounter.destroy()` entfernt das DOM-Element; `SmallWorld.destroy()` ruft `this.input.destroy()` auf; Unit-Test in `tests/core/Input.test.ts`.)*

**Fundort:** `src/core/Input.ts:68-199` (`init()`) — komplette Datei durchsucht, es gibt keine `destroy`/`dispose`/`removeEventListener`-Methode.

`init()` registriert `keydown`, `keyup`, `mousedown`, `mouseup`, `mousemove`, `wheel`, `gesturechange`, `contextmenu`, `blur`, `pointerlockchange` (auf `document`), `gamepadconnected`, `gamepaddisconnected`, `touchstart`, `touchmove`, `touchend` — 15 Listener, alle als anonyme Inline-Closures ohne gespeicherte Referenz, alle auf `window`/`document` (also page-global, nicht auf den Canvas beschränkt). Jede dieser Closures hält `this` (die `Input`-Instanz, inkl. `_keys`-Map, `mouse`-State, `_gamepadController`) am Leben.

`SmallWorld` erzeugt pro Instanz ein eigenes `input: Input = new Input()` (`src/core/SmallWorld.ts:70`) und ruft `this.input.init()` im Constructor (`src/core/SmallWorld.ts:133`) — aber `SmallWorld.destroy()` (`src/core/SmallWorld.ts:400-411`) ruft nirgends etwas auf `this.input` auf, und `Input` selbst hat keine Methode, die das täte, selbst wenn man sie aufrufen wollte.

**Konkretes Szenario:** Jede erzeugte + wieder zerstörte `SmallWorld`-Instanz (das explizit unterstützte "mehrere Engine-Instanzen pro Seite"-Szenario aus `AGENTS.md`, oder einfach ein SPA-Seitenwechsel, der eine `SmallWorld` neu aufbaut) hinterlässt permanent 15 lebende `window`/`document`-Listener und eine nicht mehr GC-fähige `Input`-Instanz. Bei wiederholter Instanziierung (Hot-Reload während der Entwicklung, oder ein Menü/Level-Wechsel, der die Engine neu startet) akkumulieren sich diese Listener unbegrenzt — jeder Tastendruck/jede Mausbewegung nach der zweiten Instanziierung feuert dann durch alle noch lebenden alten `Input`-Instanzen zusätzlich zur aktuellen.

**Verifiziert:** `grep -n "destroy\|dispose\|removeEventListener" src/core/Input.ts` → keine Treffer (komplett fehlende Aufräumlogik). `grep -n "input\." src/core/SmallWorld.ts | grep -i "destroy\|dispose"` → keine Treffer (der Aufrufer räumt ebenfalls nicht auf).

**Fix-Richtung:** `Input` eine `destroy()`-Methode geben, die alle in `init()` registrierten Listener mit benannten (nicht-anonymen) Handlerreferenzen wieder entfernt, und `SmallWorld.destroy()` diese aufrufen lassen — analog zum bereits korrekten Muster für `resize`/`keydown`/`pagehide` in `SmallWorld` selbst.

Randnotiz: Dasselbe "kein Cleanup-Pfad"-Muster taucht auch in `src/core/FPSCounter.ts` auf — der Constructor hängt per `document.body.appendChild(this._el)` ein `<div>` fest an den DOM, es gibt keine `destroy()`-Methode, die es wieder entfernt. Wiederholtes Erzeugen eines `FPSCounter` (z.B. bei jedem Engine-Neustart im Debug-Modus) stapelt zusätzliche, nie wieder entfernte FPS-Anzeigen im Dokument übereinander. Kleiner, aber es bestätigt, dass fehlendes Lifecycle-Cleanup kein Einzelfall in `Input.ts` ist, sondern ein wiederkehrendes Muster in `src/core/`.

---

## `src/core/UniversalGamepadController.ts`

### 🟠 "Once per frame"-Deduplizierung in `update()` basiert auf exakter `performance.now()`-Gleichheit — greift in der Praxis so gut wie nie, jeder `isPressed()`/`getAxis()`-Aufruf baut die komplette Geräteliste + frische Wrapper-Objekte neu auf

**Fundort:** `src/core/UniversalGamepadController.ts:276-281` (`update()`), aufgerufen aus `Input.isPressed()` (Zeile 218 via `getActiveDevice()`), `Input.getAxis()` (Zeile 265) und `Input.update()` (Zeile 292) — alle drei potenziell mehrfach pro Frame.

```ts
public update(force: boolean = false): void {
  const now = ... performance.now() ...
  if (!force && now === this._lastUpdateFrameTime) {   // <- exakte Fließkomma-Gleichheit
    return;
  }
  this._lastUpdateFrameTime = now;
  ...
  this._devices = [...standardDevices, ...webHidDevices];   // neue Arrays + neue Wrapper-Objekte
  ...
}
```

`getActiveDevice()` (Zeile 372-380) und der `devices`-Getter (367-370) rufen `this.update()` **unconditional, ohne `force`**, bei jedem einzelnen Aufruf auf — und `Input.isPressed()`/`Input.getAxis()` rufen `getActiveDevice()` ihrerseits bei jedem Tasten-/Achsen-Check auf. Ein einzelner `WASDController` (oder jedes andere Input-Polling-Behavior), das pro Frame z.B. `isPressed(W)`, `isPressed(A)`, `isPressed(S)`, `isPressed(D)` abfragt, löst damit 4 Aufrufe von `update()` pro Frame aus — bei mehreren input-pollenden Objekten in der Szene entsprechend mehr.

Der `now === this._lastUpdateFrameTime`-Guard soll das auf einen echten Rebuild pro Frame reduzieren ("Should be called once per frame" laut JSDoc), verlässt sich dafür aber auf exakte Fließkomma-Gleichheit zweier `performance.now()`-Aufrufe — zwei Aufrufe, die durch echte Zwischen-Codeausführung (Funktionsaufrufe, Schleifen in anderen Controllern) getrennt sind, liefern so gut wie nie denselben Wert.

**Verifiziert:** Node-Einzeiler, 20 direkt aufeinanderfolgende `performance.now()`-Paare ohne jede Arbeit dazwischen → alle 20 Paare liefern unterschiedliche Werte (`same: 0, diff: 20`). Realistische Aufrufe (mit echter Codeausführung zwischen den beiden Zeitstempeln, wie hier zwischen mehreren `isPressed()`-Calls) werden also praktisch nie als "selbes Frame" erkannt — der Guard debounced faktisch nichts. Jeder `isPressed()`/`getAxis()`-Aufruf durchläuft damit den vollen Rebuild: `navigator.getGamepads()` neu abfragen, für jedes verbundene Pad ein frisches `StandardGamepadDevice`/`JoyConGamepadDevice`-Objekt allozieren, zwei Zwischen-Arrays (`standardDevices`, `webHidDevices`) plus das finale `this._devices`-Array neu bauen.

**Fix-Richtung:** Statt Timestamp-Gleichheit einen expliziten "dirty seit letztem Frame"-Flag verwenden, das `SmallWorld._loop()` (oder `Input.update()`, das ja tatsächlich einmal pro Frame läuft) explizit setzt/löscht, statt sich auf zufällige Zeitstempel-Kollisionen zu verlassen. `getActiveDevice()`/`devices`-Getter sollten den zuletzt gebauten `_devices`-Stand lesen, nicht implizit einen Rebuild anstoßen.

### 🟡 Nie gestoppter `setInterval()` für WebHID-Verbindungs-Polling — kein Handle gespeichert, kann nie wieder geklärt werden

**Fundort:** `src/core/UniversalGamepadController.ts:269-270` (`_initializeWebHIDDevices()`).

```ts
await checkConnections();
setInterval(checkConnections, 1500);   // Rückgabewert (Interval-ID) wird nirgends gespeichert
```

Derselbe fehlende Cleanup-Pfad wie bei `Input.ts` (siehe oben) — hier zusätzlich verschärft, weil nicht mal ein Handle existiert, das ein künftiges `destroy()` überhaupt clearen könnte, ohne den Aufrufcode umzubauen. Jede `UniversalGamepadController`-Instanz (eine pro `Input`, eine pro `SmallWorld`) hinterlässt bei WebHID-fähigen Browsern ein für immer laufendes 1.5s-Poll-Intervall.

**Fix-Richtung:** Rückgabewert in einem Instanzfeld (`_pollIntervalId`) speichern und in einer künftigen `destroy()`-Methode (siehe `Input.ts`-Fund) mit `clearInterval()` stoppen.

---

## `src/math/MathUtils.ts`

### 🟡 `fastSin()`/`fastCos()`: totes Feature, das bei erster Nutzung eine stille 0-Falle wäre — `init()` wird nirgends aufgerufen, und keiner der beiden Getter prüft `_isInit` selbst

**Fundort:** `src/math/MathUtils.ts:18-37` (`_SIN_TABLE`/`_COS_TABLE`/`init()`) und `:62-77` (`fastSin()`/`fastCos()`).

```ts
private static _SIN_TABLE: Float32Array = new Float32Array(3600);   // zero-initialisiert
...
public static init(): void {
  if (true === this._isInit) return;
  for (let i = 0; 3600 > i; i++) { ... this._SIN_TABLE[i] = Math.sin(rad); ... }
  this._isInit = true;
}

public static fastSin(rad: number): number {
  let deg = (rad * 572.957) | 0;
  deg = ((deg % 3600) + 3600) % 3600;
  return this._SIN_TABLE[deg]!;   // <- kein `if (!this._isInit) this.init();`-Guard
}
```

**Verifiziert:** `grep -rn "MathUtils.init()" src` → 0 Treffer im gesamten Projekt; `grep -rln "fastSin\|fastCos" src` → nur die Definition selbst in `MathUtils.ts`, kein einziger Aufrufer irgendwo. Wegwerf-Vitest-Test (`tests/_scratch_repro/fastsin.test.ts`, danach gelöscht), frisches Modul ohne vorherigen `init()`-Aufruf: `MathUtils.fastSin(Math.PI / 2)` liefert `0` statt `~1`, `MathUtils.fastCos(0)` liefert `0` statt `1` — bestätigt, dass beide Lookup-Funktionen ohne vorherigen `init()`-Aufruf lautlos falsche Nullen zurückgeben, statt zu werfen oder selbst zu initialisieren.

Zwei Dinge kommen zusammen: (1) Aktuell ist die komplette Fläche (Tabellen + `init()` + beide Fast-Trig-Funktionen) totes, nie aufgerufenes Feature-Gerüst. (2) Sollte es künftig doch benutzt werden (der naheliegende Name `fastSin`/`fastCos` lädt geradezu dazu ein, es für genau den Zero-Alloc-Hot-Path-Zweck einzusetzen, für den es offensichtlich gedacht war), fehlt anders als bei `DeviceCaps.hasFeature()`/`getLimit()` (die beide brav `if (!this._isInitialized) this.init();` selbst nachholen) jede Absicherung — der erste Aufruf ohne vorherigen expliziten `MathUtils.init()`-Aufruf liefert lautlos falsche Werte statt zu crashen oder sich selbst zu reparieren.

**Fix-Richtung:** Entweder das komplette ungenutzte Lookup-Table-Gerüst entfernen (aktuell reines totes Gewicht), oder `fastSin()`/`fastCos()` nach demselben Muster wie `DeviceCaps` mit einem eigenen Lazy-Init-Guard versehen (`if (!this._isInit) this.init();` am Anfang beider Methoden), damit die Funktion bei Erstbenutzung nie eine stille Fehlerquelle sein kann.

---

## `src/core/PlanarReflectionNode.ts`

### ✅ [ERLEDIGT] Gespiegelter `up`-Vektor wird ERST NACH `updateViewMatrix()` gesetzt — die Spiegel-Kamera baut ihre View-Matrix mit dem alten (Vorframe-)`up`, die Korrektur verpufft komplett
*(Behoben 2026-09-03: `mirrorCamera.up` wird vor `mirrorCamera.updateViewMatrix()` gesetzt; Unit-Test in `tests/core/PlanarReflectionNode.test.ts` verifiziert, dass die View-Matrix die gespiegelte Ausrichtung sofort enthält.)*

**Fundort:** `src/core/PlanarReflectionNode.ts:42-70` (`updateReflection()`), Reihenfolge der Schritte 2-4.

```ts
// 2. Mirror the camera target
...
this.mirrorCamera.target.set(...);

// Update view and projection internally
this.mirrorCamera.updateViewMatrix();     // <- baut die View-Matrix JETZT, mit dem AKTUELLEN this.mirrorCamera.up

// 4. Mirror the camera UP vector
const up = mainCamera.up;
const upDist = planeNormal.dot(up);
this.mirrorCamera.up.set(                 // <- wird erst HIER (danach!) aktualisiert
  up.x - 2.0 * planeNormal.x * upDist,
  ...
);
```

`Camera.updateViewMatrix()` (`src/core/Camera.ts:120-142`) liest `this.up` direkt in `Matrix4.lookAt(finalPos, finalTarget, this.up, this._viewMatrix)`, um die View-Matrix zu bauen. Im obigen Ablauf wird `this.mirrorCamera.up` aber erst NACH diesem Aufruf neu gesetzt — die frisch berechnete, gespiegelte Up-Richtung hat also keinerlei Einfluss auf die View-Matrix, die anschließend tatsächlich zum Rendern verwendet wird (`renderer.render(scene, this.mirrorCamera.viewProjectionMatrix, ..., this.mirrorCamera.viewMatrix)`, Zeilen 81-86). Stattdessen fließt der `up`-Wert vom vorherigen Frame (oder initial der Kamera-Default `(0, 1, 0)`) in die View-Matrix ein — die komplette "Schritt 4"-Berechnung ist damit für dieses Frame wirkungslose, verzögert wirksame (erst nächstes Frame, wenn wieder zuerst `updateViewMatrix()` mit dem inzwischen alten Wert läuft — der Fehler wandert also nur eine Frame-Iteration weiter, statt behoben zu werden) totgeburt.

Zum Vergleich: `DynamicReflectionProbe.updateReflection()` (`src/core/DynamicReflectionProbe.ts:89-91`) macht exakt dieselbe Art Kamera-Ausrichtung in der RICHTIGEN Reihenfolge — `this.probeCamera.up.copyFrom(dirInfo.up);` VOR `this.probeCamera.updateViewMatrix();` — was zeigt, dass es sich um eine lokal isolierte Reihenfolge-Verwechslung in genau dieser Datei handelt, nicht um ein systemisches Muster.

**Konkrete Auswirkung:** Bei einer perfekt horizontalen Spiegelebene UND einer Hauptkamera ohne Roll bleibt der Effekt meist unbemerkt (die Up-Richtung ändert sich frame-über-frame kaum). Sobald die Spiegelebene geneigt ist (ein schräg im Raum stehender Spiegel/Wasserfläche) oder die Hauptkamera rollt, hinkt die Spiegel-Kamera-Ausrichtung immer genau ein Frame hinterher bzw. bleibt bei sich änderndem Blickwinkel dauerhaft leicht falsch orientiert — sichtbar als leicht "schwimmende"/verdrehte Reflexion.

**Fix-Richtung:** Schritt-Reihenfolge tauschen: `up`-Vektor spiegeln und setzen, BEVOR `updateViewMatrix()` aufgerufen wird (analog zu `DynamicReflectionProbe`).

---

## `src/core/controllers/OrbitController.ts`

### 🟡 `audio`-Option per `as AudioSystem` weggecastet statt wie `input` mit Fail-Fast-Guard erzwungen — Kommentar verspricht "Required", Code hält das Versprechen nicht

**Fundort:** `src/core/controllers/OrbitController.ts:37-48` (Constructor).

```ts
export interface OrbitControllerOptions {
  input?: InputInterface;
  /** Audio system reference. Required — no global fallback. */
  audio?: AudioSystem;      // <- als optional deklariert
  ...
}

constructor(options: OrbitControllerOptions) {
  super();
  if (!options.input) throw new Error("OrbitController requires an 'input' option.");   // input: Fail-Fast
  this._options = {
    input: options.input,
    audio: options.audio as AudioSystem,   // <- audio: unsafe Cast statt Fail-Fast
    ...
  };
}
```

Der Doc-Kommentar auf `audio?:` sagt explizit "Required — no global fallback", genau wie bei `input` — aber nur `input` bekommt tatsächlich den Fail-Fast-Guard (`if (!options.input) throw ...`), der die im restlichen Projekt geforderte "Never use global singletons, fail fast on invalid state"-Regel korrekt umsetzt. `audio` wird stattdessen per `as AudioSystem` in den `Required<OrbitControllerOptions>`-typisierten `_options`-Store gezwungen, obwohl `options.audio` zur Laufzeit durchaus `undefined` sein kann (das Feld ist optional deklariert) — der Compiler wird hier bewusst belogen: `_options.audio` hat den Typ `AudioSystem` (nie `undefined`), kann es aber sehr wohl sein.

**Verifiziert:** `grep -n "_options.audio\|options.audio" src/core/controllers/OrbitController.ts` → `_options.audio` wird aktuell nirgends in dieser Klasse gelesen, daher heute kein reproduzierbarer Crash — aber genau die Art stiller Typ-Lüge, die die im `coding-guide`/`AGENTS.md` geforderte strikte Typisierung ("Explicit types... NO `any`... Use explicit casting or generics", Fail-Fast bei ungültigem Zustand) verhindern soll: Sobald ein künftiger Patch `this._options.audio.someMethod()` aufruft (naheliegend, da das Feld für genau diesen Zweck existiert), crasht das bei jedem Aufrufer, der `audio` nicht mitgibt, mit "Cannot read properties of undefined" statt einer klaren Fehlermeldung beim Erzeugen des Controllers.

**Fix-Richtung:** Entweder denselben Fail-Fast-Guard wie bei `input` ergänzen (`if (!options.audio) throw new Error(...)`), oder falls `audio` tatsächlich optional sein soll, den Typ ehrlich als `AudioSystem | undefined` führen (keinen Cast) und jeden Lesezugriff entsprechend behandeln.

---

## ✅ Was gut gemacht ist

- **`Quaternion.slerp()` (`src/math/Quaternion.ts:189-238`)** ist ein vorbildlicher, numerisch robuster Slerp: nimmt korrekt den kürzeren Bogen (Vorzeichen-Flip bei `cosHalfTheta < 0`), fängt den `1 <= cosHalfTheta`-Grenzfall ab und fällt bei fast-identischen Quaternions (`sqrSinHalfTheta <= Number.EPSILON`, wo die Slerp-Formel durch Division durch einen Fast-Null-Wert instabil würde) sauber auf lineare Interpolation + Renormalisierung zurück, statt NaN zu riskieren. Zusammen mit `Vector3D.normalize()`s (`src/math/Vector3D.ts:252-267`) sauberer Nahe-Null-Behandlung (setzt auf `(0,0,0)` statt durch eine Fast-Null-Länge zu dividieren) zeigt die Mathe-Bibliothek durchgehend, dass Degenerate Cases mitgedacht wurden — nicht nur an der offensichtlichen Stelle, sondern konsistent über mehrere Klassen hinweg.
- **`Matrix4.invert()` (`src/math/Matrix4.ts:485-540`)** erkennt singuläre Matrizen korrekt (`det === 0`) und signalisiert das sauber per Rückgabewert, statt NaN/Infinity durchzureichen — das eigentliche Problem in diesem Review (siehe `Object3D.lookAt()`/`Skeleton.update()` oben) ist, dass zwei von drei Aufrufern diesen Rückgabewert ignorieren, nicht dass die Primitive selbst unsauber wäre. `Camera.screenToWorld()` zeigt, dass das Projekt den Rückgabewert an anderer Stelle bereits korrekt behandelt.
- **`OctreeNode.acquire()`/`release()` (`src/core/Octree.ts:28-65`)** ist ein sauberes Objekt-Pooling-Muster für den kompletten Octree-Rebuild-Zyklus (`Scene.updateDynamicOctree()` läuft das jedes Frame): Knoten werden wiederverwendet statt neu alloziert, und `_subdivide()` selbst zieht seine Center-/Kind-Bounds-Scratch-Vektoren korrekt aus `MathPool` statt eigene Objekte zu allozieren — echte Zero-Allocation-Praxis für einen Hot-Path, der potenziell jedes Frame komplett neu aufgebaut wird.
- **`src/math/ClusterGrid.ts`** ist als reine, backend-neutrale Funktionsbibliothek geschnitten (kein Renderer-State, keine Klassen) explizit so designt, dass dieselbe Clustered-Lighting-Coverage-Berechnung, die `cluster_cull.wgsl` auf der WebGPU-Seite implementiert, auf der WebGL2-CPU-Culling-Seite wiederverwendet UND direkt unit-testbar ist — ein gutes Beispiel für vermiedene Logik-Dopplung zwischen den beiden Renderer-Backends, mit durchgehend präziser Dokumentation jedes Parameters.
- **`Bone.getAccumulatedWorldScale()` (`src/core/animation/Bone.ts:37-64`)** dokumentiert einen sehr subtilen, bereits durchlittenen FBX/Mixamo-Skalierungs-Bug (geerbte cm→m-Konvertierungsskala) direkt im Code, inklusive der expliziten Begründung, warum der naheliegende "Skalierung aus dem Rig herausbacken"-Fix versucht und wieder verworfen wurde (bricht Skinning bei Sibling-Topologien). Genau die Art Code-Kommentar, die das Projekt selbst einfordert: kurzer Pointer auf das "Warum" statt stiller Re-Implementierung eines bereits gelösten Problems.
- **`DeviceCaps` (`src/core/DeviceCaps.ts`)** zeigt, wie eine Migration weg von einem globalen Singleton sauber aussieht: die Klasse ist jetzt explizit Per-Instanz (`RendererContext.deviceCaps`), und die alte statische API bleibt nur noch als dünner, durchgehend `@deprecated`-markierter Shim mit explizitem "Removal target: v1.0.0" bestehen — im Gegensatz zu `FrustumCuller` (oben gefunden), das dieselbe Migration noch vor sich hat.
- **`AnimationMixer`s Blending-Algorithmus (`src/core/animation/AnimationMixer.ts:145-192`)** ist trotz der oben gefundenen Allocation-Probleme mathematisch sauber: gewichteter Mittelwert für Vektor-Tracks, inkrementelles gewichtetes Slerp für N-Quaternion-Blending (der korrekte Standardansatz, da Quaternions keinen geschlossenen gewichteten Mittelwert haben) — beides mit klarer Kommentierung des jeweiligen Warum.
- **`StageZone.ts`** ist eine durchdachte, korrekte 2.5D-Geometrie-Implementierung (Ray-Casting-Punkt-in-Polygon, Closest-Point-on-Segment, baryzentrische Interpolation für die Perspektiv-Skalierung) mit sinnvollen Toleranz-Werten für nahtlose Zonenübergänge — spürbar am tatsächlichen Genre-Vorbild (klassische 2.5D-Adventures) orientiert statt an einer generischen Vollständigkeits-Implementierung.

## Fazit

Der reviewte Scope (`src/core/*.ts`, die Unterordner `events/fsm/stage/threading/helpers/animation/controllers/text/textures/colors`, `src/math`, `src/interfaces`, `src/enums`) ist insgesamt solide und in weiten Teilen sehr durchdacht — die Mathe-Bibliothek (`Quaternion`, `Vector3D`, `Matrix3`/`Matrix4`, `Frustum`, `ClusterGrid`) behandelt Degenerate Cases konsequent, und mehrere Subsysteme (Octree-Pooling, `AnimationMixer`-Blending, `DeviceCaps`-Instanzierung, `Bone`-Skalierungsdokumentation) zeigen erkennbar gereiftes Engineering mit gelernten Lektionen aus früheren Bugs. Die gefundenen Probleme sind größtenteils lokal und gut eingegrenzt reparierbar, keine strukturellen Sackgassen.

Die drei Themen mit der höchsten Priorität für einen Fix:

1. **Fehlende Lifecycle-Cleanup-Pfade ist das am häufigsten wiederkehrende Muster** (`Input.ts` ohne jedes `destroy()`, `UniversalGamepadController`s nie gecleartes `setInterval()`, `SmallWorld`s tote `gadget:audio:*`-Listener, `FPSCounter`s permanenter DOM-Node) — in einer Engine, deren explizite Architektur-Anforderung "mehrere Engine-Instanzen pro Seite" ist, ist das kein kosmetisches Problem, sondern ein direkter Widerspruch zu dieser Anforderung. Empfehlung: ein Schnitt, der `SmallWorld.destroy()` tatsächlich lückenlos macht (`Input`, `UniversalGamepadController`, `FPSCounter` je eine `destroy()`-Methode geben und aufrufen), bevor weitere Features draufgesetzt werden.
2. **Der `Object3D.lookAt()`/`quaternion`-Interaktionsbug** (🔴, ganz oben) ist der am leichtesten in echtem Content auffindbare Korrektheitsfehler — jedes `LookAtBehavior` auf einem glTF-geladenen oder animierten Objekt ist sichtbar betroffen. In Kombination mit dem verwandten `Skeleton.update()`/`invert()`-Fund und der `PlanarReflectionNode`-Reihenfolge-Verwechslung zeichnet sich ein kleines, aber wiederkehrendes Muster ab: `Matrix4.invert()`s Fehlerfall und Aufruf-Reihenfolgen bei Kamera-/Transform-Updates werden nicht durchgehend so ernst genommen, wie es die Bibliothek selbst (die den Fehlerfall korrekt meldet) erlauben würde. Ein gezielter Sweep aller `invert()`-Aufrufe plus ein Blick auf Reihenfolge-Abhängigkeiten bei Kamera-Update-Sequenzen wäre gut investierte Zeit.
3. **Zero-Allocation-Hot-Path-Verstöße im Event- und Animationssystem** (`EventDispatcherImpl.dispatchEvent()`s `slice()`, `AnimationMixer`/`KeyframeTrack`s Pro-Track-Allokationen, `InteractionManager`s Pro-Frame-Array) sind genau die drei Bereiche, die `CONTEXT.md` selbst als kanonische Zero-Alloc-Beispiele nennt — hier besteht eine direkte Lücke zwischen dokumentiertem Architektur-Anspruch und tatsächlicher Umsetzung, die bei größeren Szenen (viele Kollisionen, viele animierte Charaktere) messbar würde.

Kein 🔴-Fund in diesem Scope ist ein Show-Stopper für den aktuellen Entwicklungsstand, aber `Object3D.lookAt()` und der fehlende `Input`-Cleanup sollten zeitnah behoben werden, bevor mehr Content/Features darauf aufbauen.
